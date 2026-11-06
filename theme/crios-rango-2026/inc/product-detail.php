<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

function cr2026_normalize_product_variation_image_urls( $variations ) {
    foreach ( $variations as &$variation ) {
        if ( empty( $variation['image'] ) || ! is_array( $variation['image'] ) ) { continue; }
        foreach ( array( 'src', 'full_src', 'gallery_thumbnail_src', 'thumb_src', 'srcset', 'data_src', 'data_large_image' ) as $key ) {
            if ( ! empty( $variation['image'][ $key ] ) && is_string( $variation['image'][ $key ] ) ) {
                $variation['image'][ $key ] = cr2026_normalize_public_upload_url( $variation['image'][ $key ] );
            }
        }
    }
    unset( $variation );
    return $variations;
}

function cr2026_product_size_sort_key( $value ) {
    $clean = strtoupper( preg_replace( '/\s+/', '', trim( (string) $value ) ) );
    if ( preg_match( '/M$/', $clean ) ) {
        $number = (int) preg_replace( '/M$/', '', $clean );
        return $number > 0 ? $number : 999;
    }
    if ( preg_match( '/A$/', $clean ) ) {
        $number = (int) preg_replace( '/A$/', '', $clean );
        return ( $number > 0 ? $number : 99 ) * 12;
    }
    $sizes = array( 'XXS' => 1000, 'XS' => 1001, 'S' => 1002, 'M' => 1003, 'L' => 1004, 'XL' => 1005, 'XXL' => 1006 );
    return isset( $sizes[ $clean ] ) ? $sizes[ $clean ] : 2000;
}

/**
 * Remove only loyalty promotional render callbacks from the classic single
 * product hooks. Points accrual, balances, cart and checkout integrations stay
 * active. The app-style template does not invoke the classic summary hooks.
 */
function cr2026_remove_product_loyalty_messages() {
    if ( is_admin() || ! function_exists( 'is_product' ) || ! is_product() ) { return; }
    global $wp_filter;
    $hooks = array(
        'woocommerce_single_product_summary',
        'woocommerce_before_add_to_cart_button',
        'woocommerce_after_single_product_summary',
    );
    $removed = array();
    foreach ( $hooks as $hook_name ) {
        if ( empty( $wp_filter[ $hook_name ] ) || ! $wp_filter[ $hook_name ] instanceof WP_Hook ) { continue; }
        foreach ( $wp_filter[ $hook_name ]->callbacks as $priority => $items ) {
            foreach ( $items as $item ) {
                if ( empty( $item['function'] ) ) { continue; }
                $name = strtolower( cr2026_callable_name( $item['function'] ) );
                if (
                    false === strpos( $name, 'wployalty' ) &&
                    false === strpos( $name, 'wlr' ) &&
                    false === strpos( $name, 'wc_points_rewards' )
                ) { continue; }
                remove_action( $hook_name, $item['function'], (int) $priority );
                $removed[] = array( 'hook' => $hook_name, 'callback' => cr2026_callable_name( $item['function'] ) );
            }
        }
    }
    $GLOBALS['cr2026_product_loyalty_removed_callbacks'] = $removed;
}
add_action( 'wp', 'cr2026_remove_product_loyalty_messages', 100 );

/** Classic WooCommerce gallery controls conflict with the app swipe gallery. */
function cr2026_disable_classic_product_gallery_support() {
    if ( function_exists( 'is_product' ) && is_product() ) {
        remove_theme_support( 'wc-product-gallery-zoom' );
        remove_theme_support( 'wc-product-gallery-lightbox' );
        remove_theme_support( 'wc-product-gallery-slider' );
    }
}
add_action( 'wp', 'cr2026_disable_classic_product_gallery_support', 1 );
