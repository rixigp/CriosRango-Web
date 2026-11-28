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
 * One default for every product listing; only Novedades opts into newest-first.
 */
function cr2026_catalog_default_sort( $is_novelties = false ) {
    return $is_novelties ? 'newest' : 'title_asc';
}

/**
 * Canonical WooCommerce query mapping shared by native archives and REST pages.
 * Price ordering is completed by the shared posts_clauses filter below.
 */
function cr2026_catalog_sort_query_vars( $sort ) {
    $sort = sanitize_key( (string) $sort );
    $orderby = 'title';
    $order = 'ASC';

    if ( in_array( $sort, array( 'newest', 'date' ), true ) ) {
        $orderby = 'date';
        $order = 'DESC';
    } elseif ( 'oldest' === $sort ) {
        $orderby = 'date';
        $order = 'ASC';
    } elseif ( in_array( $sort, array( 'price', 'price_asc' ), true ) ) {
        $orderby = 'cr2026_price_asc';
        $order = 'ASC';
    } elseif ( in_array( $sort, array( 'price-desc', 'price_desc' ), true ) ) {
        $orderby = 'cr2026_price_desc';
        $order = 'DESC';
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

    $is_novelties_query = ! $is_category_query && ! $is_brand_query
        && function_exists( 'get_query_var' ) && (bool) get_query_var( 'cr2026_novelties' );
    $default_sort = cr2026_catalog_default_sort( $is_novelties_query );
    $default_orderby = 'newest' === $default_sort ? 'date' : 'title';
    $requested_sort = isset( $_GET['orderby'] )
        ? sanitize_key( wp_unslash( $_GET['orderby'] ) )
        : $default_orderby;
    if ( ! in_array( $requested_sort, array( 'date', 'price', 'price-desc', 'title' ), true ) ) {
        $requested_sort = $default_orderby;
    }
    $sort_args = cr2026_catalog_sort_query_vars( $requested_sort );
    $query->set( 'orderby', $sort_args['orderby'] );
    $query->set( 'order', $sort_args['order'] );

    if ( $is_brand_query ) {
        // Brand archives render the existing product_brand main query directly.
        return;
    }

    // The Shop/category listing is hydrated page-by-page by catalog-page.
    // Keep its native query aligned with the same server-side default.
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
    $requested_orderby = sanitize_key( (string) $request->get_param( 'orderby' ) );
    $sort_map = array(
        'date' => 'newest',
        'price' => 'price_asc',
        'price-desc' => 'price_desc',
        'title' => 'title_asc',
    );
    $sort_args = cr2026_catalog_sort_query_vars(
        isset( $sort_map[ $requested_orderby ] ) ? $sort_map[ $requested_orderby ] : 'title_asc'
    );
    $query_orderby = $sort_args['orderby'];
    $order = $sort_args['order'];
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
    ob_start();
    foreach ( $products as $index => $product ) {
        cr2026_render_product_card( $product, $index + ( $page > 1 ? 4 : 0 ) );
    }
    $rendered_html = ob_get_clean();
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
function cr2026_catalog_cache_key( $generation, $scope, $category_id, $brand_id, $outlet_category_id, $origin_category_ids, $filters, $sort, $page, $per_page, $novelties_limit = 0, $novelties_cohort_ids = array() ) {
    $state = array(
        'schema' => 1, 'generation' => (int) $generation, 'scope' => (string) $scope,
        'category_id' => (int) $category_id, 'brand_id' => (int) $brand_id,
        'outlet_category_id' => (int) $outlet_category_id,
        'origin_category_ids' => cr2026_catalog_cache_normalize_ids( $origin_category_ids ),
        'size_ids' => cr2026_catalog_cache_normalize_ids( $filters['size_ids'] ),
        'color_ids' => cr2026_catalog_cache_normalize_ids( $filters['color_ids'] ),
        'brand_ids' => cr2026_catalog_cache_normalize_ids( $filters['brand_ids'] ),
        'sort' => (string) $sort, 'page' => (int) $page, 'per_page' => (int) $per_page,
        'novelties_limit' => max( 0, absint( $novelties_limit ) ),
        'novelties_cohort_hash' => $novelties_cohort_ids ? md5( implode( ',', array_map( 'absint', $novelties_cohort_ids ) ) ) : '',
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
    $fresh = get_transient( $cache_key );
    if ( cr2026_catalog_cache_payload_valid( $fresh ) ) {
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
        return array( 'state' => 'miss', 'payload' => false );
    }
    if ( false !== $stale ) {
        return array( 'state' => 'stale', 'payload' => $stale );
    }
    return array( 'state' => 'locked', 'payload' => false );
}
function cr2026_catalog_cache_store( $cache_key, $payload ) {
    if ( ! cr2026_catalog_cache_payload_valid( $payload ) ) { return false; }
    set_transient( $cache_key, $payload, 300 );
    set_transient( $cache_key . '_stale', $payload, 1800 );
    return true;
}

/**
 * Freeze the Novedades universe per catalogue generation. Every sort and page
 * reads this same newest-24 ID set; sorting is applied only after inclusion.
 */
function cr2026_novelties_cohort_ids( $generation ) {
    $cache_key = 'cr2026_novelties_cohort_v1_' . absint( $generation );
    $cached = get_transient( $cache_key );
    if ( is_array( $cached ) ) {
        $cached_ids = array_values( array_map( 'absint', $cached ) );
        if ( count( $cached_ids ) <= 24 && ! in_array( 0, $cached_ids, true )
            && count( $cached_ids ) === count( array_unique( $cached_ids ) ) ) {
            return $cached_ids;
        }
        delete_transient( $cache_key );
    }

    $ids = wc_get_products( array(
        'status' => 'publish',
        'visibility' => 'visible',
        'limit' => 24,
        'return' => 'ids',
        'orderby' => 'date',
        'order' => 'DESC',
    ) );
    $ids = is_array( $ids ) ? array_values( array_map( 'absint', $ids ) ) : array();
    $ids = array_values( array_filter( $ids ) );
    $ids = array_slice( array_values( array_unique( $ids ) ), 0, 24 );
    set_transient( $cache_key, $ids, DAY_IN_SECONDS );
    return $ids;
}

/**
 * Sort only the already-frozen Novedades cohort in PHP. Keeping the sort as a
 * separate in-memory step makes it impossible for an orderby query to widen
 * the result universe beyond the 24 IDs selected above.
 */
function cr2026_novelties_sort_cohort_products( $products, $sort ) {
    $sort = sanitize_key( (string) $sort );
    usort( $products, static function ( $left, $right ) use ( $sort ) {
        $left_id = $left->get_id();
        $right_id = $right->get_id();
        $comparison = 0;

        if ( in_array( $sort, array( 'title_asc', 'title_desc' ), true ) ) {
            $left_name = remove_accents( wp_strip_all_tags( $left->get_name() ) );
            $right_name = remove_accents( wp_strip_all_tags( $right->get_name() ) );
            $comparison = strnatcasecmp( $left_name, $right_name );
            if ( 'title_desc' === $sort ) { $comparison *= -1; }
        } elseif ( in_array( $sort, array( 'price_asc', 'price_desc' ), true ) ) {
            $left_price = $left->get_price();
            $right_price = $right->get_price();
            $left_has_price = '' !== $left_price && is_numeric( $left_price );
            $right_has_price = '' !== $right_price && is_numeric( $right_price );
            if ( $left_has_price !== $right_has_price ) {
                return $left_has_price ? -1 : 1;
            }
            if ( $left_has_price && $right_has_price ) {
                $comparison = (float) $left_price <=> (float) $right_price;
                if ( 'price_desc' === $sort ) { $comparison *= -1; }
            }
        } else {
            $left_date = $left->get_date_created();
            $right_date = $right->get_date_created();
            $left_timestamp = $left_date ? $left_date->getTimestamp() : 0;
            $right_timestamp = $right_date ? $right_date->getTimestamp() : 0;
            $comparison = $left_timestamp <=> $right_timestamp;
            if ( 'oldest' !== $sort ) { $comparison *= -1; }
        }

        return 0 !== $comparison ? $comparison : ( $left_id <=> $right_id );
    } );

    return $products;
}

/**
 * Fail closed if Filter API returns a product outside the active product_cat
 * term tree. get_term_children() includes every descendant, not only direct children.
 */
function cr2026_catalog_product_ids_are_within_category_tree( $product_ids, $category_id ) {
    $category_id = absint( $category_id );
    if ( ! $category_id || ! taxonomy_exists( 'product_cat' ) ) { return false; }

    $descendant_ids = get_term_children( $category_id, 'product_cat' );
    if ( is_wp_error( $descendant_ids ) || ! is_array( $descendant_ids ) ) { return false; }
    $allowed_ids = array_fill_keys(
        array_map( 'absint', array_merge( array( $category_id ), $descendant_ids ) ),
        true
    );

    foreach ( $product_ids as $product_id ) {
        $product_id = absint( $product_id );
        if ( ! $product_id ) { return false; }
        $assigned_ids = wp_get_post_terms( $product_id, 'product_cat', array( 'fields' => 'ids' ) );
        if ( is_wp_error( $assigned_ids ) || ! is_array( $assigned_ids ) ) { return false; }

        $inside_tree = false;
        foreach ( $assigned_ids as $assigned_id ) {
            if ( isset( $allowed_ids[ absint( $assigned_id ) ] ) ) {
                $inside_tree = true;
                break;
            }
        }
        if ( ! $inside_tree ) { return false; }
    }
    return true;
}

function cr2026_catalog_page_rest_response( WP_REST_Request $request ) {
    $page = max( 1, absint( $request->get_param( 'page' ) ) );
    $per_page = CR2026_CATALOG_PAGE_SIZE;
    $category_id = absint( $request->get_param( 'catalog_category_id' ) );
    $brand_id = absint( $request->get_param( 'catalog_brand_id' ) );
    $is_novelties = 1 === absint( $request->get_param( 'novelties' ) );
    $novelties_limit = $is_novelties ? 24 : 0;
    $page_offset = ( $page - 1 ) * $per_page;
    $page_limit = $is_novelties ? max( 0, min( $per_page, $novelties_limit - $page_offset ) ) : $per_page;
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
    $category_term = $category_id ? get_term( $category_id, 'product_cat' ) : null;
    if ( $category_id > 0 && ( ! $category_term instanceof WP_Term || 'product_cat' !== $category_term->taxonomy ) ) {
        return new WP_Error( 'cr2026_catalog_category', __( 'Categoría no válida.', 'crios-rango-2026' ), array( 'status' => 400 ) );
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
    if ( $is_outlet_scope && ! cr2026_is_outlet_context_category( $outlet_category_id ) ) {
        return new WP_Error( 'cr2026_catalog_outlet_category', __( 'Rama Outlet no válida.', 'crios-rango-2026' ), array( 'status' => 400 ) );
    }
    if ( ! $is_outlet_scope && ( $outlet_category_id > 0 || ! empty( $origin_category_ids ) ) ) {
        return new WP_Error( 'cr2026_catalog_outlet_context', __( 'Contexto Outlet no válido para catálogo general.', 'crios-rango-2026' ), array( 'status' => 400 ) );
    }
    if ( $is_novelties && ( $category_id > 0 || $is_brand_context || $is_outlet_scope ) ) {
        return new WP_Error( 'cr2026_catalog_novelties_context', __( 'El límite de Novedades solo es válido para el catálogo raíz.', 'crios-rango-2026' ), array( 'status' => 400 ) );
    }
    $sort = sanitize_key( (string) $request->get_param( 'sort' ) );
    $default_sort = cr2026_catalog_default_sort( $is_novelties );
    if ( 'default' === $sort || ! in_array( $sort, array( 'newest', 'oldest', 'price_asc', 'price_desc', 'title_asc', 'title_desc' ), true ) ) {
        $sort = $default_sort;
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

    $generation = cr2026_catalog_cache_generation();
    $novelties_cohort_ids = $is_novelties ? cr2026_novelties_cohort_ids( $generation ) : array();
    $cache_bypass = cr2026_catalog_cache_session_sensitive();
    if ( $cache_bypass ) {
    } else {
        $cache_filters = array();
        foreach ( $filter_keys as $filter_key ) { $cache_filters[ $filter_key ] = $request->get_param( $filter_key ); }
        $catalog_cache_key = cr2026_catalog_cache_key(
            $generation, $scope, $category_id, $brand_id, $outlet_category_id,
            $origin_category_ids, $cache_filters, $sort, $page, $per_page, $novelties_limit, $novelties_cohort_ids
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

    if ( $is_novelties && ! $has_filters ) {
        // Hydrate exactly the frozen 24 IDs without applying a catalogue-wide
        // orderby. The complete cohort is sorted in memory before pagination.
        $cohort_products = $novelties_cohort_ids ? wc_get_products( array(
            'status' => 'publish',
            'visibility' => 'visible',
            'include' => $novelties_cohort_ids,
            'limit' => count( $novelties_cohort_ids ),
            'return' => 'objects',
            'orderby' => 'include',
        ) ) : array();
        // Defensively enforce exact membership after hydration as well as in SQL.
        $cohort_id_lookup = array_fill_keys( $novelties_cohort_ids, true );
        $cohort_products = array_values( array_filter( $cohort_products, static function ( $product ) use ( $cohort_id_lookup ) {
            return $product instanceof WC_Product && isset( $cohort_id_lookup[ absint( $product->get_id() ) ] );
        } ) );
        $hydrated_cohort_ids = array_map( static function ( $product ) { return $product->get_id(); }, $cohort_products );
        $expected_cohort_ids = $novelties_cohort_ids;
        sort( $hydrated_cohort_ids, SORT_NUMERIC );
        sort( $expected_cohort_ids, SORT_NUMERIC );
        if ( $hydrated_cohort_ids !== $expected_cohort_ids ) {
            return new WP_Error( 'cr2026_novelties_cohort_hydration', __( 'No se pudo hidratar exactamente el conjunto de Novedades.', 'crios-rango-2026' ), array( 'status' => 502 ) );
        }
        $cohort_products = cr2026_novelties_sort_cohort_products( $cohort_products, $sort );
        $total = count( $cohort_products );
        $products = array_slice( $cohort_products, $page_offset, $page_limit );
        $product_ids = array_map( static function ( $product ) { return $product->get_id(); }, $products );
        $has_more = ( $page_offset + count( $products ) ) < $total;
    } elseif ( $has_filters ) {
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
        $filter_response = rest_do_request( $filter_request );
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
        $product_ids = array_slice( $normalized_product_ids, 0, $page_limit );
        if ( $category_id > 0 && ! $is_outlet_scope && ! $is_brand_context
            && ! cr2026_catalog_product_ids_are_within_category_tree( $product_ids, $category_id ) ) {
            return new WP_Error( 'cr2026_catalog_category_scope', __( 'Filter API devolvió productos fuera del árbol de la categoría activa.', 'crios-rango-2026' ), array( 'status' => 502 ) );
        }
        $filter_api_product_ids = $product_ids;
        if ( $product_ids ) {
            $products = wc_get_products( array(
                'status' => 'publish',
                'visibility' => 'visible',
                'include' => $product_ids,
                'limit' => count( $product_ids ),
                'return' => 'objects',
                'orderby' => 'include',
            ) );
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
        if ( $is_novelties ) {
            if ( null !== $total ) { $total = min( $total, $novelties_limit ); }
            $has_more = $has_more && ( $page * $per_page < $novelties_limit );
        }
    } else {
        $term = $category_term;
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
        $catalog_result = wc_get_products( $products_query );
        $products = isset( $catalog_result->products ) && is_array( $catalog_result->products ) ? $catalog_result->products : array();
        $total = isset( $catalog_result->total ) ? absint( $catalog_result->total ) : null;
        $max_num_pages = isset( $catalog_result->max_num_pages ) ? absint( $catalog_result->max_num_pages ) : 0;
        if ( $is_novelties ) {
            if ( null !== $total ) {
                $total = min( $total, $novelties_limit );
                $max_num_pages = min( $max_num_pages, (int) ceil( $total / $per_page ) );
            }
            $products = array_slice( $products, 0, $page_limit );
        }
        $has_more = $page < $max_num_pages;
        $product_ids = array_map( static function ( $product ) { return $product->get_id(); }, $products );
    }
    ob_start();
    foreach ( $products as $index => $product ) {
        cr2026_render_product_card( $product, $index + ( $page > 1 ? 4 : 0 ) );
    }
    $rendered_html = ob_get_clean();
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
 * Keep WooCommerce's browser-side address-i18n locale priorities aligned with
 * the final billing field sequence. address-i18n.js applies these priorities
 * to native wrappers and sorts them after checkout markup has been rendered.
 *
 * Locale callbacks intentionally modify priority only. Labels, required,
 * hidden, type, validate, autocomplete, state and country data remain native.
 */
function cr2026_checkout_normalize_address_locale_priorities( $fields ) {
    if ( ! is_array( $fields ) ) {
        return $fields;
    }

    $priorities = array(
        'phone'     => 40,
        'address_1' => 50,
        'state'     => 60,
        'city'      => 70,
        'postcode'  => 80,
        'country'   => 90,
    );

    foreach ( $priorities as $key => $priority ) {
        if ( ! isset( $fields[ $key ] ) || ! is_array( $fields[ $key ] ) ) {
            $fields[ $key ] = array();
        }
        $fields[ $key ]['priority'] = $priority;
    }

    return $fields;
}
add_filter( 'woocommerce_get_country_locale_default', 'cr2026_checkout_normalize_address_locale_priorities', 9999 );
add_filter( 'woocommerce_get_country_locale_base', 'cr2026_checkout_normalize_address_locale_priorities', 9999 );

/**
 * Normalize the Spain-specific overlay too. WooCommerce merges this over the
 * default locale in address-i18n.js, so phone must be present here as well.
 */
function cr2026_checkout_country_address_locale( $locale ) {
    if ( ! is_array( $locale ) || ! isset( $locale['ES'] ) || ! is_array( $locale['ES'] ) ) {
        return $locale;
    }

    $locale['ES'] = cr2026_checkout_normalize_address_locale_priorities( $locale['ES'] );

    return $locale;
}
add_filter( 'woocommerce_get_country_locale', 'cr2026_checkout_country_address_locale', 9999 );

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

/**
 * Finalize native billing field priorities after checkout_fields callbacks.
 * WooCommerce sorts the billing array by priority immediately after this
 * filter returns. The maximum hook priority prevents ordinary theme/plugin
 * callbacks from moving billing_phone back behind the address fields.
 *
 * Only the targeted fields' priority values are normalized. In particular,
 * billing_phone key, id, name, type, required, validate, autocomplete and
 * value are left exactly as supplied by WooCommerce and other integrations.
 */
function cr2026_checkout_stabilize_phone_field_order( $fields ) {
    if ( ! is_array( $fields )
        || ! isset( $fields['billing'] )
        || ! is_array( $fields['billing'] ) ) {
        return $fields;
    }

    $priorities = array(
        'billing_first_name' => 10,
        'billing_last_name'  => 20,
        'billing_email'      => 30,
        'billing_phone'      => 40,
        'billing_address_1'  => 50,
        'billing_state'      => 60,
        'billing_city'       => 70,
        'billing_postcode'   => 80,
        'billing_country'    => 90,
    );

    foreach ( $priorities as $key => $priority ) {
        if ( isset( $fields['billing'][ $key ] ) && is_array( $fields['billing'][ $key ] ) ) {
            $fields['billing'][ $key ]['priority'] = $priority;
        }
    }

    // Rebuild the existing entries in the requested delivery sequence. This
    // changes only array insertion order: each native field definition and all
    // properties supplied by WooCommerce/plugins are reused without mutation.
    $billing_order = array(
        'billing_first_name',
        'billing_last_name',
        'billing_email',
        'billing_phone',
        'billing_address_1',
        'billing_state',
        'billing_city',
        'billing_postcode',
        'billing_country',
    );
    $ordered_billing = array();

    foreach ( $billing_order as $key ) {
        if ( isset( $fields['billing'][ $key ] ) && is_array( $fields['billing'][ $key ] ) ) {
            $ordered_billing[ $key ] = $fields['billing'][ $key ];
        }
    }

    // Keep any integration-added billing fields present, in their original
    // relative order, after the nine explicitly ordered delivery fields.
    foreach ( $fields['billing'] as $key => $field ) {
        if ( ! array_key_exists( $key, $ordered_billing ) ) {
            $ordered_billing[ $key ] = $field;
        }
    }

    $fields['billing'] = $ordered_billing;

    return $fields;
}
add_filter( 'woocommerce_checkout_fields', 'cr2026_checkout_stabilize_phone_field_order', PHP_INT_MAX );


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





/**
 * Remove only WooCommerce core's separator between a shipping method name and
 * its appended price in the classic Checkout full label.
 *
 * Keep the method's configured title, rate data, price markup, taxes and every
 * subsequent label fragment intact. The exact prefix match also preserves any
 * colon that legitimately belongs to the configured method name.
 */
function cr2026_checkout_shipping_full_label_presentation( $label, $method ) {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout()
        || ( function_exists( 'is_order_received_page' ) && is_order_received_page() )
        || ! is_string( $label )
        || ! is_object( $method )
        || ! method_exists( $method, 'get_label' ) ) {
        return $label;
    }

    $method_label = $method->get_label();

    if ( ! is_string( $method_label ) || '' === $method_label ) {
        return $label;
    }

    $prefix = $method_label . ': ';

    if ( 0 !== strpos( $label, $prefix ) ) {
        return $label;
    }

    return $method_label . ' ' . substr( $label, strlen( $prefix ) );
}
add_filter( 'woocommerce_cart_shipping_method_full_label', 'cr2026_checkout_shipping_full_label_presentation', 99, 2 );


/**
 * Keep the classic Checkout's final action clear of privacy/terms copy.
 * WooCommerce's official display filter also disables its terms checkbox
 * requirement during checkout validation; gateway and order processing stay native.
 */
function cr2026_checkout_disable_terms_acceptance( $show_terms ) {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout()
        || ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) ) {
        return $show_terms;
    }
    return false;
}
add_filter( 'woocommerce_checkout_show_terms', 'cr2026_checkout_disable_terms_acceptance', 9999 );

function cr2026_checkout_remove_privacy_terms_output() {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout()
        || ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) ) {
        return;
    }
    remove_action( 'woocommerce_checkout_terms_and_conditions', 'wc_checkout_privacy_policy_text', 20 );
    remove_action( 'woocommerce_checkout_terms_and_conditions', 'wc_terms_and_conditions_page_content', 30 );
}
add_action( 'wp', 'cr2026_checkout_remove_privacy_terms_output', 99 );

function cr2026_checkout_order_button_text( $button_text ) {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout()
        || ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) ) {
        return $button_text;
    }
    return 'Realizar pedido';
}
add_filter( 'woocommerce_order_button_text', 'cr2026_checkout_order_button_text', 9999 );

/**
 * Keep store-payment (COD) orders awaiting collection/payment.
 * This leaves other gateways and WooCommerce's native order processing untouched.
 */
function cr2026_cod_initial_order_status( $order_status, $order ) {
    if ( $order instanceof WC_Order && 'cod' === $order->get_payment_method() ) {
        return 'on-hold';
    }
    return $order_status;
}
add_filter( 'woocommerce_cod_process_payment_order_status', 'cr2026_cod_initial_order_status', 10, 2 );

/**
 * Attach a minimal, checkout-only presentation payload after WooCommerce has
 * accepted the payment gateway's successful result. Order creation and every
 * native transactional hook remain owned by WooCommerce and the gateway.
 */
function cr2026_checkout_offline_success_modal_result( $result, $order_id ) {
    if ( ! is_array( $result ) || ! isset( $result['result'], $result['redirect'] )
        || 'success' !== $result['result']
        || ! isset( $_GET['wc-ajax'] )
        || 'checkout' !== sanitize_key( wp_unslash( $_GET['wc-ajax'] ) ) ) {
        return $result;
    }

    $order = wc_get_order( absint( $order_id ) );
    if ( ! $order instanceof WC_Order ) {
        return $result;
    }

    $gateway = $order->get_payment_method();
    if ( ! in_array( $gateway, array( 'cheque', 'cod' ), true ) ) {
        return $result;
    }

    $variant = 'cheque' === $gateway ? 'bizum_success' : 'store_success';
    $result['cr_order_success'] = cr2026_checkout_payment_result_modal_payload( $order, $variant );

    // WooCommerce's checkout JS assigns window.location to this hash. On the
    // current Checkout document that is same-page navigation, not a reload.
    $result['redirect'] = '#cr-order-success';
    return $result;
}
add_filter( 'woocommerce_payment_successful_result', 'cr2026_checkout_offline_success_modal_result', 9999, 2 );

function cr2026_checkout_payment_result_modal_payload( $order, $variant ) {
    if ( ! $order instanceof WC_Order ) { return null; }
    $number = (string) $order->get_order_number();
    $gateway = 'bizum_success' === $variant ? 'cheque' : ( 'store_success' === $variant ? 'cod' : 'cecabank_gateway' );
    $payload = array(
        'enabled' => true, 'variant' => $variant, 'gateway' => $gateway,
        'order_id' => (int) $order->get_id(), 'order_number' => $number,
        'title' => 'Pedido recibido', 'paragraphs' => array(),
        'action' => 'shop', 'action_label' => 'Seguir comprando',
    );
    if ( 'bizum_success' === $variant ) {
        $payload['paragraphs'] = array(
            'Tu pedido #' . $number . ' ha sido recibido.',
            'Realiza el pago por Bizum al 679 97 28 88 y utiliza el número de pedido como referencia de pago.',
            'Tu pedido no se procesará hasta que se haya recibido el importe.',
        );
    } elseif ( 'store_success' === $variant ) {
        $payload['paragraphs'] = array(
            'Tu pedido #' . $number . ' ha sido recibido.',
            'Podrás realizar el pago en efectivo en la tienda al recoger tu pedido.',
            'Utiliza el número de pedido como referencia cuando vengas a recogerlo.',
        );
    } elseif ( 'card_success' === $variant ) {
        $payload['paragraphs'] = array( 'Tu pedido #' . $number . ' se ha pagado correctamente.' );
    } elseif ( 'card_failure' === $variant ) {
        $payload['title'] = 'Pago no completado';
        $payload['paragraphs'] = array( 'No se ha podido completar el pago.', 'Puedes volver a intentarlo desde tu carrito.' );
        $payload['action'] = 'close';
        $payload['action_label'] = 'Cerrar';
    } else { return null; }
    return $payload;
}

function cr2026_checkout_hide_cecabank_cancel_notice() {
    if ( ! function_exists( 'wc_get_notices' ) || ! function_exists( 'wc_set_notices' ) ) { return; }
    $notices = wc_get_notices();
    foreach ( $notices as $type => $items ) {
        if ( ! is_array( $items ) ) { continue; }
        $notices[ $type ] = array_values( array_filter( $items, function ( $item ) {
            $message = is_array( $item ) && isset( $item['notice'] ) ? wp_strip_all_tags( $item['notice'] ) : '';
            return 'Tu pedido se ha cancelado.' !== trim( $message );
        } ) );
    }
    wc_set_notices( $notices );
}

/**
 * Cecabank sends URL_NOK to WooCommerce's native order-cancel URL. The core
 * cancel handler removes its query arguments before redirecting to Cart, so
 * preserve only a verified Cecabank order ID in the current WooCommerce session.
 */
function cr2026_checkout_capture_cecabank_cancelled_order( $order_id ) {
    if ( ! function_exists( 'WC' ) || ! function_exists( 'wc_get_order' ) ) { return; }
    $order = wc_get_order( absint( $order_id ) );
    $woocommerce = WC();
    if ( $order instanceof WC_Order && 'cecabank_gateway' === $order->get_payment_method()
        && $order->has_status( 'cancelled' )
        && $woocommerce && isset( $woocommerce->session ) && $woocommerce->session ) {
        $woocommerce->session->set( 'cr2026_cecabank_cancelled_order_id', (int) $order->get_id() );
    }
}
add_action( 'woocommerce_cancelled_order', 'cr2026_checkout_capture_cecabank_cancelled_order', 10, 1 );

function cr2026_checkout_payment_result_page_payload() {
    if ( ! function_exists( 'wc_get_order' ) ) { return null; }
    if ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) {
        $order_id = absint( get_query_var( 'order-received' ) );
        $order_key = isset( $_GET['key'] ) ? wc_clean( wp_unslash( $_GET['key'] ) ) : '';
        $order = $order_id ? wc_get_order( $order_id ) : false;
        if ( $order instanceof WC_Order && '' !== $order_key
            && hash_equals( (string) $order->get_order_key(), (string) $order_key )
            && 'cecabank_gateway' === $order->get_payment_method() && $order->is_paid() ) {
            return cr2026_checkout_payment_result_modal_payload( $order, 'card_success' );
        }
    }
    if ( function_exists( 'is_cart' ) && is_cart() && function_exists( 'WC' ) ) {
        $woocommerce = WC();
        if ( $woocommerce && isset( $woocommerce->session ) && $woocommerce->session ) {
            $cancelled_order_id = absint( $woocommerce->session->get( 'cr2026_cecabank_cancelled_order_id' ) );
            if ( $cancelled_order_id ) {
                // Consume the one-shot marker before rendering so later Cart
                // visits cannot replay a stale Cecabank failure dialog.
                $woocommerce->session->set( 'cr2026_cecabank_cancelled_order_id', 0 );
                $order = wc_get_order( $cancelled_order_id );
                if ( $order instanceof WC_Order
                    && 'cecabank_gateway' === $order->get_payment_method()
                    && in_array( $order->get_status(), array( 'cancelled', 'failed' ), true ) ) {
                    cr2026_checkout_hide_cecabank_cancel_notice();
                    return cr2026_checkout_payment_result_modal_payload( $order, 'card_failure' );
                }
            }
        }
    }
    return null;
}


/**
 * Checkout benefits card: suppress Points & Rewards through its public filters
 * and remove only the native coupon prompt. Cart behavior remains untouched.
 */
/**
 * The coupon form is Checkout-only. Points & Rewards notices are suppressed
 * through the plugin's public message filters below, not by removing actions.
 */
function cr2026_checkout_remove_legacy_benefit_prompts() {
    remove_action( 'woocommerce_before_checkout_form', 'woocommerce_checkout_coupon_form', 10 );
}
add_action( 'woocommerce_before_checkout_form', 'cr2026_checkout_remove_legacy_benefit_prompts', 1 );

/** True only for the normal Checkout page or its order-review AJAX request. */
function cr2026_checkout_is_benefits_request() {
    if ( function_exists( 'is_checkout' ) && is_checkout()
        && ( ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'order-received' ) ) ) {
        return true;
    }

    return function_exists( 'wp_doing_ajax' ) && wp_doing_ajax()
        && isset( $_REQUEST['wc-ajax'] )
        && 'update_order_review' === sanitize_text_field( wp_unslash( $_REQUEST['wc-ajax'] ) );
}

