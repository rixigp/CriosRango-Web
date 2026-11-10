<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Presentation-only toolbar for native WooCommerce account endpoints.
 * WPLoyalty and WooCommerce continue to own their data and endpoint actions.
 */
function cr2026_account_render_endpoint_toolbar( $title ) {
    if ( ! function_exists( 'wc_get_page_permalink' ) ) {
        return;
    }

    echo '<div class="cr-account-endpoint-toolbar">'
        . '<a class="cr-account-endpoint-toolbar__back" href="' . esc_url( wc_get_page_permalink( 'myaccount' ) ) . '" aria-label="' . esc_attr__( 'Volver a Cuenta', 'crios-rango-2026' ) . '">'
        . '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7"></path></svg>'
        . '</a><h1>' . esc_html( $title ) . '</h1></div>';
}

/** Add the title before WPLoyalty renders its native reward page. */
function cr2026_account_loyalty_endpoint_toolbar() {
    if ( function_exists( 'is_account_page' ) && is_account_page()
        && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'loyalty_reward' ) ) {
        cr2026_account_render_endpoint_toolbar( __( 'Cupones y promociones', 'crios-rango-2026' ) );
    }
}
add_action( 'woocommerce_account_loyalty_reward_endpoint', 'cr2026_account_loyalty_endpoint_toolbar', 1 );


/** Native WooCommerce profile endpoint toolbar and section labels. */
function cr2026_account_profile_endpoint_toolbar() {
    if ( function_exists( 'is_account_page' ) && is_account_page() ) {
        cr2026_account_render_endpoint_toolbar( __( 'Perfil', 'crios-rango-2026' ) );
    }
}
add_action( 'woocommerce_account_edit-account_endpoint', 'cr2026_account_profile_endpoint_toolbar', 1 );

function cr2026_account_profile_personal_heading() {
    echo '<h2 class="cr-account-profile__section-title">' . esc_html__( 'Datos personales', 'crios-rango-2026' ) . '</h2>';
}
add_action( 'woocommerce_before_edit_account_form', 'cr2026_account_profile_personal_heading', 1 );

/** Preserve native address editing and link to the shipping-address endpoint. */
function cr2026_account_profile_address_link() {
    if ( ! function_exists( 'wc_get_endpoint_url' ) || ! function_exists( 'wc_get_page_permalink' )
        || ! function_exists( 'wc_shipping_enabled' ) || ! wc_shipping_enabled()
        || ( function_exists( 'wc_ship_to_billing_address_only' ) && wc_ship_to_billing_address_only() ) ) {
        return;
    }

    $url = wc_get_endpoint_url( 'edit-address', 'shipping', wc_get_page_permalink( 'myaccount' ) );
    echo '<a class="cr-account-profile__address" href="' . esc_url( $url ) . '">'
        . '<span><strong>' . esc_html__( 'Dirección de entrega', 'crios-rango-2026' ) . '</strong>'
        . '<small>' . esc_html__( 'Gestiona dónde recibes tus pedidos', 'crios-rango-2026' ) . '</small></span>'
        . '<span class="cr-account-profile__chevron" aria-hidden="true">›</span></a>';
}
add_action( 'woocommerce_after_edit_account_form', 'cr2026_account_profile_address_link', 15 );

/** Use WooCommerce's native logout URL; no custom session handling. */
function cr2026_account_profile_logout_link() {
    if ( function_exists( 'wc_logout_url' ) ) {
        echo '<a class="cr-account-profile__logout" href="' . esc_url( wc_logout_url() ) . '">' . esc_html__( 'Cerrar sesión', 'crios-rango-2026' ) . '</a>';
    }
}
add_action( 'woocommerce_after_edit_account_form', 'cr2026_account_profile_logout_link', 100 );

/** Native address editing stays on WooCommerce's edit-address endpoint. */
function cr2026_account_address_endpoint_toolbar() {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page() ) {
        return;
    }

    $address_type = (string) get_query_var( 'edit-address' );
    $title = 'shipping' === $address_type
        ? __( 'Dirección de entrega', 'crios-rango-2026' )
        : ( 'billing' === $address_type ? __( 'Dirección de facturación', 'crios-rango-2026' ) : __( 'Direcciones', 'crios-rango-2026' ) );

    cr2026_account_render_endpoint_toolbar( $title );
}
add_action( 'woocommerce_account_edit-address_endpoint', 'cr2026_account_address_endpoint_toolbar', 1 );
