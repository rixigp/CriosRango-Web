<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Product searches must win over WooCommerce's Shop-page template override.
 * The /prueba route is configured as the Shop page, so WC can otherwise
 * replace WordPress search.php with archive-product.php even when s is set.
 */
function cr2026_product_search_template_include( $template ) {
    if ( ! is_search() ) {
        return $template;
    }

    $requested_post_type = get_query_var( 'post_type' );
    $is_product_search = 'product' === $requested_post_type
        || ( is_array( $requested_post_type ) && in_array( 'product', $requested_post_type, true ) );

    if ( ! $is_product_search ) {
        return $template;
    }

    $search_template = locate_template( 'search.php' );
    return $search_template ? $search_template : $template;
}
add_filter( 'template_include', 'cr2026_product_search_template_include', 99 );

// Canonical catalogue page size audited against app CatalogPaginator.PAGE_SIZE.
if ( ! defined( 'CR2026_CATALOG_PAGE_SIZE' ) ) {
    define( 'CR2026_CATALOG_PAGE_SIZE', 12 );
}

/**
 * Canonical sort mapping shared by catalogue REST pages and native product
 * archive main queries. Price ordering is completed by the shared
 * cr2026_catalog_price_sort_post_clauses() posts_clauses filter below.
 */
function cr2026_catalog_sort_query_vars( $sort ) {
    $sort = sanitize_key( (string) $sort );
    $orderby = 'date';
    $order = 'DESC';

    if ( 'oldest' === $sort ) {
        $order = 'ASC';
    } elseif ( in_array( $sort, array( 'price', 'price_asc' ), true ) ) {
        $orderby = 'cr2026_price_asc';
        $order = 'ASC';
    } elseif ( in_array( $sort, array( 'price-desc', 'price_desc' ), true ) ) {
        $orderby = 'cr2026_price_desc';
        $order = 'DESC';
    } elseif ( 'title_asc' === $sort || 'title' === $sort ) {
        $orderby = 'title';
        $order = 'ASC';
    } elseif ( 'title_desc' === $sort ) {
        $orderby = 'title';
        $order = 'DESC';
    }

    return array( 'orderby' => $orderby, 'order' => $order );
}

/**
 * Product archives use a count-free first page. Filtered archives and the
 * unfiltered Shop hub are shell-only requests resolved asynchronously in JS.
 */
function cr2026_product_listing_main_query( $query ) {
    if ( is_admin() || ! $query->is_main_query() || $query->is_search() ) { return; }
    $is_shop_query = function_exists( 'is_shop' ) && is_shop();
    $is_category_query = $query->is_tax( 'product_cat' );
    $is_brand_query = $query->is_tax( 'product_brand' );
    if ( ! $is_shop_query && ! $is_category_query && ! $is_brand_query ) { return; }

    if ( $is_brand_query ) {
        // Brand archives render the existing product_brand main query directly.
        // Read the same public orderby token used by the category selector,
        // then apply the canonical catalogue mapping and shared SQL clauses.
        $requested_sort = isset( $_GET['orderby'] )
            ? sanitize_key( wp_unslash( $_GET['orderby'] ) )
            : 'date';
        if ( ! in_array( $requested_sort, array( 'date', 'price', 'price-desc', 'title' ), true ) ) {
            $requested_sort = 'date';
        }
        $sort_args = cr2026_catalog_sort_query_vars( $requested_sort );
        $query->set( 'orderby', $sort_args['orderby'] );
        $query->set( 'order', $sort_args['order'] );
        return;
    }

    // The Shop/category listing is hydrated page-by-page by catalog-page.
    // Do not let the archive's WP_Query produce a differently sorted first page.
    $query->set( 'posts_per_page', 1 );
    $query->set( 'no_found_rows', true );
}
add_action( 'pre_get_posts', 'cr2026_product_listing_main_query', 99 );