// WPLoyalty exposes Checkout-only switches; Cart message settings remain untouched.
add_filter( 'wlr_is_checkout_earn_message_enabled', '__return_false' );
add_filter( 'wlr_is_checkout_redeem_message_enabled', '__return_false' );

/**
 * Ask WPLoyalty for its own calculated cart points. The temporary public
 * message filter captures {wlr_cart_points}; no loyalty rules are duplicated.
 */
function cr2026_checkout_benefits_points_earned() {
    $GLOBALS['cr2026_checkout_points_earned'] = null;

    if ( ! class_exists( '\\Wlr\\App\\Controllers\\Site\\DisplayMessage' ) ) {
        return null;
    }

    $points_earned = null;
    $capture_points = static function( $message, $short_code_list ) use ( &$points_earned ) {
        if ( is_array( $short_code_list ) && array_key_exists( '{wlr_cart_points}', $short_code_list ) ) {
            $value = $short_code_list['{wlr_cart_points}'];
            $points_earned = is_numeric( $value ) && (float) $value >= 0
                ? (float) $value
                : null;
        }

        return '';
    };

    $buffer_level = ob_get_level();
    add_filter( 'wlr_points_rewards_earn_points_message', $capture_points, PHP_INT_MAX, 2 );

    try {
        ob_start();
        $display_message = new \Wlr\App\Controllers\Site\DisplayMessage();
        $display_message->getCartMessage( false );
    } catch ( Throwable $error ) {
        $points_earned = null;
    } finally {
        while ( ob_get_level() > $buffer_level ) {
            ob_end_clean();
        }
        remove_filter( 'wlr_points_rewards_earn_points_message', $capture_points, PHP_INT_MAX );
    }

    $GLOBALS['cr2026_checkout_points_earned'] = $points_earned;
    return $points_earned;
}

