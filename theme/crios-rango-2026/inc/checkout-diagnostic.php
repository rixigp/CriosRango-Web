<?php
/**
 * TEMPORARY, read-only WooCommerce checkout diagnostics.
 * Remove this file and its functions.php include after collecting runtime evidence.
 */
defined( 'ABSPATH' ) || exit;

function cr2026_checkout_diag_requested() {
    return isset( $_GET['cr_checkout_diag'] )
        && '1' === sanitize_text_field( wp_unslash( $_GET['cr_checkout_diag'] ) )
        && function_exists( 'is_checkout' )
        && is_checkout()
        && ( ! function_exists( 'is_order_received_page' ) || ! is_order_received_page() )
        && current_user_can( 'manage_woocommerce' );
}

function cr2026_checkout_diag_no_cache() {
    if ( cr2026_checkout_diag_requested() ) {
        nocache_headers();
    }
}
add_action( 'template_redirect', 'cr2026_checkout_diag_no_cache', 0 );

function cr2026_checkout_diag_render() {
    if ( ! cr2026_checkout_diag_requested() || ! function_exists( 'WC' ) || ! WC() ) {
        return;
    }

    $registered = array();
    $enabled    = array();
    $available  = array();
    $statuses   = array();
    $gateway_manager = WC()->payment_gateways();

    foreach ( $gateway_manager->payment_gateways() as $gateway_id => $gateway ) {
        $id = sanitize_key( $gateway_id );
        $is_enabled = isset( $gateway->enabled ) && 'yes' === $gateway->enabled;
        $is_available = null;

        try {
            $is_available = (bool) $gateway->is_available();
        } catch ( Throwable $error ) {
            $is_available = false;
        }

        $registered[] = $id;
        if ( $is_enabled ) {
            $enabled[] = $id;
        }
        $statuses[ $id ] = array(
            'gateway_id'  => $id,
            'enabled'     => $is_enabled,
            'is_available' => $is_available,
        );
    }

    foreach ( $gateway_manager->get_available_payment_gateways() as $gateway_id => $gateway ) {
        $available[] = sanitize_key( $gateway_id );
    }

    $shipping_methods = array();
    if ( WC()->shipping() ) {
        foreach ( WC()->shipping()->get_packages() as $package_id => $package ) {
            if ( empty( $package['rates'] ) || ! is_array( $package['rates'] ) ) {
                continue;
            }
            foreach ( $package['rates'] as $rate_id => $rate ) {
                $method_id = is_object( $rate ) && method_exists( $rate, 'get_method_id' )
                    ? $rate->get_method_id()
                    : '';
                $shipping_methods[] = array(
                    'package_id' => (int) $package_id,
                    'rate_id'    => sanitize_text_field( (string) $rate_id ),
                    'method_id'  => sanitize_key( $method_id ),
                );
            }
        }
    }

    $chosen_shipping = WC()->session
        ? WC()->session->get( 'chosen_shipping_methods', array() )
        : array();

    $diagnostic = array(
        'registered_gateways' => $registered,
        'enabled_gateways' => $enabled,
        'available_gateways' => $available,
        'gateway_status' => $statuses,
        'chosen_shipping_method' => array_values( array_map( 'sanitize_text_field', (array) $chosen_shipping ) ),
        'available_shipping_methods' => $shipping_methods,
        'cart_total' => WC()->cart ? (string) WC()->cart->get_total( 'edit' ) : null,
        'currency' => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : null,
    );

    echo '<details id="cr-checkout-runtime-diagnostic" open><summary>CR Checkout runtime diagnostic (admin only)</summary>';
    echo '<pre id="cr-checkout-runtime-diagnostic-data">' . esc_html( wp_json_encode( $diagnostic, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) ) . '</pre>';
    echo '</details>';
}
add_action( 'wp_footer', 'cr2026_checkout_diag_render', 99 );
