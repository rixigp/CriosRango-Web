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
    add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
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

function cr2026_content_width() {
    $GLOBALS['content_width'] = 1280;
}
add_action( 'after_setup_theme', 'cr2026_content_width', 0 );