/**
 * Expose WPLoyalty's live earned-points value on the Store API checkout response.
 * The same helper powers the existing WEB benefits card; no points formula is duplicated.
 */
function cr2026_register_checkout_earned_points_extension() {
    if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' )
        || ! class_exists( '\\Automattic\\WooCommerce\\StoreApi\\Schemas\\V1\\CheckoutSchema' ) ) {
        return;
    }

    woocommerce_store_api_register_endpoint_data( array(
        'endpoint' => \Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema::IDENTIFIER,
        'namespace' => 'criosrango',
        'data_callback' => static function() {
            $logger = function_exists( 'wc_get_logger' ) ? wc_get_logger() : null;
            if ( $logger ) {
                $logger->debug( 'callback_executed=yes', array( 'source' => 'cr-checkout-points' ) );
            }

            $earned_points = cr2026_checkout_benefits_points_earned();

            if ( $logger ) {
                $logger->debug(
                    'earned_points=' . ( null === $earned_points ? 'null' : (string) $earned_points ),
                    array( 'source' => 'cr-checkout-points' )
                );
            }

            return array(
                'earned_points' => null === $earned_points ? null : (float) $earned_points,
            );
        },
        'schema_callback' => static function() {
            return array(
                'earned_points' => array(
                    'description' => __( 'Puntos que WPLoyalty asigna a esta compra.', 'crios-rango-2026' ),
                    'type' => 'number',
                    'nullable' => true,
                    'readonly' => true,
                ),
            );
        },
        'schema_type' => ARRAY_A,
    ) );
}
add_action( 'woocommerce_blocks_loaded', 'cr2026_register_checkout_earned_points_extension' );