/** Skip SQL for the Shop hub and for filtered category/root result shells. */
function cr2026_product_listing_short_circuit_query( $posts, $query ) {
    if ( null !== $posts || is_admin() || ! $query->is_main_query() || $query->is_search() ) { return $posts; }
    $is_shop_query = function_exists( 'is_shop' ) && is_shop();
    $is_category_query = $query->is_tax( 'product_cat' );
    if ( ! $is_shop_query && ! $is_category_query ) { return $posts; }
    $query->set( 'no_found_rows', true );
    $query->found_posts = 0;
    $query->max_num_pages = 0;
    return array();
}
add_filter( 'posts_pre_query', 'cr2026_product_listing_short_circuit_query', 20, 2 );

/** Public read-only endpoint used by the app-like Load more control. */
function cr2026_register_product_list_route() {
    register_rest_route( 'criosrango/v1', '/product-list', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'cr2026_product_list_rest_response',
        'permission_callback' => '__return_true',
    ) );
}
add_action( 'rest_api_init', 'cr2026_register_product_list_route' );

function cr2026_product_list_rest_response( WP_REST_Request $request ) {
    $page = max( 1, absint( $request->get_param( 'page' ) ) );
    $per_page = CR2026_CATALOG_PAGE_SIZE;
    $orderby = sanitize_key( (string) $request->get_param( 'orderby' ) );
    $order = 'price-desc' === $orderby ? 'DESC' : ( 'price' === $orderby ? 'ASC' : 'DESC' );
    $query_orderby = ( 'price' === $orderby || 'price-desc' === $orderby ) ? 'price' : 'date';
    $raw_ids = (string) $request->get_param( 'product_ids' );
    $products = array();
    $has_more = false;

    if ( '' !== $raw_ids ) {
        $ids = array_values( array_map( 'absint', explode( ',', $raw_ids ) ) );
        if ( in_array( 0, $ids, true ) ) {
            return new WP_Error( 'cr2026_product_list_invalid_ids', __( 'La lista de productos contiene IDs no válidos.', 'crios-rango-2026' ), array( 'status' => 502 ) );
        }
        if ( count( $ids ) !== count( array_unique( $ids ) ) ) {
            return new WP_Error( 'cr2026_product_list_duplicate_ids', __( 'La lista de productos contiene IDs duplicados.', 'crios-rango-2026' ), array( 'status' => 502 ) );
        }
        $ids = array_slice( $ids, 0, $per_page );
        if ( ! $ids ) { return rest_ensure_response( array( 'html' => '', 'has_more' => false, 'count' => 0 ) ); }
        $products = wc_get_products( array(
            'status' => 'publish', 'visibility' => 'visible', 'include' => $ids,
            'limit' => count( $ids ), 'return' => 'objects', 'orderby' => 'include',
        ) );
    } else {
        $category_id = absint( $request->get_param( 'category_id' ) );
        $term = $category_id ? get_term( $category_id, 'product_cat' ) : null;
        if ( ! $term instanceof WP_Term || 'product_cat' !== $term->taxonomy ) {
            return new WP_Error( 'cr2026_product_list_category', __( 'Categoría no válida.', 'crios-rango-2026' ), array( 'status' => 400 ) );
        }
        $products = wc_get_products( array(
            'status' => 'publish', 'visibility' => 'visible',
            'category' => array( $term->slug ), 'limit' => $per_page + 1,
            'offset' => ( $page - 1 ) * $per_page, 'return' => 'objects',
            'orderby' => $query_orderby, 'order' => $order,
        ) );
        $has_more = count( $products ) > $per_page;
        $products = array_slice( $products, 0, $per_page );
    }

    $render_started_at = cr2026_catalog_timer_now();
    ob_start();
    foreach ( $products as $index => $product ) {
        cr2026_render_product_card( $product, $index + ( $page > 1 ? 4 : 0 ) );
    }
    $rendered_html = ob_get_clean();
    cr2026_catalog_timing_add( 'render', $render_started_at );
    return rest_ensure_response( array(
        'html' => $rendered_html, 'html' => ob_get_clean(), 'has_more' => $has_more, 'count' => count( $products ) ) );
}

