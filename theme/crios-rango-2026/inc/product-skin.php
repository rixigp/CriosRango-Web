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

/**
 * Resolve a stable Product Detail back destination without relying on the referrer.
 * A valid assigned primary category wins; otherwise use the deepest assigned term.
 */
function cr2026_product_skin_back_fallback_url( $product_id ) {
    $terms = get_the_terms( absint( $product_id ), 'product_cat' );
    if ( is_wp_error( $terms ) || empty( $terms ) ) {
        return cr2026_shop_url();
    }

    $assigned = array();
    foreach ( $terms as $term ) {
        if ( $term instanceof WP_Term && 'product_cat' === $term->taxonomy && ! is_wp_error( get_term_link( $term ) ) ) {
            $assigned[ $term->term_id ] = $term;
        }
    }
    if ( empty( $assigned ) ) {
        return cr2026_shop_url();
    }

    // Respect an SEO primary category only when it is genuinely assigned to this product.
    foreach ( array( '_yoast_wpseo_primary_product_cat', '_rank_math_primary_product_cat' ) as $primary_key ) {
        $primary_id = absint( get_post_meta( $product_id, $primary_key, true ) );
        if ( $primary_id && isset( $assigned[ $primary_id ] ) ) {
            $primary_url = get_term_link( $assigned[ $primary_id ] );
            if ( ! is_wp_error( $primary_url ) ) {
                return $primary_url;
            }
        }
    }

    // Stable tie-break: deepest hierarchy first, then lowest term ID.
    $ranked = array();
    foreach ( $assigned as $term ) {
        $ranked[] = array(
            'term' => $term,
            'depth' => count( get_ancestors( $term->term_id, 'product_cat', 'taxonomy' ) ),
        );
    }
    usort( $ranked, static function ( $left, $right ) {
        if ( $left['depth'] !== $right['depth'] ) {
            return $right['depth'] <=> $left['depth'];
        }
        return $left['term']->term_id <=> $right['term']->term_id;
    } );

    $fallback = get_term_link( $ranked[0]['term'] );
    return is_wp_error( $fallback ) ? cr2026_shop_url() : $fallback;
}

/** Only use browser history when the previous document is a real same-origin site page. */
function cr2026_product_skin_contextual_back_script() {
    if ( ! is_product() && ! is_tax( 'product_brand' ) ) { return; }
    ?>
    <script id="cr-contextual-back">
    (function () {
      var link = document.querySelector('.cr-parent-category__back[data-fallback-url]');
      if (!link) return;
      link.addEventListener('click', function (event) {
        var referrer = document.referrer;
        if (!referrer || window.history.length < 2) return;
        try {
          var previous = new URL(referrer);
          var basePath = link.getAttribute('data-site-path') || '/';
          var current = window.location;
          var insideSite = previous.origin === current.origin &&
            (basePath === '/' || previous.pathname === basePath.replace(/\/$/, '') || previous.pathname.indexOf(basePath.replace(/\/$/, '') + '/') === 0);
          var isDifferentPage = previous.pathname !== current.pathname;
          if (insideSite && isDifferentPage) {
            event.preventDefault();
            window.history.back();
          }
        } catch (error) {
          // The server-rendered page fallback remains available if referrer parsing fails.
        }
      });
    }());
    </script>
    <?php
}
add_action( 'wp_footer', 'cr2026_product_skin_contextual_back_script', 30 );

