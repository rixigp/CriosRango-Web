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
        'html' => $rendered_html,
        'has_more' => $has_more,
        'count' => count( $products ),
    ) );
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


/** Public catalogue response cache; session-dependent prices bypass sharing. */
function cr2026_catalog_cache_generation() {
    $generation = get_option( 'cr2026_catalog_cache_generation', false );
    if ( false === $generation ) {
        add_option( 'cr2026_catalog_cache_generation', 1, '', false );
        $generation = get_option( 'cr2026_catalog_cache_generation', 1 );
    }
    return max( 1, absint( $generation ) );
}
function cr2026_catalog_cache_invalidate() {
    static $invalidated_this_request = false;
    if ( $invalidated_this_request ) { return; }
    $invalidated_this_request = true;
    update_option( 'cr2026_catalog_cache_generation', cr2026_catalog_cache_generation() + 1, false );
}
function cr2026_catalog_cache_invalidate_product_save( $post_id ) {
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) { return; }
    if ( in_array( get_post_type( $post_id ), array( 'product', 'product_variation' ), true ) ) {
        cr2026_catalog_cache_invalidate();
    }
}
function cr2026_catalog_cache_invalidate_product_delete( $post_id, $post = null ) {
    $post_type = $post instanceof WP_Post ? $post->post_type : get_post_type( $post_id );
    if ( in_array( $post_type, array( 'product', 'product_variation' ), true ) ) { cr2026_catalog_cache_invalidate(); }
}
function cr2026_catalog_cache_invalidate_product_object( $product_id ) {
    if ( $product_id instanceof WC_Product ) { $product_id = $product_id->get_id(); }
    cr2026_catalog_cache_invalidate_product_save( absint( $product_id ) );
}
function cr2026_catalog_cache_invalidate_term( $term_id, $tt_id = 0, $taxonomy = '' ) {
    if ( 'product_cat' === $taxonomy || 'product_brand' === $taxonomy || 0 === strpos( (string) $taxonomy, 'pa_' ) ) {
        cr2026_catalog_cache_invalidate();
    }
}
function cr2026_catalog_cache_invalidate_object_terms( $object_id, $terms, $tt_ids, $taxonomy ) {
    if ( ( 'product_cat' === $taxonomy || 'product_brand' === $taxonomy || 0 === strpos( (string) $taxonomy, 'pa_' ) )
        && in_array( get_post_type( $object_id ), array( 'product', 'product_variation' ), true ) ) {
        cr2026_catalog_cache_invalidate();
    }
}
add_action( 'save_post_product', 'cr2026_catalog_cache_invalidate_product_save', 20, 1 );
add_action( 'save_post_product_variation', 'cr2026_catalog_cache_invalidate_product_save', 20, 1 );
add_action( 'woocommerce_update_product', 'cr2026_catalog_cache_invalidate_product_object', 20, 1 );
add_action( 'woocommerce_update_product_variation', 'cr2026_catalog_cache_invalidate_product_object', 20, 1 );
add_action( 'before_delete_post', 'cr2026_catalog_cache_invalidate_product_delete', 20, 2 );
add_action( 'woocommerce_product_set_stock', 'cr2026_catalog_cache_invalidate_product_object', 20, 1 );
add_action( 'woocommerce_variation_set_stock', 'cr2026_catalog_cache_invalidate_product_object', 20, 1 );
add_action( 'created_term', 'cr2026_catalog_cache_invalidate_term', 20, 3 );
add_action( 'edited_term', 'cr2026_catalog_cache_invalidate_term', 20, 3 );
add_action( 'delete_term', 'cr2026_catalog_cache_invalidate_term', 20, 3 );
add_action( 'set_object_terms', 'cr2026_catalog_cache_invalidate_object_terms', 20, 6 );
add_action( 'woocommerce_product_set_stock_status', 'cr2026_catalog_cache_invalidate_product_object', 20, 1 );
add_action( 'woocommerce_variation_set_stock_status', 'cr2026_catalog_cache_invalidate_product_object', 20, 1 );
function cr2026_catalog_cache_normalize_ids( $value ) {
    $parts = is_array( $value ) ? $value : explode( ',', (string) $value );
    $ids = array();
    foreach ( $parts as $part ) { $part = absint( $part ); if ( $part > 0 ) { $ids[] = $part; } }
    $ids = array_values( array_unique( $ids ) );
    sort( $ids, SORT_NUMERIC );
    return $ids;
}
function cr2026_catalog_cache_session_sensitive() {
    if ( is_user_logged_in() ) { return true; }
    if ( function_exists( 'WC' ) && WC() && isset( WC()->session ) && WC()->session
        && is_callable( array( WC()->session, 'has_session' ) ) && WC()->session->has_session() ) { return true; }
    return false;
}
function cr2026_catalog_cache_key( $generation, $scope, $category_id, $brand_id, $outlet_category_id, $origin_category_ids, $filters, $sort, $page, $per_page ) {
    $state = array(
        'schema' => 1, 'generation' => (int) $generation, 'scope' => (string) $scope,
        'category_id' => (int) $category_id, 'brand_id' => (int) $brand_id,
        'outlet_category_id' => (int) $outlet_category_id,
        'origin_category_ids' => cr2026_catalog_cache_normalize_ids( $origin_category_ids ),
        'size_ids' => cr2026_catalog_cache_normalize_ids( $filters['size_ids'] ),
        'color_ids' => cr2026_catalog_cache_normalize_ids( $filters['color_ids'] ),
        'brand_ids' => cr2026_catalog_cache_normalize_ids( $filters['brand_ids'] ),
        'sort' => (string) $sort, 'page' => (int) $page, 'per_page' => (int) $per_page,
        'locale' => function_exists( 'determine_locale' ) ? determine_locale() : get_locale(),
        'currency' => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : '',
        'tax_display' => get_option( 'woocommerce_tax_display_shop', 'excl' ),
        'prices_include_tax' => get_option( 'woocommerce_prices_include_tax', 'no' ),
        'price_decimals' => wc_get_price_decimals(),
        'price_decimal_separator' => wc_get_price_decimal_separator(),
        'price_thousand_separator' => wc_get_price_thousand_separator(),
    );
    return 'cr2026_catalog_v1_' . (int) $generation . '_' . md5( wp_json_encode( $state ) );
}
function cr2026_catalog_cache_payload_valid( $payload ) {
    if ( ! is_array( $payload ) || ! isset( $payload['html'], $payload['source'], $payload['product_ids'], $payload['filter_api_product_ids'], $payload['rendered_product_ids'], $payload['page'], $payload['per_page'], $payload['has_more'] ) ) { return false; }
    if ( ! is_string( $payload['html'] ) || ! in_array( $payload['source'], array( 'filter_api', 'woocommerce' ), true )
        || ! is_array( $payload['product_ids'] ) || ! is_array( $payload['filter_api_product_ids'] )
        || ! is_array( $payload['rendered_product_ids'] ) || ! is_bool( $payload['has_more'] )
        || ! is_numeric( $payload['page'] ) || ! is_numeric( $payload['per_page'] )
        || ! array_key_exists( 'total', $payload ) || ( null !== $payload['total'] && ! is_numeric( $payload['total'] ) ) ) { return false; }
    return ! $payload['product_ids'] || '' !== trim( $payload['html'] );
}
function cr2026_catalog_cache_lookup( $cache_key ) {
    $started_at = cr2026_catalog_timer_now();
    $fresh = get_transient( $cache_key );
    if ( cr2026_catalog_cache_payload_valid( $fresh ) ) {
        cr2026_catalog_timing_add( 'cache', $started_at );
        $GLOBALS['cr2026_catalog_cache_status'] = 'HIT';
        return array( 'state' => 'hit', 'payload' => $fresh );
    }
    if ( false !== $fresh ) { delete_transient( $cache_key ); }
    $stale_key = $cache_key . '_stale';
    $stale = get_transient( $stale_key );
    if ( ! cr2026_catalog_cache_payload_valid( $stale ) ) {
        $stale = false;
        if ( false !== get_transient( $stale_key ) ) { delete_transient( $stale_key ); }
    }
    $lock_key = $cache_key . '_lock';
    // Read first to purge expired transient rows, including after an abrupt PHP exit.
    $existing_lock = get_transient( $lock_key );
    if ( false !== $existing_lock && time() - absint( $existing_lock ) >= 30 ) {
        delete_transient( $lock_key );
        $existing_lock = false;
    }
    // Atomic option insert with transient-compatible storage and a 30s expiry.
    $lock_acquired = false === $existing_lock && add_option( '_transient_' . $lock_key, time(), '', false );
    if ( $lock_acquired ) {
        add_option( '_transient_timeout_' . $lock_key, time() + 30, '', false );
        register_shutdown_function( static function () use ( $lock_key ) { delete_transient( $lock_key ); } );
        $GLOBALS['cr2026_catalog_cache_lock'] = $lock_key;
        $GLOBALS['cr2026_catalog_cache_status'] = 'MISS';
        cr2026_catalog_timing_add( 'cache', $started_at );
        return array( 'state' => 'miss', 'payload' => false );
    }
    cr2026_catalog_timing_add( 'cache', $started_at );
    if ( false !== $stale ) {
        $GLOBALS['cr2026_catalog_cache_status'] = 'STALE';
        return array( 'state' => 'stale', 'payload' => $stale );
    }
    $GLOBALS['cr2026_catalog_cache_status'] = 'MISS';
    return array( 'state' => 'locked', 'payload' => false );
}
function cr2026_catalog_cache_store( $cache_key, $payload ) {
    if ( ! cr2026_catalog_cache_payload_valid( $payload ) ) { return false; }
    set_transient( $cache_key, $payload, 300 );
    set_transient( $cache_key . '_stale', $payload, 1800 );
    return true;
}

