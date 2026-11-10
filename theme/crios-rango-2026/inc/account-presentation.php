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


/** Identify the existing Help/FAQ/Contact page selected by the Account home. */
function cr2026_account_is_help_page() {
    return function_exists( 'is_page' ) && is_page( array( 'ayuda', 'preguntas-frecuentes', 'contacto' ) );
}

function cr2026_account_help_body_class( $classes ) {
    if ( cr2026_account_is_help_page() ) {
        $classes[] = 'cr-account-help-page';
    }
    return $classes;
}
add_filter( 'body_class', 'cr2026_account_help_body_class' );

/**
 * Add only contact channels not already present in the current page content.
 * The original contact form/content is retained unchanged after this panel.
 */
function cr2026_account_help_content( $content ) {
    if ( is_admin() || ! is_main_query() || ! in_the_loop() || ! cr2026_account_is_help_page() ) {
        return $content;
    }

    $plain  = wp_strip_all_tags( $content );
    $digits = preg_replace( '/\D+/', '', $plain );
    $cards  = array();

    if ( false === strpos( $digits, '633246788' ) ) {
        $cards[] = '<a class="cr-account-help__card" href="https://wa.me/34633246788"><span class="cr-account-help__icon" aria-hidden="true">WA</span><span><strong>' . esc_html__( 'WhatsApp', 'crios-rango-2026' ) . '</strong><small>' . esc_html__( '633 246 788', 'crios-rango-2026' ) . '</small></span><span class="cr-account-help__chevron" aria-hidden="true">›</span></a>';
    }

    if ( false === strpos( $digits, '969091236' ) ) {
        $cards[] = '<a class="cr-account-help__card" href="tel:+34969091236"><span class="cr-account-help__icon" aria-hidden="true">☎</span><span><strong>' . esc_html__( 'Teléfono', 'crios-rango-2026' ) . '</strong><small>' . esc_html__( '969 091 236', 'crios-rango-2026' ) . '</small></span><span class="cr-account-help__chevron" aria-hidden="true">›</span></a>';
    }

    if ( false === stripos( $plain, 'criosrango@criosrango.es' ) ) {
        $cards[] = '<a class="cr-account-help__card" href="mailto:criosrango@criosrango.es"><span class="cr-account-help__icon" aria-hidden="true">@</span><span><strong>' . esc_html__( 'Correo electrónico', 'crios-rango-2026' ) . '</strong><small>criosrango@criosrango.es</small></span><span class="cr-account-help__chevron" aria-hidden="true">›</span></a>';
    }

    $has_hours = false !== stripos( $plain, 'horario' ) || preg_match( '/\b\d{1,2}:\d{2}\b/', $plain );
    if ( ! $has_hours ) {
        $cards[] = '<div class="cr-account-help__hours"><strong>' . esc_html__( 'Horario de tienda', 'crios-rango-2026' ) . '</strong><p><span>' . esc_html__( 'Lunes a viernes', 'crios-rango-2026' ) . '</span><span>10:00–13:30 · 17:30–21:00</span></p><p><span>' . esc_html__( 'Sábado', 'crios-rango-2026' ) . '</span><span>10:00–13:30</span></p><p><span>' . esc_html__( 'Domingo', 'crios-rango-2026' ) . '</span><span>' . esc_html__( 'Cerrado', 'crios-rango-2026' ) . '</span></p></div>';
    }

    if ( empty( $cards ) ) {
        return $content;
    }

    ob_start();
    cr2026_account_render_endpoint_toolbar( __( 'Ayuda', 'crios-rango-2026' ) );
    $toolbar = ob_get_clean();

    $panel = '<section class="cr-account-help" aria-label="' . esc_attr__( 'Contacto y ayuda', 'crios-rango-2026' ) . '">'
        . $toolbar
        . '<div class="cr-account-help__grid">' . implode( '', $cards ) . '</div>'
        . '</section>';

    return $panel . $content;
}
add_filter( 'the_content', 'cr2026_account_help_content', 20 );
