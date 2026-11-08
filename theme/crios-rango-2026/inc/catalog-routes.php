<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Register the app catalogue destinations without requiring CMS page records. */
function cr2026_register_catalog_routes() {
    add_rewrite_rule( '^novedades/?$', 'index.php?cr2026_novelties=1', 'top' );
    add_rewrite_rule( '^marcas/?$', 'index.php?cr2026_brands_index=1', 'top' );

    // Flush once after these routes are introduced; never on every request.
    if ( '1' !== get_option( 'cr2026_catalog_routes_v1' ) ) {
        flush_rewrite_rules( false );
        update_option( 'cr2026_catalog_routes_v1', '1', false );
    }
}
add_action( 'init', 'cr2026_register_catalog_routes', 20 );

function cr2026_catalog_route_query_vars( $vars ) {
    $vars[] = 'cr2026_novelties';
    $vars[] = 'cr2026_brands_index';
    return $vars;
}
add_filter( 'query_vars', 'cr2026_catalog_route_query_vars' );

function cr2026_catalog_route_skip_404( $preempt, $query ) {
    if ( $query instanceof WP_Query && ( $query->get( 'cr2026_novelties' ) || $query->get( 'cr2026_brands_index' ) ) ) {
        $query->is_404 = false;
        return true;
    }
    return $preempt;
}
add_filter( 'pre_handle_404', 'cr2026_catalog_route_skip_404', 10, 2 );

function cr2026_catalog_route_template( $template ) {
    if ( get_query_var( 'cr2026_novelties' ) ) {
        return CR2026_DIR . '/archive-product.php';
    }
    if ( get_query_var( 'cr2026_brands_index' ) ) {
        return CR2026_DIR . '/page-marcas.php';
    }
    return $template;
}
add_filter( 'template_include', 'cr2026_catalog_route_template', 99 );