/**
 * Resolve a real free-shipping method for the currently matching shipping
 * package. Settings are read from the live zone instance; no threshold is
 * hardcoded and no shipping rates are altered.
 */
function cr2026_checkout_benefits_shipping_data() {
    if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->shipping()
        || ! class_exists( 'WC_Shipping_Zones' ) ) {
        return null;
    }

    $packages = WC()->shipping()->get_packages();
    if ( ! is_array( $packages ) || empty( $packages ) ) {
        $packages = WC()->cart->get_shipping_packages();
    }
    if ( ! is_array( $packages ) || empty( $packages ) ) {
        return null;
    }

    foreach ( $packages as $package ) {
        if ( ! is_array( $package ) ) {
            continue;
        }

        $zone = WC_Shipping_Zones::get_zone_matching_package( $package );
        if ( ! is_object( $zone ) || ! method_exists( $zone, 'get_shipping_methods' ) ) {
            continue;
        }

        $methods = $zone->get_shipping_methods( true );
        if ( ! is_array( $methods ) ) {
            continue;
        }

        foreach ( $methods as $method ) {
            if ( ! is_object( $method ) || ! isset( $method->id ) || 'free_shipping' !== $method->id
                || ! method_exists( $method, 'get_option' ) ) {
                continue;
            }

            $requires = (string) $method->get_option( 'requires', '' );
            $threshold = $method->get_option( 'min_amount', '' );
            $ignore_discounts = (string) $method->get_option( 'ignore_discounts', 'no' );
            $threshold = is_numeric( $threshold ) ? (float) $threshold : null;

            $free_rate_available = false;
            if ( isset( $package['rates'] ) && is_array( $package['rates'] ) ) {
                foreach ( $package['rates'] as $rate ) {
                    if ( ! is_object( $rate ) || ! method_exists( $rate, 'get_method_id' )
                        || ! method_exists( $rate, 'get_cost' ) ) {
                        continue;
                    }
                    if ( 'free_shipping' === $rate->get_method_id()
                        && (float) $rate->get_cost() <= 0 ) {
                        $free_rate_available = true;
                        break;
                    }
                }
            }

            $eligible_amount = null;
            $remaining = null;
            if ( null !== $threshold && in_array( $requires, array( 'min_amount', 'either', 'both' ), true )
                && WC()->cart && method_exists( WC()->cart, 'get_displayed_subtotal' ) ) {
                $eligible_amount = (float) WC()->cart->get_displayed_subtotal();

                if ( 'no' === $ignore_discounts ) {
                    $eligible_amount -= (float) WC()->cart->get_discount_total();
                    if ( 'incl' === get_option( 'woocommerce_tax_display_cart' ) ) {
                        $eligible_amount -= (float) WC()->cart->get_discount_tax();
                    }
                }

                $precision = function_exists( 'wc_get_price_decimals' ) ? wc_get_price_decimals() : 2;
                $eligible_amount = max( 0, round( $eligible_amount, $precision ) );
                $remaining = max( 0, round( $threshold - $eligible_amount, $precision ) );
            }

            return array(
                'instance' => isset( $method->instance_id ) ? (string) $method->instance_id : 'unknown',
                'requires' => $requires,
                'threshold' => $threshold,
                'ignore_discounts' => $ignore_discounts,
                'eligible_amount' => $eligible_amount,
                'remaining' => $remaining,
                'free_rate_available' => $free_rate_available,
            );
        }
    }

    return null;
}