/**
 * One browser request for catalog result pages. Filter API is dispatched inside
 * WordPress (REST internal dispatch, never an HTTP loopback); card HTML is
 * rendered through the canonical theme product-card renderer.
 */
function cr2026_register_catalog_page_route() {
    register_rest_route( 'cr2026/v1', '/catalog-page', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'cr2026_catalog_page_rest_response',
        'permission_callback' => '__return_true',
    ) );
}
add_action( 'rest_api_init', 'cr2026_register_catalog_page_route' );
/** Price ordering for catalog-page wc_get_products queries, scoped by orderby sentinel. */
function cr2026_catalog_price_sort_post_clauses( $clauses, $query ) {
    $sort = $query->get( 'orderby' );
    if ( ! in_array( $sort, array( 'cr2026_price_asc', 'cr2026_price_desc' ), true ) ) { return $clauses; }
    global $wpdb;
    $lookup_alias = 'cr2026_catalog_price_lookup';
    $lookup_table = $wpdb->wc_product_meta_lookup;
    if ( false === strpos( $clauses['join'], $lookup_alias ) ) {
        $clauses['join'] .= " LEFT JOIN {$lookup_table} AS {$lookup_alias} ON {$wpdb->posts}.ID = {$lookup_alias}.product_id ";
    }
    if ( 'cr2026_price_asc' === $sort ) {
        $clauses['orderby'] = " CASE WHEN {$lookup_alias}.product_id IS NULL OR {$lookup_alias}.min_price <= 0 THEN 1 ELSE 0 END ASC, {$lookup_alias}.min_price ASC, {$wpdb->posts}.post_date DESC, {$wpdb->posts}.ID DESC ";
    } else {
        $clauses['orderby'] = " CASE WHEN {$lookup_alias}.product_id IS NULL OR {$lookup_alias}.max_price <= 0 THEN 1 ELSE 0 END ASC, {$lookup_alias}.min_price DESC, {$wpdb->posts}.post_date DESC, {$wpdb->posts}.ID DESC ";
    }
    return $clauses;
}
add_filter( 'posts_clauses', 'cr2026_catalog_price_sort_post_clauses', 20, 2 );



/**
 * Monotonic timing for the public catalogue REST endpoint. Durations are
 * attached as HTTP diagnostics only; the public JSON payload is unchanged.
 */
function cr2026_catalog_timer_now() {
    return function_exists( 'hrtime' ) ? hrtime( true ) : (int) round( microtime( true ) * 1000000000 );
}

function cr2026_catalog_timing_add( $stage, $started_at ) {
    if ( isset( $GLOBALS['cr2026_catalog_timing'] ) && isset( $GLOBALS['cr2026_catalog_timing'][ $stage ] ) ) {
        $GLOBALS['cr2026_catalog_timing'][ $stage ] += max( 0, cr2026_catalog_timer_now() - $started_at );
    }
}

