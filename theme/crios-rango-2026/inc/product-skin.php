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
    }
    return $classes;
}
add_filter( 'body_class', 'cr2026_product_skin_body_class' );

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

/** Replace the translated WooCommerce sale label only on product detail pages. */
function cr2026_product_skin_sale_label( $translation, $text, $domain ) {
    if ( is_product() && 'woocommerce' === $domain && in_array( $text, array( 'Sale!', '¡Oferta!' ), true ) ) {
        return 'OFERTA';
    }
    return $translation;
}
add_filter( 'gettext', 'cr2026_product_skin_sale_label', 20, 3 );