/** Render the single server-generated Checkout benefits card. */
function cr2026_checkout_render_benefits_card() {
    if ( ! cr2026_checkout_is_benefits_request() ) {
        return;
    }

    $shipping = cr2026_checkout_benefits_shipping_data();
    $points = cr2026_checkout_benefits_points_earned();
    if ( null === $shipping && null === $points ) {
        return;
    }

    echo '<div class="cr-checkout-benefits" aria-label="' . esc_attr__( 'Beneficios de tu compra', 'crios-rango-2026' ) . '">';

    if ( null !== $shipping ) {
        $shipping_copy = '';
        if ( ! empty( $shipping['free_rate_available'] )
            || ( null !== $shipping['remaining'] && $shipping['remaining'] <= 0 ) ) {
            $shipping_copy = '¡Ya tienes envío gratis!';
        } elseif ( null !== $shipping['remaining'] && null !== $shipping['threshold'] ) {
            $amount = function_exists( 'wc_price' ) ? wc_price( $shipping['remaining'] ) : number_format_i18n( $shipping['remaining'], 2 ) . ' €';
            $shipping_copy = sprintf( 'Te faltan %s para conseguir envío gratis', $amount );
        }

        if ( '' !== $shipping_copy ) {
            echo '<div class="cr-checkout-benefits__row cr-checkout-benefits__row--shipping">'
                . '<span class="cr-checkout-benefits__icon" aria-hidden="true">'
                . '<svg viewBox="0 0 24 24" focusable="false"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>'
                . '</span><span class="cr-checkout-benefits__text">' . wp_kses( $shipping_copy, array( 'span' => array( 'class' => array() ), 'bdi' => array(), 'strong' => array() ) ) . '</span></div>';
        }
    }

    if ( null !== $points ) {
        $precision = ( floor( $points ) === $points ) ? 0 : 2;
        $points_label = number_format_i18n( $points, $precision );
        echo '<div class="cr-checkout-benefits__row cr-checkout-benefits__row--points">'
            . '<span class="cr-checkout-benefits__icon" aria-hidden="true">'
            . '<svg viewBox="0 0 24 24" focusable="false"><path d="m12 2 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 16.8l-5.9 3.2 1.2-6.5L2.5 8.9 9.1 8z"/></svg>'
            . '</span><span class="cr-checkout-benefits__text">' . sprintf( esc_html__( 'Sumarás %s puntos con esta compra', 'crios-rango-2026' ), '<span class="cr-checkout-benefits__value">' . esc_html( $points_label ) . '</span>' ) . '</span></div>';
    }

    echo '</div>';
}
add_action( 'woocommerce_before_checkout_form', 'cr2026_checkout_render_benefits_card', 20 );