/** Add Server-Timing headers immediately before the REST response is served. */
function cr2026_catalog_timing_headers( $served, $result, $request, $server ) {
    if ( ! $request instanceof WP_REST_Request || '/cr2026/v1/catalog-page' !== $request->get_route() ) {
        return $served;
    }

    $timing = isset( $GLOBALS['cr2026_catalog_timing'] ) && is_array( $GLOBALS['cr2026_catalog_timing'] )
        ? $GLOBALS['cr2026_catalog_timing']
        : array();
    $now = cr2026_catalog_timer_now();
    $total_ns = isset( $timing['started_at'] ) ? max( 0, $now - $timing['started_at'] ) : 0;
    $filter_ns = isset( $timing['filter'] ) ? (int) $timing['filter'] : 0;
    $products_ns = isset( $timing['products'] ) ? (int) $timing['products'] : 0;
    $render_ns = isset( $timing['render'] ) ? (int) $timing['render'] : 0;
    $cache_ns = isset( $timing['cache'] ) ? (int) $timing['cache'] : 0;
    $other_ns = max( 0, $total_ns - $filter_ns - $products_ns - $render_ns - $cache_ns );
    $to_ms = static function ( $nanoseconds ) {
        return number_format( $nanoseconds / 1000000, 3, '.', '' );
    };
    $server_timing = implode( ', ', array(
        'catalog-total;dur=' . $to_ms( $total_ns ),
        'filter;dur=' . $to_ms( $filter_ns ),
        'products;dur=' . $to_ms( $products_ns ),
        'render;dur=' . $to_ms( $render_ns ),
        'cache;dur=' . $to_ms( $cache_ns ),
        'other;dur=' . $to_ms( $other_ns ),
    ) );

    if ( $result instanceof WP_REST_Response ) {
        $result->header( 'Server-Timing', $server_timing );
        $result->header( 'X-CriosRango-Catalog-Cache', 'BYPASS' );
        $result->header( 'X-CriosRango-Persistent-Object-Cache', function_exists( 'wp_using_ext_object_cache' ) && wp_using_ext_object_cache() ? 'YES' : 'NO' );
    }

    return $served;
}
add_filter( 'rest_pre_serve_request', 'cr2026_catalog_timing_headers', 10, 4 );

