<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

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