/** Keep the benefits card synchronized with WooCommerce's order-review AJAX. */
function cr2026_checkout_benefits_order_review_fragment( $fragments ) {
    if ( ! cr2026_checkout_is_benefits_request() ) {
        return $fragments;
    }

    ob_start();
    cr2026_checkout_render_benefits_card();
    $html = ob_get_clean();

    if ( '' !== $html ) {
        $fragments['.cr-checkout-benefits'] = $html;
    } else {
        $fragments['.cr-checkout-benefits'] = '<div class="cr-checkout-benefits" hidden></div>';
    }

    return $fragments;
}
add_filter( 'woocommerce_update_order_review_fragments', 'cr2026_checkout_benefits_order_review_fragment', 20, 1 );

/**
 * Identify only a verified Cecabank order-pay receipt request. The order key
 * is checked before adding any presentation to the page.
 */
function cr2026_is_cecabank_redirect_request( $receipt_order_id = 0 ) {
    if ( ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'order-pay' )
        || ! function_exists( 'wc_get_order' ) ) {
        return false;
    }

    $order_id = absint( get_query_var( 'order-pay' ) );
    if ( ! $order_id || ( $receipt_order_id && $order_id !== absint( $receipt_order_id ) ) ) {
        return false;
    }

    $order_key = isset( $_GET['key'] ) && is_string( $_GET['key'] )
        ? wc_clean( wp_unslash( $_GET['key'] ) )
        : '';
    $order = wc_get_order( $order_id );

    return $order instanceof WC_Order
        && 'cecabank_gateway' === $order->get_payment_method()
        && '' !== $order_key
        && hash_equals( (string) $order->get_order_key(), (string) $order_key )
        && $order->needs_payment();
}