function cr2026_catalog_page_rest_response( WP_REST_Request $request ) {
    $GLOBALS['cr2026_catalog_timing'] = array(
        'started_at' => cr2026_catalog_timer_now(),
        'filter' => 0,
        'products' => 0,
        'render' => 0,
        'cache' => 0,
    );
    $page = max( 1, absint( $request->get_param( 'page' ) ) );
    $per_page = CR2026_CATALOG_PAGE_SIZE;
    $category_id = absint( $request->get_param( 'catalog_category_id' ) );
    $brand_id = absint( $request->get_param( 'catalog_brand_id' ) );
    $scope = sanitize_key( (string) $request->get_param( 'scope' ) );
    if ( '' === $scope ) { $scope = 'catalog'; }
    $is_outlet_scope = 'outlet' === $scope;
    if ( ! in_array( $scope, array( 'catalog', 'outlet' ), true ) ) {
        return new WP_Error( 'cr2026_catalog_scope', __( 'Ámbito de catálogo no válido.', 'crios-rango-2026' ), array( 'status' => 400 ) );
    }
    $outlet_category_id = absint( $request->get_param( 'outlet_category_id' ) );
    $brand_term = $brand_id ? get_term( $brand_id, 'product_brand' ) : null;
    $is_brand_context = $brand_id > 0;
    if ( $is_brand_context && ( ! $brand_term instanceof WP_Term || 'product_brand' !== $brand_term->taxonomy || $category_id > 0 || $is_outlet_scope ) ) {
        return new WP_Error( 'cr2026_catalog_brand', __( 'Contexto de marca no válido.', 'crios-rango-2026' ), array( 'status' => 400 ) );
    }
    $raw_origin_ids = trim( (string) $request->get_param( 'origin_category_ids' ) );
    $origin_category_ids = array();
    if ( '' !== $raw_origin_ids ) {
        foreach ( explode( ',', $raw_origin_ids ) as $raw_id ) {
            $origin_id = absint( $raw_id );
            if ( $origin_id < 1 || (string) $origin_id !== trim( $raw_id ) ) {
                return new WP_Error( 'cr2026_catalog_origin_ids', __( 'Categorías de origen no válidas.', 'crios-rango-2026' ), array( 'status' => 400 ) );
            }
            $origin_category_ids[] = $origin_id;
        }
        $origin_category_ids = array_values( array_unique( $origin_category_ids ) );
        sort( $origin_category_ids, SORT_NUMERIC );
    }
    if ( $is_outlet_scope && ! in_array( $outlet_category_id, cr2026_outlet_branch_ids(), true ) ) {
        return new WP_Error( 'cr2026_catalog_outlet_category', __( 'Rama Outlet no válida.', 'crios-rango-2026' ), array( 'status' => 400 ) );
    }
    if ( ! $is_outlet_scope && ( $outlet_category_id > 0 || ! empty( $origin_category_ids ) ) ) {
        return new WP_Error( 'cr2026_catalog_outlet_context', __( 'Contexto Outlet no válido para catálogo general.', 'crios-rango-2026' ), array( 'status' => 400 ) );
    }
    $sort = sanitize_key( (string) $request->get_param( 'sort' ) );
    if ( ! in_array( $sort, array( 'newest', 'oldest', 'price_asc', 'price_desc', 'title_asc', 'title_desc', 'default' ), true ) ) {
        $sort = 'newest';
    }
    $filter_keys = array( 'size_ids', 'color_ids', 'brand_ids' );
    // The root catalogue (Novedades) is a valid global context without a
    // product_cat term. Route it through the same Filter API as filtered
    // catalogues, but never send catalog_category_id for this context.
    $is_root_catalog_context = 'catalog' === $scope && 0 === $category_id && ! $is_brand_context;
    $has_filters = $is_outlet_scope || $is_brand_context || $is_root_catalog_context;
    foreach ( $filter_keys as $filter_key ) {
        if ( '' !== trim( (string) $request->get_param( $filter_key ) ) ) {
            $has_filters = true;
            break;
        }
    }

    $products = array();
    $product_ids = array();
    $filter_api_product_ids = array();
    $has_more = false;
    $total = null;

    if ( $has_filters ) {
        $filter_request = new WP_REST_Request( 'GET', '/criosrango-filter/v1/query' );
        $filter_params = array(
            'scope' => $is_outlet_scope ? 'outlet' : 'catalog',
            'facet' => 'none',
            'page' => $page,
            'per_page' => $per_page,
            'sort' => $sort,
        );
        if ( $is_outlet_scope ) {
            $filter_params['outlet_category_id'] = $outlet_category_id;
            if ( ! empty( $origin_category_ids ) ) {
                $filter_params['origin_category_ids'] = implode( ',', $origin_category_ids );
            }
        } elseif ( $is_brand_context ) {
            $filter_params['catalog_brand_id'] = $brand_id;
        } elseif ( $category_id > 0 ) {
            $filter_params['catalog_category_id'] = $category_id;
        }
        foreach ( $filter_keys as $filter_key ) {
            $value = trim( (string) $request->get_param( $filter_key ) );
            if ( '' !== $value ) {
                $filter_params[ $filter_key ] = $value;
            }
        }
        $filter_request->set_query_params( $filter_params );
        $filter_started_at = cr2026_catalog_timer_now();
        $filter_response = rest_do_request( $filter_request );
        cr2026_catalog_timing_add( 'filter', $filter_started_at );
        if ( is_wp_error( $filter_response ) ) {
            return $filter_response;
        }
        if ( $filter_response->get_status() < 200 || $filter_response->get_status() >= 300 ) {
            return new WP_Error( 'cr2026_filter_api_dispatch', __( 'No se pudieron obtener los productos filtrados.', 'crios-rango-2026' ), array( 'status' => 502 ) );
        }
        $filter_payload = $filter_response->get_data();
        if ( ! is_array( $filter_payload ) ) {
            return new WP_Error( 'cr2026_filter_api_payload', __( 'Respuesta de filtros no válida.', 'crios-rango-2026' ), array( 'status' => 502 ) );
        }
        $raw_product_ids = isset( $filter_payload['product_ids'] ) && is_array( $filter_payload['product_ids'] ) ? $filter_payload['product_ids'] : array();
        $normalized_product_ids = array_values( array_map( 'absint', $raw_product_ids ) );
        if ( in_array( 0, $normalized_product_ids, true ) ) {
            return new WP_Error( 'cr2026_catalog_invalid_ids', __( 'Filter API devolvió IDs de producto no válidos.', 'crios-rango-2026' ), array( 'status' => 502 ) );
        }
        if ( count( $normalized_product_ids ) !== count( array_unique( $normalized_product_ids ) ) ) {
            return new WP_Error( 'cr2026_catalog_duplicate_ids', __( 'Filter API devolvió IDs de producto duplicados.', 'crios-rango-2026' ), array( 'status' => 502 ) );
        }
        $product_ids = array_slice( $normalized_product_ids, 0, $per_page );
        $filter_api_product_ids = $product_ids;
        if ( $product_ids ) {
            $products_started_at = cr2026_catalog_timer_now();
            $products = wc_get_products( array(
                'status' => 'publish',
                'visibility' => 'visible',
                'include' => $product_ids,
                'limit' => count( $product_ids ),
                'return' => 'objects',
                'orderby' => 'include',
            ) );
            cr2026_catalog_timing_add( 'products', $products_started_at );
            // Preserve the exact Filter API ID order; do not sort the page locally.
            $products_by_id = array();
            foreach ( $products as $product ) {
                $products_by_id[ $product->get_id() ] = $product;
            }
            $missing_product_ids = array_values( array_filter( $product_ids, static function ( $id ) use ( $products_by_id ) {
                return ! isset( $products_by_id[ $id ] );
            } ) );
            if ( $missing_product_ids ) {
                return new WP_Error( 'cr2026_catalog_missing_cards', __( 'No se pudieron hidratar todos los productos devueltos por Filter API.', 'crios-rango-2026' ), array(
                    'status' => 502,
                    'missing_product_ids' => $missing_product_ids,
                ) );
            }
            $products = array_map(
                static function ( $id ) use ( $products_by_id ) {
                    return $products_by_id[ $id ];
                },
                $product_ids
            );
        }
        $has_more = ! empty( $filter_payload['has_more'] );
        if ( isset( $filter_payload['total'] ) ) {
            $total = absint( $filter_payload['total'] );
        } elseif ( isset( $filter_payload['total_products'] ) ) {
            $total = absint( $filter_payload['total_products'] );
        } elseif ( isset( $filter_payload['total_count'] ) ) {
            $total = absint( $filter_payload['total_count'] );
        }
    } else {
        $term = $category_id ? get_term( $category_id, 'product_cat' ) : null;
        if ( ! $term instanceof WP_Term || 'product_cat' !== $term->taxonomy ) {
            return new WP_Error( 'cr2026_catalog_category', __( 'Categoría no válida.', 'crios-rango-2026' ), array( 'status' => 400 ) );
        }
        $sort_args = cr2026_catalog_sort_query_vars( $sort );
        $orderby = $sort_args['orderby'];
        $order = $sort_args['order'];
        $products_started_at = cr2026_catalog_timer_now();
        $catalog_result = wc_get_products( array(
            'status' => 'publish',
            'visibility' => 'visible',
            'category' => array( $term->slug ),
            'limit' => $per_page,
            'page' => $page,
            'paginate' => true,
            'return' => 'objects',
            'orderby' => $orderby,
            'order' => $order,
        ) );
        cr2026_catalog_timing_add( 'products', $products_started_at );
        $products = isset( $catalog_result->products ) && is_array( $catalog_result->products ) ? $catalog_result->products : array();
        $total = isset( $catalog_result->total ) ? absint( $catalog_result->total ) : null;
        $max_num_pages = isset( $catalog_result->max_num_pages ) ? absint( $catalog_result->max_num_pages ) : 0;
        $has_more = $page < $max_num_pages;
        $product_ids = array_map( static function ( $product ) { return $product->get_id(); }, $products );
    }

    $render_started_at = cr2026_catalog_timer_now();
    ob_start();
    foreach ( $products as $index => $product ) {
        cr2026_render_product_card( $product, $index + ( $page > 1 ? 4 : 0 ) );
    }
    $rendered_html = ob_get_clean();
    cr2026_catalog_timing_add( 'render', $render_started_at );
    return rest_ensure_response( array(
        'html' => $rendered_html,
        'source' => $has_filters ? 'filter_api' : 'woocommerce',
        'product_ids' => $product_ids,
        'filter_api_product_ids' => $filter_api_product_ids,
        'rendered_product_ids' => array_map( static function ( $product ) { return $product->get_id(); }, $products ),
        'page' => $page,
        'per_page' => $per_page,
        'total' => $total,
        'has_more' => $has_more,
    ) );
}

