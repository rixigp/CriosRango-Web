<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function cr2026_setup() {
    load_theme_textdomain( 'crios-rango-2026', CR2026_DIR . '/languages' );

    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    add_theme_support( 'responsive-embeds' );
    add_theme_support( 'align-wide' );
    add_theme_support( 'editor-styles' );
    add_theme_support( 'html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
    ) );

    add_theme_support( 'custom-logo', array(
        'height'      => 180,
        'width'       => 520,
        'flex-height' => true,
        'flex-width'  => true,
    ) );

    add_theme_support( 'woocommerce' );
    add_theme_support( 'wc-product-gallery-zoom' );
    add_theme_support( 'wc-product-gallery-lightbox' );
    add_theme_support( 'wc-product-gallery-slider' );

    register_nav_menus( array(
        'primary' => __( 'Menú principal', 'crios-rango-2026' ),
        'footer'  => __( 'Menú del pie', 'crios-rango-2026' ),
    ) );
}
add_action( 'after_setup_theme', 'cr2026_setup' );

/**
 * The new 2026 shell must not inherit WooCommerce's legacy site-wide Store
 * Notice. Remove its core output callback at the source; no CSS suppression.
 */
function cr2026_remove_legacy_woocommerce_store_notice() {
    if ( function_exists( 'woocommerce_demo_store' ) ) {
        remove_action( 'wp_body_open', 'woocommerce_demo_store', 10 );
    }
}
add_action( 'wp', 'cr2026_remove_legacy_woocommerce_store_notice', 0 );

function cr2026_content_width() {
    $GLOBALS['content_width'] = 1280;
}
add_action( 'after_setup_theme', 'cr2026_content_width', 0 );

/**
 * WordPress añade sizes="auto" a imágenes lazy y puede aplicar un
 * contain-intrinsic-size muy grande mientras la imagen no está disponible.
 *
 * En la Home tenemos imágenes de categorías lazy. En staging algunas están
 * temporalmente rotas/no disponibles, por lo que desactivamos auto-sizes
 * únicamente en la portada para impedir cambios artificiales de layout.
 */
function cr2026_disable_auto_sizes_on_home( $enabled ) {
    if ( is_front_page() ) {
        return false;
    }

    return $enabled;
}
add_filter( 'wp_img_tag_add_auto_sizes', 'cr2026_disable_auto_sizes_on_home' );