/** Add a page class only to the authenticated Cecabank redirect receipt. */
function cr2026_cecabank_redirect_body_class( $classes ) {
    if ( cr2026_is_cecabank_redirect_request() ) {
        $classes[] = 'cr-cecabank-redirect-page';
    }
    return $classes;
}
add_filter( 'body_class', 'cr2026_cecabank_redirect_body_class', 20, 1 );

/**
 * Render presentation before the gateway's original receipt callback.
 * The Cecabank plugin still prints its native hidden form and immediate submit.
 */
function cr2026_cecabank_redirect_loading_ui( $order_id ) {
    if ( ! cr2026_is_cecabank_redirect_request( $order_id ) ) {
        return;
    }

    echo '<section class="cr-cecabank-redirect" role="status" aria-live="polite">'
        . '<div class="cr-cecabank-redirect__card">'
        . '<span class="cr-cecabank-redirect__spinner" aria-hidden="true"></span>'
        . '<h1 class="cr-cecabank-redirect__title">' . esc_html__( 'Pago seguro', 'crios-rango-2026' ) . '</h1>'
        . '<p class="cr-cecabank-redirect__message">' . esc_html__( 'Conectando con la pasarela de pago...', 'crios-rango-2026' ) . '</p>'
        . '</div></section>';
}
add_action( 'woocommerce_receipt_cecabank_gateway', 'cr2026_cecabank_redirect_loading_ui', 1, 1 );