/** Add Server-Timing headers immediately before the REST response is served. */
function cr2026_catalog_timing_headers( $response, $server, $request ) {
    if ( ! $request instanceof WP_REST_Request || '/cr2026/v1/catalog-page' !== $request->get_route() ) {
        return $response;
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

    if ( $response instanceof WP_REST_Response ) {
        $response->header( 'Server-Timing', $server_timing );
        $response->header( 'X-CriosRango-Catalog-Cache', isset( $GLOBALS['cr2026_catalog_cache_status'] ) ? $GLOBALS['cr2026_catalog_cache_status'] : 'BYPASS' );
        $response->header( 'X-CriosRango-Persistent-Object-Cache', function_exists( 'wp_using_ext_object_cache' ) && wp_using_ext_object_cache() ? 'YES' : 'NO' );
    }

    return $response;
}
add_filter( 'rest_post_dispatch', 'cr2026_catalog_timing_headers', 10, 3 );

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
    $has_filters = $is_outlet_scope || $is_brand_context;
    foreach ( $filter_keys as $filter_key ) {
        if ( '' !== trim( (string) $request->get_param( $filter_key ) ) ) {
            $has_filters = true;
            break;
        }
    }

    $products = array();
    $product_ids = array();
    $filter_api_product_ids = array();

    $cache_bypass = cr2026_catalog_cache_session_sensitive();
    if ( $cache_bypass ) {
        $GLOBALS['cr2026_catalog_cache_status'] = 'BYPASS';
    } else {
        $generation = cr2026_catalog_cache_generation();
        $cache_filters = array();
        foreach ( $filter_keys as $filter_key ) { $cache_filters[ $filter_key ] = $request->get_param( $filter_key ); }
        $catalog_cache_key = cr2026_catalog_cache_key(
            $generation, $scope, $category_id, $brand_id, $outlet_category_id,
            $origin_category_ids, $cache_filters, $sort, $page, $per_page
        );
        $cache_result = cr2026_catalog_cache_lookup( $catalog_cache_key );
        if ( 'hit' === $cache_result['state'] || 'stale' === $cache_result['state'] ) {
            return rest_ensure_response( $cache_result['payload'] );
        }
        if ( 'locked' === $cache_result['state'] ) {
            return new WP_Error( 'cr2026_catalog_cache_building', __( 'El catálogo se está actualizando. Inténtalo de nuevo.', 'crios-rango-2026' ), array( 'status' => 503 ) );
        }
    }
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
        if ( $category_id > 0 && ( ! $term instanceof WP_Term || 'product_cat' !== $term->taxonomy ) ) {
            return new WP_Error( 'cr2026_catalog_category', __( 'Categoría no válida.', 'crios-rango-2026' ), array( 'status' => 400 ) );
        }
        $sort_args = cr2026_catalog_sort_query_vars( $sort );
        $orderby = $sort_args['orderby'];
        $order = $sort_args['order'];
        $products_query = array(
            'status' => 'publish', 'visibility' => 'visible', 'limit' => $per_page,
            'page' => $page, 'paginate' => true, 'return' => 'objects',
            'orderby' => $orderby, 'order' => $order,
        );
        // Reuse the category query; root Novedades omits only product_cat.
        // No purchasable/price predicate: intentionally priceless products remain.
        if ( $term instanceof WP_Term ) { $products_query['category'] = array( $term->slug ); }
        $products_started_at = cr2026_catalog_timer_now();
        $catalog_result = wc_get_products( $products_query );
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
    $payload = array(
        'html' => $rendered_html,
        'source' => $has_filters ? 'filter_api' : 'woocommerce',
        'product_ids' => $product_ids,
        'filter_api_product_ids' => $filter_api_product_ids,
        'rendered_product_ids' => array_map( static function ( $product ) { return $product->get_id(); }, $products ),
        'page' => $page, 'per_page' => $per_page, 'total' => $total, 'has_more' => $has_more,
    );
    if ( ! $cache_bypass ) {
        cr2026_catalog_cache_store( $catalog_cache_key, $payload );
        if ( ! empty( $GLOBALS['cr2026_catalog_cache_lock'] ) ) {
            delete_transient( $GLOBALS['cr2026_catalog_cache_lock'] );
            unset( $GLOBALS['cr2026_catalog_cache_lock'] );
        }
    }
    return rest_ensure_response( $payload );
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

/**
 * Adapt only the known native billing fields for the delivery section.
 * Unknown fields and every non-visual WooCommerce field property are preserved.
 */
/**
 * Set the nine native billing-field labels, priorities and layout classes
 * before WooCommerce sorts the billing fields by priority.
 *
 * woocommerce_billing_fields runs after country locale/default-address
 * definitions have been applied and before WC_Countries::get_address_fields()
 * performs its priority sort.
 */
function cr2026_checkout_delivery_fields( $fields, $country = '' ) {
    if ( ! is_array( $fields ) ) {
        return $fields;
    }

    $delivery_fields = array(
        'billing_first_name' => array( 'label' => __( 'Nombre', 'crios-rango-2026' ), 'priority' => 10, 'layout' => 'full' ),
        'billing_last_name'  => array( 'label' => __( 'Apellidos', 'crios-rango-2026' ), 'priority' => 20, 'layout' => 'full' ),
        'billing_email'      => array( 'label' => __( 'Email', 'crios-rango-2026' ), 'priority' => 30, 'layout' => 'full' ),
        'billing_phone'      => array( 'label' => __( 'Teléfono', 'crios-rango-2026' ), 'priority' => 40, 'layout' => 'full' ),
        'billing_address_1'  => array( 'label' => __( 'Dirección', 'crios-rango-2026' ), 'priority' => 50, 'layout' => 'full' ),
        'billing_state'      => array( 'label' => __( 'Provincia', 'crios-rango-2026' ), 'priority' => 60, 'layout' => 'half' ),
        'billing_city'       => array( 'label' => __( 'Localidad', 'crios-rango-2026' ), 'priority' => 70, 'layout' => 'half' ),
        'billing_postcode'   => array( 'label' => __( 'Código postal', 'crios-rango-2026' ), 'priority' => 80, 'layout' => 'half' ),
        'billing_country'    => array( 'label' => __( 'País', 'crios-rango-2026' ), 'priority' => 90, 'layout' => 'half' ),
    );

    foreach ( $delivery_fields as $key => $presentation ) {
        if ( ! isset( $fields[ $key ] ) || ! is_array( $fields[ $key ] ) ) {
            continue;
        }

        $fields[ $key ]['label'] = $presentation['label'];
        $fields[ $key ]['priority'] = $presentation['priority'];

        $classes = isset( $fields[ $key ]['class'] ) ? (array) $fields[ $key ]['class'] : array();
        $classes = array_diff(
            $classes,
            array( 'form-row-first', 'form-row-last', 'form-row-wide', 'cr-delivery-field', 'cr-delivery-field--full', 'cr-delivery-field--half' )
        );
        $classes[] = 'cr-delivery-field';
        $classes[] = 'cr-delivery-field--' . $presentation['layout'];
        $fields[ $key ]['class'] = array_values( array_unique( $classes ) );
    }

    return $fields;
}
add_filter( 'woocommerce_billing_fields', 'cr2026_checkout_delivery_fields', 9999, 2 );


/** Add the app-style delivery heading without replacing WooCommerce markup. */
function cr2026_checkout_render_delivery_heading( $checkout ) {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout()
        || ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) ) {
        return;
    }

    echo '<div class="cr-checkout-delivery-heading"><span class="cr-checkout-delivery-heading__step" aria-hidden="true">1</span><h2>'
        . esc_html__( 'Entrega', 'crios-rango-2026' )
        . '</h2></div>';
}
add_action( 'woocommerce_before_checkout_billing_form', 'cr2026_checkout_render_delivery_heading', 5, 1 );

