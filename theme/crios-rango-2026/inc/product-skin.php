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

    $short_description = wp_kses_post( $short_description );

    // Strip legacy brand labels/values without touching independent composition text.
    $short_description = preg_replace(
        '~(?:<p[^>]*>\s*)?(?:<u>\s*)?Marca:\s*(?:</u>)?\s*[^<\r\n]*(?:\s*</p>)?~iu',
        '',
        $short_description
    );

    // Legacy sizing-help blocks are now rendered globally below the excerpt.
    $short_description = preg_replace_callback(
        '~<p\b[^>]*>.*?</p>~is',
        static function ( $paragraph ) {
            $text = html_entity_decode( wp_strip_all_tags( $paragraph[0] ), ENT_QUOTES, get_bloginfo( 'charset' ) );
            if ( preg_match( '~Pregunta por más tallas|criosrango@criosrango\.es|633\s*246\s*788|wa\.me/34633246788~iu', $text ) ) {
                return '';
            }
            return $paragraph[0];
        },
        $short_description
    );

    $short_description = preg_replace(
        '~^[ \t]*[^\r\n]*(?:Pregunta por más tallas|criosrango@criosrango\.es|633\s*246\s*788|wa\.me/34633246788)[^\r\n]*$~imu',
        '',
        $short_description
    );

    return force_balance_tags( $short_description );
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

    remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_title', 5 );
    remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_price', 10 );
    remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_excerpt', 20 );
    remove_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_brand', 22 );
    add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_title_price_brand', 5 );
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
add_action( 'woocommerce_after_add_to_cart_form', 'cr2026_product_skin_actions', 25 );

/** Replace the translated WooCommerce sale label only on product detail pages. */
function cr2026_product_skin_sale_label( $translation, $text, $domain ) {
    if ( is_product() && 'woocommerce' === $domain && in_array( $text, array( 'Sale!', '¡Oferta!' ), true ) ) {
        return 'OFERTA';
    }
    return $translation;
}
add_filter( 'gettext', 'cr2026_product_skin_sale_label', 20, 3 );


/** Render the native title, dynamic WooCommerce price and assigned WordPress brand in one row. */
function cr2026_product_skin_title_price_brand() {
    if ( ! is_product() ) { return; }
    echo '<div class="cr-product-title-brand-row">';
    echo '<div class="cr-product-title-brand-row__details">';
    woocommerce_template_single_title();
    woocommerce_template_single_price();
    echo '</div>';
    echo '<span class="cr-product-title-brand-row__divider" aria-hidden="true"></span>';
    echo '<div class="cr-product-title-brand-row__brand">';
    cr2026_product_skin_brand();
    echo '</div>';
    echo '</div>';
}

/** Render the assigned WordPress product_brand term as a centered native logo. */
function cr2026_product_skin_brand() {
    if ( ! is_product() || ! taxonomy_exists( 'product_brand' ) ) { return; }
    $product_id = absint( get_queried_object_id() );
    $terms = get_the_terms( $product_id, 'product_brand' );
    if ( is_wp_error( $terms ) || empty( $terms ) ) { return; }
    $brand = reset( $terms );
    if ( ! $brand instanceof WP_Term || 'product_brand' !== $brand->taxonomy ) { return; }
    $logo_url = function_exists( 'cr2026_home_brand_image_url' ) ? cr2026_home_brand_image_url( $brand ) : '';
    echo '<div class="cr-product-brand" aria-label="' . esc_attr__( 'Marca', 'crios-rango-2026' ) . '">';
    if ( $logo_url ) {
        echo '<img class="cr-product-brand__logo" src="' . esc_url( $logo_url ) . '" alt="' . esc_attr( $brand->name ) . '" loading="lazy" decoding="async">';
    } else {
        echo '<span class="cr-product-brand__name">' . esc_html( $brand->name ) . '</span>';
    }
    echo '</div>';
}


/** Render sizing assistance globally; duplicate legacy excerpt content is stripped above. */
function cr2026_product_skin_global_size_help() {
    if ( ! is_product() ) { return; }
    echo '<section class="cr-product-size-help" aria-labelledby="cr-product-size-help-title">';
    echo '<span class="cr-product-size-help__icon" aria-hidden="true"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10.5 20.8 4.8a4 4 0 0 1 5.1 2.4l1.3 3.5a4 4 0 0 1-2.4 5.1L9 21.5a4 4 0 0 1-5.1-2.4l-1.3-3.5A4 4 0 0 1 5 10.5Z" transform="translate(1 3) rotate(-12 16 16)"/><path d="m9 12 2 3m2-5 2 3m2-5 2 3m2-5 2 3"/></svg></span>';
    echo '<div class="cr-product-size-help__content">';
    echo '<h2 id="cr-product-size-help-title">Pregunta por más tallas!</h2>';
    echo '<p>Si la talla que necesitas, no se encuentra disponible, contacta con nosotros en <a href="mailto:criosrango@criosrango.es">criosrango@criosrango.es</a> o nuestro whatsapp <a href="https://wa.me/34633246788" target="_blank" rel="noopener noreferrer">633 246 788</a>.</p>';
    echo '</div>';
    echo '</section>';
}
add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 );

