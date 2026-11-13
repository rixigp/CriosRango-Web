<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function cr2026_asset_version( $relative_path ) {
    $path = CR2026_DIR . '/' . ltrim( $relative_path, '/' );
    return file_exists( $path ) ? (string) filemtime( $path ) : CR2026_VERSION;
}

function cr2026_enqueue_assets() {
    $uses_app_category_components = is_front_page()
        || ( function_exists( 'is_shop' ) && is_shop() )
        || ( function_exists( 'is_product_category' ) && is_product_category() )
        || ( function_exists( 'is_cart' ) && is_cart() );

    $uses_product_detail_skin = function_exists( 'is_product' ) && is_product();
    $uses_checkout_shell = function_exists( 'is_checkout' ) && is_checkout()
        && ( ! function_exists( 'is_order_received_page' ) || ! is_order_received_page() );
    $uses_payment_result_modal = $uses_checkout_shell
        || ( function_exists( 'is_cart' ) && is_cart() )
        || ( function_exists( 'is_order_received_page' ) && is_order_received_page() );

    $main_style_dependencies = array();

    if ( $uses_payment_result_modal ) {
        wp_enqueue_script(
            'cr2026-checkout-success-modal',
            CR2026_URI . '/assets/js/checkout-success-modal.js',
            array( 'jquery' ),
            cr2026_asset_version( 'assets/js/checkout-success-modal.js' ),
            true
        );
        wp_localize_script( 'cr2026-checkout-success-modal', 'CR2026CheckoutSuccess', array(
            'shopUrl' => function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : cr2026_shop_url(),
        ) );
        $payment_result_payload = function_exists( 'cr2026_checkout_payment_result_page_payload' )
            ? cr2026_checkout_payment_result_page_payload() : null;
        if ( is_array( $payment_result_payload ) ) {
            wp_add_inline_script(
                'cr2026-checkout-success-modal',
                'window.CR2026CheckoutSuccess = Object.assign(window.CR2026CheckoutSuccess || {}, ' . wp_json_encode( array( 'result' => $payment_result_payload ) ) . ');',
                'before'
            );
        }
    }

    if ( $uses_product_detail_skin ) {
        wp_enqueue_style(
            'cr2026-roboto',
            'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&display=swap',
            array(),
            null
        );
        $main_style_dependencies[] = 'cr2026-roboto';
    }

    if ( $uses_app_category_components || $uses_checkout_shell ) {
        wp_enqueue_style(
            'cr2026-roboto',
            'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&display=swap',
            array(),
            null
        );
        $main_style_dependencies[] = 'cr2026-roboto';
    }

    wp_enqueue_style(
        'cr2026-main',
        CR2026_URI . '/assets/css/main.css',
        $main_style_dependencies,
        cr2026_asset_version( 'assets/css/main.css' )
    );

    $uses_account_app_skin = function_exists( 'is_account_page' ) && is_account_page();
    $uses_account_app_skin = $uses_account_app_skin
        || ( function_exists( 'is_page' ) && is_page( array( 'ayuda', 'preguntas-frecuentes', 'contacto' ) ) );

    if ( $uses_account_app_skin ) {
        wp_enqueue_style(
            'cr2026-account',
            CR2026_URI . '/assets/css/account.css',
            array( 'cr2026-main' ),
            cr2026_asset_version( 'assets/css/account.css' )
        );
    }

 
    if ( $uses_account_app_skin && function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) {
        wp_enqueue_script(
            'cr2026-account-save-feedback',
            CR2026_URI . '/assets/js/account-save-feedback.js',
            array(),
            cr2026_asset_version( 'assets/js/account-save-feedback.js' ),
            true
        );
    }

    if ( function_exists( 'is_account_page' ) && is_account_page()
        && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'orders' ) ) {
        wp_enqueue_script(
            'cr2026-account-orders',
            CR2026_URI . '/assets/js/account-orders.js',
            array(),
            cr2026_asset_version( 'assets/js/account-orders.js' ),
            true
        );
    }

    if ( function_exists( 'is_account_page' ) && is_account_page()
        && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'loyalty_reward' )
        && function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) {
        wp_enqueue_script(
            'cr2026-account-loyalty',
            CR2026_URI . '/assets/js/account-loyalty.js',
            array(),
            cr2026_asset_version( 'assets/js/account-loyalty.js' ),
            true
        );
        wp_localize_script( 'cr2026-account-loyalty', 'CR2026AccountLoyalty', array(
            'loyaltyUrl' => rest_url( 'criosrango/v1/loyalty' ),
            'promotionsUrl' => rest_url( 'criosrango/v1/promotions' ),
            'storeCartUrl' => rest_url( 'wc/store/v1/cart' ),
            'applyCouponUrl' => rest_url( 'wc/store/v1/cart/apply-coupon' ),
            'wpRestNonce' => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',
            'storeNonce' => wp_create_nonce( 'wc_store_api' ),
            'currency' => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'EUR',
            'authenticated' => is_user_logged_in(),
        ) );
    }

    if ( $uses_checkout_shell ) {
        wp_enqueue_style(
            'cr2026-checkout',
            CR2026_URI . '/assets/css/checkout.css',
            array( 'cr2026-main', 'cr2026-roboto' ),
            cr2026_asset_version( 'assets/css/checkout.css' )
        );
        wp_enqueue_script(
            'cr2026-checkout-additional-info',
            CR2026_URI . '/assets/js/checkout-additional-info.js',
            array(),
            cr2026_asset_version( 'assets/js/checkout-additional-info.js' ),
            true
        );
        wp_enqueue_script(
            'cr2026-checkout-payment',
            CR2026_URI . '/assets/js/checkout-payment.js',
            array(),
            cr2026_asset_version( 'assets/js/checkout-payment.js' ),
            true
        );

    }

    if ( $uses_product_detail_skin ) {
        wp_enqueue_style(
            'cr2026-product-detail-skin',
            CR2026_URI . '/assets/css/product-detail-skin.css',
            array( 'cr2026-main', 'cr2026-roboto' ),
            cr2026_asset_version( 'assets/css/product-detail-skin.css' )
        );
    }

    if ( function_exists( 'is_product_category' ) && is_product_category() ) {
        $outlet_term = get_queried_object();
        if ( $outlet_term instanceof WP_Term && in_array( (int) $outlet_term->term_id, array( 446, 475, 447, 476, 449, 478, 448, 477 ), true ) ) {
            wp_enqueue_style(
                'cr2026-outlet-bubbles',
                CR2026_URI . '/assets/css/outlet-bubbles.css',
                array( 'cr2026-main' ),
                cr2026_asset_version( 'assets/css/outlet-bubbles.css' )
            );
        }
    }

    wp_enqueue_script(
        'cr2026-main',
        CR2026_URI . '/assets/js/main.js',
        array(),
        cr2026_asset_version( 'assets/js/main.js' ),
        true
    );

    wp_localize_script( 'cr2026-main', 'CR2026', array(
        'menuLabelOpen'  => __( 'Abrir menú', 'crios-rango-2026' ),
        'menuLabelClose' => __( 'Cerrar menú', 'crios-rango-2026' ),
    ) );

    if ( function_exists( 'is_cart' ) && is_cart() ) {
        wp_enqueue_style(
            'cr2026-cart',
            CR2026_URI . '/assets/css/cart.css',
            array( 'cr2026-main' ),
            cr2026_asset_version( 'assets/css/cart.css' )
        );
        wp_enqueue_script(
            'cr2026-cart-ui',
            CR2026_URI . '/assets/js/cart-ui.js',
            array(),
            cr2026_asset_version( 'assets/js/cart-ui.js' ),
            true
        );
        wp_localize_script( 'cr2026-cart-ui', 'CR2026Cart', array(
            'promotionsUrl' => rest_url( 'criosrango/v1/promotions' ),
            'loyaltyUrl' => rest_url( 'criosrango/v1/loyalty' ),
            'redeemUrl' => rest_url( 'criosrango/v1/loyalty/redeem' ),
            'storeCartUrl' => rest_url( 'wc/store/v1/cart' ),
            'applyCouponUrl' => rest_url( 'wc/store/v1/cart/apply-coupon' ),
            'removeCouponUrl' => rest_url( 'wc/store/v1/cart/remove-coupon' ),
            'storeNonce' => wp_create_nonce( 'wc_store_api' ),
            'wpRestNonce' => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',
            'authenticated' => is_user_logged_in(),
            'currency' => get_woocommerce_currency(),
        ) );
    }

    if ( $uses_product_detail_skin ) {
        wp_enqueue_script(
            'cr2026-product-ui-enhancements',
            CR2026_URI . '/assets/js/product-ui-enhancements.js',
            array( 'jquery', 'wc-add-to-cart', 'wc-cart-fragments' ),
            cr2026_asset_version( 'assets/js/product-ui-enhancements.js' ),
            true
        );
    }
}
add_action( 'wp_enqueue_scripts', 'cr2026_enqueue_assets', 30 );
