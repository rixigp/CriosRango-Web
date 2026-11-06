<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function cr2026_asset_version( $relative_path ) {
    $path = CR2026_DIR . '/' . ltrim( $relative_path, '/' );
    return file_exists( $path ) ? (string) filemtime( $path ) : CR2026_VERSION;
}

function cr2026_enqueue_assets() {
    $uses_app_category_components = is_front_page()
        || ( function_exists( 'is_shop' ) && is_shop() )
        || ( function_exists( 'is_product_category' ) && is_product_category() );

    $uses_product_detail_skin = function_exists( 'is_product' ) && is_product();

    $main_style_dependencies = array();

    if ( $uses_product_detail_skin ) {
        wp_enqueue_style(
            'cr2026-roboto',
            'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&display=swap',
            array(),
            null
        );
        $main_style_dependencies[] = 'cr2026-roboto';
    }

    if ( $uses_app_category_components ) {
        wp_enqueue_style(
            'cr2026-roboto',
            'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&display=swap',
            array(),
            null
        );
        $main_style_dependencies[] = 'cr2026-roboto';
    }

    wp_enqueue_style(
        'cr2026-main',
        CR2026_URI . '/assets/css/main.css',
        $main_style_dependencies,
        cr2026_asset_version( 'assets/css/main.css' )
    );

    if ( $uses_product_detail_skin ) {
        wp_enqueue_style(
            'cr2026-product-detail-skin',
            CR2026_URI . '/assets/css/product-detail-skin.css',
            array( 'cr2026-main', 'cr2026-roboto' ),
            cr2026_asset_version( 'assets/css/product-detail-skin.css' )
        );
    }

    if ( function_exists( 'is_product_category' ) && is_product_category() ) {
        $outlet_term = get_queried_object();
        if ( $outlet_term instanceof WP_Term && in_array( (int) $outlet_term->term_id, array( 446, 475, 447, 476, 449, 478, 448, 477 ), true ) ) {
            wp_enqueue_style(
                'cr2026-outlet-bubbles',
                CR2026_URI . '/assets/css/outlet-bubbles.css',
                array( 'cr2026-main' ),
                cr2026_asset_version( 'assets/css/outlet-bubbles.css' )
            );
        }
    }

    wp_enqueue_script(
        'cr2026-main',
        CR2026_URI . '/assets/js/main.js',
        array(),
        cr2026_asset_version( 'assets/js/main.js' ),
        true
    );

    wp_localize_script( 'cr2026-main', 'CR2026', array(
        'menuLabelOpen'  => __( 'Abrir menú', 'crios-rango-2026' ),
        'menuLabelClose' => __( 'Cerrar menú', 'crios-rango-2026' ),
    ) );

    if ( $uses_product_detail_skin ) {
        wp_enqueue_script(
            'cr2026-product-ui-enhancements',
            CR2026_URI . '/assets/js/product-ui-enhancements.js',
            array( 'jquery' ),
            cr2026_asset_version( 'assets/js/product-ui-enhancements.js' ),
            true
        );
    }
}
add_action( 'wp_enqueue_scripts', 'cr2026_enqueue_assets', 30 );