function cr2026_woocommerce_wrappers() {
    remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
    remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );
    add_action( 'woocommerce_before_main_content', 'cr2026_wrapper_start', 10 );
    add_action( 'woocommerce_after_main_content', 'cr2026_wrapper_end', 10 );
}
add_action( 'wp', 'cr2026_woocommerce_wrappers' );

function cr2026_wrapper_start() {
    echo '<main id="primary" class="cr-main cr-main--woocommerce"><div class="cr-shell">';
}

function cr2026_wrapper_end() {
    echo '</div></main>';
}

function cr2026_loop_columns() {
    return 4;
}
add_filter( 'loop_shop_columns', 'cr2026_loop_columns' );

function cr2026_products_per_page( $cols ) {
    return 24;
}
add_filter( 'loop_shop_per_page', 'cr2026_products_per_page', 20 );

function cr2026_cart_count_fragment( $fragments ) {
    ob_start();
    ?>
    <?php $cart_count = cr2026_cart_count(); ?>
    <span class="cr-cart-count<?php echo 0 === $cart_count ? ' is-empty' : ''; ?>" data-cr-cart-count data-count="<?php echo esc_attr( $cart_count ); ?>"><?php echo esc_html( $cart_count ); ?></span>
    <?php
    $fragments['span[data-cr-cart-count]'] = ob_get_clean();
    return $fragments;
}
add_filter( 'woocommerce_add_to_cart_fragments', 'cr2026_cart_count_fragment' );


