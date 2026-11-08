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

/** Disable WPLoyalty messages whose filters are cart-specific and run during init. */
function cr2026_cart_disable_wployalty_messages( $enabled ) {
    return false;
}
add_filter( 'wlr_is_cart_earn_message_enabled', 'cr2026_cart_disable_wployalty_messages', 10 );
add_filter( 'wlr_is_cart_redeem_message_enabled', 'cr2026_cart_disable_wployalty_messages', 10 );

/** Normalize the cart's WooCommerce attachment image to the public uploads URL. */
function cr2026_cart_product_image_attributes( $attr, $attachment, $size ) {
    if ( ! function_exists( 'is_cart' ) || ! is_cart()
        || empty( $attr['class'] ) || false === strpos( $attr['class'], 'cr-cart-item__image-img' ) ) {
        return $attr;
    }
    $attachment_id = isset( $attachment->ID ) ? absint( $attachment->ID ) : 0;
    if ( ! $attachment_id ) { return $attr; }
    $canonical_url = cr2026_attachment_public_url( $attachment_id );
    if ( $canonical_url ) {
        $attr['src'] = $canonical_url;
        $uploads = wp_upload_dir();
        $home = wp_parse_url( home_url( '/' ) );
        if ( ! empty( $attr['srcset'] ) && ! empty( $uploads['baseurl'] )
            && ! empty( $home['scheme'] ) && ! empty( $home['host'] ) ) {
            $canonical_base = $home['scheme'] . '://' . $home['host'] . '/wp-content/uploads';
            $attr['srcset'] = str_replace( untrailingslashit( $uploads['baseurl'] ), $canonical_base, $attr['srcset'] );
        }
    }
    return $attr;
}
add_filter( 'wp_get_attachment_image_attributes', 'cr2026_cart_product_image_attributes', 20, 3 );


/**
 * Remove only WooCommerce's generic cart-updated success notice on the cart page.
 * Keep all errors and every other success/info notice intact.
 */
function cr2026_cart_remove_updated_success_notice() {
    if ( ! function_exists( 'is_cart' ) || ! is_cart()
        || ! function_exists( 'wc_get_notices' ) || ! function_exists( 'wc_set_notices' ) ) {
        return;
    }

    $notices = wc_get_notices();
    if ( empty( $notices['success'] ) || ! is_array( $notices['success'] ) ) {
        return;
    }

    $updated_message = trim( __( 'Cart updated.', 'woocommerce' ) );
    $removed = false;

    foreach ( $notices['success'] as $notice_key => $notice ) {
        if ( ! isset( $notice['notice'] ) || ! is_string( $notice['notice'] ) ) {
            continue;
        }

        if ( trim( wp_strip_all_tags( $notice['notice'] ) ) === $updated_message ) {
            unset( $notices['success'][ $notice_key ] );
            $removed = true;
        }
    }

    if ( $removed ) {
        wc_set_notices( $notices );
    }
}
add_action( 'wp', 'cr2026_cart_remove_updated_success_notice', 99 );