/** Toolbar uses the already-approved category toolbar presentation classes. */
function cr2026_product_skin_toolbar() {
    if ( ! is_product() ) {
        return;
    }
    $product = wc_get_product( get_queried_object_id() );
    if ( ! $product instanceof WC_Product ) {
        return;
    }
    $fallback_url = cr2026_product_skin_back_fallback_url( $product->get_id() );
    echo '<div class="cr-product-detail-toolbar cr-parent-category__toolbar">';
    echo '<a class="cr-parent-category__back" href="' . esc_url( $fallback_url ) . '" data-fallback-url="' . esc_url( $fallback_url ) . '" data-site-path="' . esc_attr( wp_parse_url( home_url( '/' ), PHP_URL_PATH ) ) . '" aria-label="' . esc_attr__( 'Volver', 'crios-rango-2026' ) . '">' . cr2026_icon( 'arrow' ) . '</a>';
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
add_action( 'woocommerce_before_single_product_summary', 'cr2026_product_skin_actions', 31 );

/** Replace the translated WooCommerce sale label only on product detail pages. */
function cr2026_product_skin_sale_label( $translation, $text, $domain ) {
    if ( 'woocommerce' === $domain && in_array( $text, array( 'Sale!', '¡Oferta!' ), true ) ) {
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
    $product = wc_get_product( get_queried_object_id() );
    $brand = cr2026_product_skin_brand_term();
    $original_title = $product instanceof WC_Product ? $product->get_name() : get_the_title( absint( get_queried_object_id() ) );
    $display_title = cr2026_product_skin_display_title( $original_title, $brand instanceof WP_Term ? $brand->name : '' );
    echo '<h1 class="product_title entry-title">' . esc_html( $display_title ) . '</h1>';
    woocommerce_template_single_price();
    echo '</div>';
    echo '<span class="cr-product-title-brand-row__divider" aria-hidden="true"></span>';
    echo '<div class="cr-product-title-brand-row__brand">';
    cr2026_product_skin_brand();
    echo '</div>';
    echo '</div>';
}

/**
 * Resolve the assigned product_brand term once for the display title and logo.
 * The real WooCommerce/product title is never modified.
 */
function cr2026_product_skin_brand_term() {
    if ( ! is_product() || ! taxonomy_exists( 'product_brand' ) ) { return null; }
    $terms = get_the_terms( absint( get_queried_object_id() ), 'product_brand' );
    if ( is_wp_error( $terms ) || empty( $terms ) ) { return null; }
    $brand = reset( $terms );
    return $brand instanceof WP_Term && 'product_brand' === $brand->taxonomy ? $brand : null;
}

/**
 * Remove only a final, independent product_brand suffix from the large display title.
 * Sticky navigation continues to render the full WooCommerce product name.
 */
function cr2026_product_skin_display_title( $original_title = null, $brand_name = null ) {
    if ( null === $original_title ) {
        $product = wc_get_product( absint( get_queried_object_id() ) );
        $original_title = $product instanceof WC_Product ? $product->get_name() : get_the_title( absint( get_queried_object_id() ) );
    }
    if ( ! is_string( $original_title ) ) { return $original_title; }
    $original_title = trim( $original_title );
    if ( null === $brand_name ) {
        $brand = cr2026_product_skin_brand_term();
        $brand_name = $brand instanceof WP_Term ? $brand->name : '';
    }
    if ( ! is_string( $brand_name ) ) { return $original_title; }
    $brand_name = trim( $brand_name );
    if ( '' === $brand_name ) { return $original_title; }

    // Exact trailing segment comparison: brand text is data, never a regular-expression fragment.
    $title_length = function_exists( 'mb_strlen' ) ? mb_strlen( $original_title, 'UTF-8' ) : strlen( $original_title );
    $brand_length = function_exists( 'mb_strlen' ) ? mb_strlen( $brand_name, 'UTF-8' ) : strlen( $brand_name );
    if ( $title_length <= $brand_length ) { return $original_title; }
    $title_suffix = function_exists( 'mb_substr' )
        ? mb_substr( $original_title, -$brand_length, null, 'UTF-8' )
        : substr( $original_title, -$brand_length );
    $suffix_matches = function_exists( 'mb_strtolower' )
        ? mb_strtolower( $title_suffix, 'UTF-8' ) === mb_strtolower( $brand_name, 'UTF-8' )
        : 0 === strcasecmp( $title_suffix, $brand_name );
    if ( ! $suffix_matches ) { return $original_title; }
    $prefix = function_exists( 'mb_substr' )
        ? mb_substr( $original_title, 0, $title_length - $brand_length, 'UTF-8' )
        : substr( $original_title, 0, -$brand_length );
    if ( ! preg_match( '/\s*[-–—|]\s*$/u', $prefix ) ) { return $original_title; }
    $display_title = preg_replace( '/\s*[-–—|]\s*$/u', '', $prefix );
    $display_title = is_string( $display_title ) ? trim( $display_title ) : '';
    return '' !== $display_title ? $display_title : $original_title;
}

/** Render the assigned WordPress product_brand term as a centered native logo. */
function cr2026_product_skin_brand() {
    $brand = cr2026_product_skin_brand_term();
    if ( ! $brand instanceof WP_Term ) { return; }
    $logo_url = function_exists( 'cr2026_home_brand_image_url' ) ? cr2026_home_brand_image_url( $brand ) : '';
    $brand_url = get_term_link( $brand );
    $brand_linked = ! is_wp_error( $brand_url ) && is_string( $brand_url ) && '' !== $brand_url;
    if ( $brand_linked ) {
        echo '<a class="cr-product-brand-link" href="' . esc_url( $brand_url ) . '" aria-label="' . esc_attr( sprintf( __( 'Ver productos de %s', 'crios-rango-2026' ), $brand->name ) ) . '">';
    }
    echo '<div class="cr-product-brand" aria-label="' . esc_attr__( 'Marca', 'crios-rango-2026' ) . '">';
    if ( $logo_url ) {
        echo '<img class="cr-product-brand__logo" src="' . esc_url( $logo_url ) . '" alt="' . esc_attr( $brand->name ) . '" loading="lazy" decoding="async">';
    } else {
        echo '<span class="cr-product-brand__name">' . esc_html( $brand->name ) . '</span>';
    }
    echo '</div>';
    if ( $brand_linked ) {
        echo '</a>';
    }
}


/** Render sizing assistance globally; duplicate legacy excerpt content is stripped above. */
function cr2026_product_skin_global_size_help() {
    if ( ! is_product() ) { return; }
    echo '<section class="cr-product-size-help" aria-labelledby="cr-product-size-help-title">';
    echo '<span class="cr-product-size-help__icon" aria-hidden="true"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.5" cy="18" r="7"/><circle cx="9.5" cy="18" r="2.5"/><path d="M15.8 13.5h11.4c1 0 1.8.8 1.8 1.8v3c0 1-.8 1.8-1.8 1.8H15.5M19 13.5v3m4-3v2m4-2v3"/></svg></span>';
    echo '<div class="cr-product-size-help__content">';
    echo '<h2 id="cr-product-size-help-title">Pregunta por más tallas!</h2>';
    echo '<p>Si la talla que necesitas, no se encuentra disponible, contacta con nosotros en <a href="mailto:criosrango@criosrango.es">criosrango@criosrango.es</a> o nuestro whatsapp <a href="https://wa.me/34633246788" target="_blank" rel="noopener noreferrer">633 246 788</a>.</p>';
    echo '</div>';
    echo '</section>';
}
add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 );

/** Remove the native lower description tab; its content is rendered once in the summary accordion. */
function cr2026_product_skin_remove_description_tab( $tabs ) {
    if ( is_product() && is_array( $tabs ) ) {
        unset( $tabs['description'] );
    }
    return $tabs;
}
add_filter( 'woocommerce_product_tabs', 'cr2026_product_skin_remove_description_tab', 99 );

/** Render the existing WooCommerce long description inline, after size help and before variations. */
function cr2026_product_skin_description_accordion() {
    if ( ! is_product() ) { return; }
    $product = wc_get_product( get_queried_object_id() );
    if ( ! $product instanceof WC_Product ) { return; }

    $description = $product->get_description();
    if ( ! is_string( $description ) || '' === trim( $description ) ) { return; }
    $plain_description = html_entity_decode( wp_strip_all_tags( $description ), ENT_QUOTES, get_bloginfo( 'charset' ) );
    $plain_description = preg_replace( '/[\s\x{00a0}]+/u', '', $plain_description );
    if ( ! is_string( $plain_description ) || '' === $plain_description ) { return; }

    $panel_id = 'cr-product-description-panel-' . absint( $product->get_id() );
    $toggle_id = $panel_id . '-toggle';
    echo '<section class="cr-product-description">';
    echo '<button type="button" class="cr-product-description__toggle" id="' . esc_attr( $toggle_id ) . '" aria-expanded="false" aria-controls="' . esc_attr( $panel_id ) . '">';
    echo '<span class="cr-product-description__title">Descripción</span>';
    echo '<span class="cr-product-description__chevron" aria-hidden="true"></span>';
    echo '</button>';
    echo '<div class="cr-product-description__panel" id="' . esc_attr( $panel_id ) . '" role="region" aria-labelledby="' . esc_attr( $toggle_id ) . '" hidden>';
    echo apply_filters( 'the_content', $description );
    echo '</div>';
    echo '</section>';
}
add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_description_accordion', 25 );