/**
 * Keep loyalty accounting active but remove its promotional points sentence
 * from product listing cards. The message is useful on product/cart/checkout,
 * but on a two-column mobile catalogue it creates excessive vertical noise.
 */
function cr2026_callable_name( $callback ) {
    if ( is_string( $callback ) ) {
        return $callback;
    }

    if ( is_array( $callback ) && 2 === count( $callback ) ) {
        $owner = is_object( $callback[0] ) ? get_class( $callback[0] ) : (string) $callback[0];
        return $owner . '::' . (string) $callback[1];
    }

    if ( $callback instanceof Closure ) {
        return 'Closure';
    }

    if ( is_object( $callback ) ) {
        return get_class( $callback );
    }

    return '';
}

function cr2026_remove_loyalty_messages_from_product_loops() {
    if ( is_admin() ) {
        return;
    }

    global $wp_filter;

    $hooks = array(
        'woocommerce_after_shop_loop_item_title',
        'woocommerce_after_shop_loop_item',
    );

    foreach ( $hooks as $hook_name ) {
        if ( empty( $wp_filter[ $hook_name ] ) || ! $wp_filter[ $hook_name ] instanceof WP_Hook ) {
            continue;
        }

        $callbacks = $wp_filter[ $hook_name ]->callbacks;
        foreach ( $callbacks as $priority => $items ) {
            foreach ( $items as $item ) {
                if ( empty( $item['function'] ) ) {
                    continue;
                }

                $name = strtolower( cr2026_callable_name( $item['function'] ) );
                if ( false === strpos( $name, 'wployalty' ) && false === strpos( $name, 'wlr' ) ) {
                    continue;
                }

                remove_action( $hook_name, $item['function'], (int) $priority );
            }
        }
    }
}
add_action( 'wp', 'cr2026_remove_loyalty_messages_from_product_loops', 100 );
