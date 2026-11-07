<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * App presentation shell around the existing WooCommerce single-product flow.
 * No template replacement, product data rewriting, or custom JS is introduced.
 */
function cr2026_product_skin_body_class( $classes ) {
    if ( function_exists( 'is_product' ) && is_product() ) {
        $classes[] = 'cr-product-detail-app';

        if ( function_exists( 'WC' ) && WC()->session ) {
            $feedback = WC()->session->get( 'cr2026_product_added_feedback' );
            if ( is_array( $feedback ) ) {
                $feedback_product_id = isset( $feedback['product_id'] ) ? absint( $feedback['product_id'] ) : 0;
                $feedback_created_at = isset( $feedback['created_at'] ) ? absint( $feedback['created_at'] ) : 0;
                if ( $feedback_product_id === absint( get_queried_object_id() ) && $feedback_created_at > 0 && time() - $feedback_created_at <= 30 ) {
                    $classes[] = 'cr-product-added-to-cart';
                }
                WC()->session->__unset( 'cr2026_product_added_feedback' );
            }
        }
    }
    return $classes;
}
add_filter( 'body_class', 'cr2026_product_skin_body_class' );

/**
 * Sanitize and contain WooCommerce's product short description before it is
 * inserted into the single-product DOM. Balancing after KSES ensures malformed
 * allowed markup cannot escape the excerpt and wrap following product controls.
 */
function cr2026_product_skin_sanitize_short_description( $short_description ) {
    if ( ! function_exists( 'is_product' ) || ! is_product() || ! is_string( $short_description ) ) {
        return $short_description;
    }

    return force_balance_tags( wp_kses_post( $short_description ) );
}
add_filter( 'woocommerce_short_description', 'cr2026_product_skin_sanitize_short_description', 20 );

/** Mark a successful native single-product POST so the CTA can confirm after its redirect. */
function cr2026_product_skin_mark_added_feedback( $cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data ) {
    if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
        return;
    }
    $referer = wp_get_referer();
    if ( ! $referer || absint( url_to_postid( $referer ) ) !== absint( $product_id ) ) {
        return;
    }
    if ( function_exists( 'WC' ) && WC()->session ) {
        WC()->session->set( 'cr2026_product_added_feedback', array(
            'product_id' => absint( $product_id ),
            'variation_id' => absint( $variation_id ),
            'created_at' => time(),
        ) );
    }
}
add_action( 'woocommerce_add_to_cart', 'cr2026_product_skin_mark_added_feedback', 10, 6 );

/** Remove only WooCommerce's successful add-to-cart notice on Product Detail; errors remain native. */
function cr2026_product_skin_suppress_success_notice( $message, $products ) {
    return is_product() ? '' : $message;
}
add_filter( 'wc_add_to_cart_message_html', 'cr2026_product_skin_suppress_success_notice', 10, 2 );

/** Toolbar uses the already-approved category toolbar presentation classes. */
function cr2026_product_skin_toolbar() {
    if ( ! is_product() ) {
        return;
    }
    $product = wc_get_product( get_queried_object_id() );
    if ( ! $product instanceof WC_Product ) {
        return;
    }
    echo '<div class="cr-product-detail-toolbar cr-parent-category__toolbar">';
    echo '<a class="cr-parent-category__back" href="' . esc_url( cr2026_shop_url() ) . '" aria-label="' . esc_attr__( 'Volver a la tienda', 'crios-rango-2026' ) . '">' . cr2026_icon( 'arrow' ) . '</a>';
    echo '<h1 class="cr-parent-category__title">' . esc_html( $product->get_name() ) . '</h1>';
    echo '</div>';
}
add_action( 'woocommerce_before_single_product', 'cr2026_product_skin_toolbar', 5 );

/** Remove legacy-only presentation while preserving product content and data. */
function cr2026_product_skin_remove_legacy_presentation() {
    if ( ! is_product() ) {
        return;
    }

    remove_action( 'woocommerce_before_main_content', 'woocommerce_breadcrumb', 20 );
    remove_action( 'woocommerce_sidebar', 'woocommerce_get_sidebar', 10 );

    // Move the native sale flash after the native gallery output (priority 20).
    remove_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_sale_flash', 10 );
    add_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_sale_flash', 30 );

    remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_meta', 40 );
    remove_action( 'woocommerce_after_single_product_summary', 'woocommerce_upsell_display', 15 );
    remove_action( 'woocommerce_after_single_product_summary', 'woocommerce_output_related_products', 20 );
}
add_action( 'wp', 'cr2026_product_skin_remove_legacy_presentation', 100 );


/** Additive APP actions; product/cart behavior remains native WooCommerce. */
function cr2026_product_skin_actions() {
    if ( ! is_product() ) {
        return;
    }
    $product = wc_get_product( get_queried_object_id() );
    if ( ! $product instanceof WC_Product ) {
        return;
    }
    $reserve_enabled = $product->is_type( 'variable' )
        ? false
        : ( $product->is_purchasable() && $product->is_in_stock() );
    echo '<div class="cr-product-actions" data-product-name="' . esc_attr( $product->get_name() ) . '" data-product-url="' . esc_url( get_permalink( $product->get_id() ) ) . '">';
    echo '<button type="button" class="cr-product-actions__button cr-product-share" aria-label="' . esc_attr__( 'Compartir producto', 'crios-rango-2026' ) . '">' . cr2026_icon( 'share', 'cr-product-actions__icon' ) . '<span>Compartir</span></button>';
    echo '<button type="button" class="cr-product-actions__button cr-product-reserve" data-variable="' . ( $product->is_type( 'variable' ) ? '1' : '0' ) . '" ' . disabled( ! $reserve_enabled, true, false ) . '>' . cr2026_icon( 'message', 'cr-product-actions__icon' ) . '<span>Reservarlo</span></button>';
    echo '</div>';
}
add_action( 'woocommerce_before_single_product_summary', 'cr2026_product_skin_actions', 25 );

/** Replace the translated WooCommerce sale label only on product detail pages. */
function cr2026_product_skin_sale_label( $translation, $text, $domain ) {
    if ( is_product() && 'woocommerce' === $domain && in_array( $text, array( 'Sale!', '¡Oferta!' ), true ) ) {
        return 'OFERTA';
    }
    return $translation;
}
add_filter( 'gettext', 'cr2026_product_skin_sale_label', 20, 3 );
