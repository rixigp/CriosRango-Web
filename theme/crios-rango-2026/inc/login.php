<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * CR branding for WordPress authentication and password recovery screens.
 * Presentation only: native authentication form, handlers and security remain intact.
 */
function cr2026_login_enqueue_scripts() {
    $relative_logo = '/assets/images/brand/home_logo.png';
    $logo_url = CR2026_URI . $relative_logo;

    wp_enqueue_style(
        'cr2026-login',
        CR2026_URI . '/assets/css/login.css',
        array(),
        cr2026_asset_version( 'assets/css/login.css' )
    );

    wp_enqueue_style(
        'cr2026-login-roboto',
        'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap',
        array( 'cr2026-login' ),
        null
    );

    wp_add_inline_style(
        'cr2026-login',
        '.login h1 a{background-image:url("' . esc_url( $logo_url ) . '")!important;}'
    );
}
add_action( 'login_enqueue_scripts', 'cr2026_login_enqueue_scripts' );

function cr2026_login_header_url() {
    return home_url( '/' );
}
add_filter( 'login_headerurl', 'cr2026_login_header_url' );

function cr2026_login_header_text() {
    return 'Críos & Rango';
}
add_filter( 'login_headertext', 'cr2026_login_header_text' );

/**
 * Add a real, screen-reader accessible welcome heading without replacing
 * WordPress's native login, lost-password or reset-password form.
 */
function cr2026_login_welcome_message( $message ) {
    if ( ! empty( $message ) ) {
        return $message;
    }

    return '<div class="cr-login-welcome"><h1>Bienvenido de nuevo</h1><p>Accede a Críos &amp; Rango</p></div>';
}
add_filter( 'login_message', 'cr2026_login_welcome_message' );