/**
 * Use WooCommerce's own registration handler, nonce, customer factory and
 * registration hooks while exposing the account fields required by the app.
 */
function cr2026_account_is_registration_request() {
    if ( is_user_logged_in() || ! function_exists( 'is_account_page' ) || ! is_account_page() ) {
        return false;
    }
    if ( function_exists( 'cr2026_account_guest_register_view' ) && cr2026_account_guest_register_view() ) {
        return true;
    }
    return isset( $_POST['register'], $_POST['woocommerce-register-nonce'] );
}

/** Enable native registration only on the dedicated registration view/request. */
function cr2026_account_registration_native_options( $pre_option ) {
    if ( ! is_user_logged_in() && function_exists( 'is_account_page' ) && is_account_page() ) {
        return cr2026_account_is_registration_request() ? 'yes' : 'no';
    }

    return $pre_option;
}
add_filter( 'pre_option_woocommerce_enable_myaccount_registration', 'cr2026_account_registration_native_options', 1 );

/** The form has no separate username field: WooCommerce derives it from email. */
function cr2026_account_registration_generate_username( $pre_option ) {
    return cr2026_account_is_registration_request() ? 'yes' : $pre_option;
}
add_filter( 'pre_option_woocommerce_registration_generate_username', 'cr2026_account_registration_generate_username', 1 );

/** Use the password entered in the native WooCommerce registration form. */
function cr2026_account_registration_generate_password( $pre_option ) {
    return cr2026_account_is_registration_request() ? 'no' : $pre_option;
}
add_filter( 'pre_option_woocommerce_registration_generate_password', 'cr2026_account_registration_generate_password', 1 );

/** Validate theme-specific required fields inside WooCommerce's native validation chain. */
function cr2026_account_validate_registration_fields( $username, $email, $errors ) {
    $first_name = isset( $_POST['first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['first_name'] ) ) : '';
    $last_name  = isset( $_POST['last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['last_name'] ) ) : '';
    $birthday   = isset( $_POST['birthday'] ) ? sanitize_text_field( wp_unslash( $_POST['birthday'] ) ) : '';
    $password   = isset( $_POST['password'] ) ? (string) wp_unslash( $_POST['password'] ) : '';
    $confirmation = isset( $_POST['password_confirmation'] ) ? (string) wp_unslash( $_POST['password_confirmation'] ) : '';

    if ( '' === $first_name ) {
        $errors->add( 'cr2026_registration_first_name', __( 'Por favor, introduce tu nombre.', 'crios-rango-2026' ) );
    }
    if ( '' === $last_name ) {
        $errors->add( 'cr2026_registration_last_name', __( 'Por favor, introduce tus apellidos.', 'crios-rango-2026' ) );
    }

    $date = DateTimeImmutable::createFromFormat( '!Y-m-d', $birthday );
    $date_errors = DateTimeImmutable::getLastErrors();
    $valid_birthday = $date instanceof DateTimeImmutable
        && $date->format( 'Y-m-d' ) === $birthday
        && ( false === $date_errors || ( 0 === $date_errors['warning_count'] && 0 === $date_errors['error_count'] ) );
    if ( ! $valid_birthday ) {
        $errors->add( 'cr2026_registration_birthday', __( 'Introduce una fecha de nacimiento válida.', 'crios-rango-2026' ) );
    }

    if ( '' === $password ) {
        $errors->add( 'cr2026_registration_password', __( 'Por favor, introduce una contraseña.', 'crios-rango-2026' ) );
    } elseif ( $password !== $confirmation ) {
        $errors->add( 'cr2026_registration_password_confirmation', __( 'Las contraseñas no coinciden.', 'crios-rango-2026' ) );
    }

    return $errors;
}
add_action( 'woocommerce_register_post', 'cr2026_account_validate_registration_fields', 10, 3 );

/** Persist profile values on the customer WooCommerce has just created. */
function cr2026_account_save_registration_profile( $customer_id, $new_customer_data = array(), $password_generated = false ) {
    $customer_id = absint( $customer_id );
    if ( ! $customer_id ) {
        return;
    }

    $first_name = isset( $_POST['first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['first_name'] ) ) : '';
    $last_name  = isset( $_POST['last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['last_name'] ) ) : '';
    $phone      = isset( $_POST['phone'] ) ? sanitize_text_field( wp_unslash( $_POST['phone'] ) ) : '';
    $birthday   = isset( $_POST['birthday'] ) ? sanitize_text_field( wp_unslash( $_POST['birthday'] ) ) : '';

    wp_update_user( array(
        'ID'         => $customer_id,
        'first_name' => $first_name,
        'last_name'  => $last_name,
    ) );
    update_user_meta( $customer_id, 'billing_first_name', $first_name );
    update_user_meta( $customer_id, 'billing_last_name', $last_name );
    update_user_meta( $customer_id, 'billing_phone', $phone );
    update_user_meta( $customer_id, 'criosrango_birth_date', $birthday );
}
add_action( 'woocommerce_created_customer', 'cr2026_account_save_registration_profile', 10, 3 );

