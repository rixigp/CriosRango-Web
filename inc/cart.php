<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Handle the explicit empty-cart action with a POST nonce, never a GET link. */
function cr2026_handle_empty_cart() {
    if ( ! function_exists( 'is_cart' ) || ! is_cart() || empty( $_POST['cr2026_empty_cart'] ) ) {
        return;
    }

    $nonce = isset( $_POST['cr2026_empty_cart_nonce'] )
        ? sanitize_text_field( wp_unslash( $_POST['cr2026_empty_cart_nonce'] ) )
        : '';

    if ( ! $nonce || ! wp_verify_nonce( $nonce, 'cr2026_empty_cart' ) ) {
        wp_die(
            esc_html__( 'La solicitud para vaciar el carrito ha caducado. Recarga la página e inténtalo de nuevo.', 'crios-rango-2026' ),
            esc_html__( 'Solicitud no válida', 'crios-rango-2026' ),
            array( 'response' => 403 )
        );
    }

    if ( function_exists( 'WC' ) && WC() && WC()->cart ) {
        WC()->cart->empty_cart();
    }

    wp_safe_redirect( wc_get_cart_url() );
    exit;
}
add_action( 'template_redirect', 'cr2026_handle_empty_cart', 1 );

/** Suppress WPLoyalty native cart notices only while rendering the cart. */
function cr2026_cart_disable_wployalty_messages( $enabled ) {
    return function_exists( 'is_cart' ) && is_cart() ? false : $enabled;
}
add_filter( 'wlr_is_cart_earn_message_enabled', 'cr2026_cart_disable_wployalty_messages', 10 );
add_filter( 'wlr_is_cart_redeem_message_enabled', 'cr2026_cart_disable_wployalty_messages', 10 );
