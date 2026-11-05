<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function cr2026_icon( $name, $class = '' ) {
    $icons = array(
        'search' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>',
        'user'   => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.7-4 3.1-6 7-6s6.3 2 7 6"></path></svg>',
        'bag'    => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path></svg>',
        'home'   => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path></svg>',
        'grid'   => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>',
        'menu'   => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>',
        'arrow'  => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="m14 7 5 5-5 5"></path></svg>',
        'tag'    => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13 13 20 4 11V4h7l9 9Z"></path><circle cx="8.3" cy="8.3" r="1.2"></circle></svg>',
        'home-filled' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>',
        'home-outlined' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 5.69 5 4.5V18h-2v-6H9v6H7v-7.81zM12 3 2 12h3v8h6v-6h2v6h6v-8h3z"></path></svg>',
        'categories-filled' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2-5.5 9h11z"></path><circle cx="17.5" cy="17.5" r="4.5"></circle><path d="M3 13.5h8v8H3z"></path></svg>',
        'categories-outlined' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2-5.5 9h11zm0 3.84L13.93 9h-3.87zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5m0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5M3 21.5h8v-8H3zm2-6h4v4H5z"></path></svg>',
        'outlet-filled' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m21.41 11.58-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42M5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7"></path></svg>',
        'outlet-outlined' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m21.41 11.58-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42M13 20.01 4 11V4h7v-.01l9 9z"></path><circle cx="6.5" cy="6.5" r="1.5"></circle></svg>',
        'cart-filled' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m-8 4c0 .55-.45 1-1 1s-1-.45-1-1V8h2zm2-6c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2m4 6c0 .55-.45 1-1 1s-1-.45-1-1V8h2z"></path></svg>',
        'cart-outlined' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2m6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2z"></path></svg>',
        'account-filled' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4"></path></svg>',
        'account-outlined' => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4m0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4"></path></svg>'
    );
    if ( ! isset( $icons[ $name ] ) ) {
        return '';
    }
    $is_material = false !== strpos( $name, '-filled' ) || false !== strpos( $name, '-outlined' );
    $icon_class = $is_material ? 'cr-icon--material ' : '';
    return '<span class="cr-icon ' . esc_attr( $icon_class . $class ) . '">' . $icons[ $name ] . '</span>';
}

/** Render the single canonical app header used by every theme template. */
function cr2026_render_app_header() {
    $cart_count = cr2026_cart_count();
    $classes = array( 'cr-app-header', 'cr-header', is_front_page() ? 'is-home-hero' : 'is-solid' );
    if ( ! empty( $GLOBALS['cr2026_parent_category_view'] ) ) {
        $classes[] = 'is-category-view';
    }
    ?>
    <header class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>" data-cr-header>
        <div class="cr-home-topbar">
            <a class="cr-home-mark" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
                <img class="cr-home-mark__logo" src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/brand/home_logo.png' ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>" width="34" height="34" decoding="async">
            </a>
            <div class="cr-home-topbar__actions">
                <a class="cr-app-icon-button" href="<?php echo esc_url( home_url( '/?s=&post_type=product' ) ); ?>" aria-label="<?php esc_attr_e( 'Buscar', 'crios-rango-2026' ); ?>">
                    <?php echo cr2026_icon( 'search' ); ?>
                </a>
                <a class="cr-app-icon-button cr-cart-link" href="<?php echo esc_url( function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/carrito/' ) ); ?>" aria-label="<?php esc_attr_e( 'Carrito', 'crios-rango-2026' ); ?>">
                    <?php echo cr2026_icon( 'bag' ); ?>
                    <span class="cr-cart-count<?php echo 0 === $cart_count ? ' is-empty' : ''; ?>" data-cr-cart-count data-count="<?php echo esc_attr( $cart_count ); ?>"><?php echo esc_html( $cart_count ); ?></span>
                </a>
            </div>
        </div>
    </header>
    <?php
}
/**
 * Resolve an attachment URL to the public uploads origin, independent of a
 * WordPress staging path such as /prueba.
 */
function cr2026_attachment_public_url( $attachment_id ) {
    $attachment_id = absint( $attachment_id );

    if ( ! $attachment_id ) {
        return '';
    }

    $relative = get_post_meta( $attachment_id, '_wp_attached_file', true );

    if ( ! $relative ) {
        return (string) wp_get_attachment_url( $attachment_id );
    }

    $home = wp_parse_url( home_url( '/' ) );

    if ( empty( $home['scheme'] ) || empty( $home['host'] ) ) {
        return (string) wp_get_attachment_url( $attachment_id );
    }

    $origin = $home['scheme'] . '://' . $home['host'];

    return trailingslashit( $origin . '/wp-content/uploads' ) . ltrim( $relative, '/' );
}

/**
 * Canonicalize Home product image URLs emitted by the existing front-page
 * wp_get_attachment_image() renderer without altering its markup or queries.
 */
function cr2026_home_product_image_attributes( $attr, $attachment, $size ) {
    if ( ! is_front_page() || empty( $attr['class'] ) || false === strpos( $attr['class'], 'cr-home-product__photo' ) ) {
        return $attr;
    }

    $attachment_id = isset( $attachment->ID ) ? absint( $attachment->ID ) : 0;
    if ( $attachment_id ) {
        $canonical_url = cr2026_attachment_public_url( $attachment_id );
        if ( $canonical_url ) {
            $attr['src'] = $canonical_url;
            // Avoid WordPress-generated srcset candidates that retain /prueba.
            $attr['srcset'] = '';
        }
    }

    return $attr;
}
add_filter( 'wp_get_attachment_image_attributes', 'cr2026_home_product_image_attributes', 10, 3 );

/**
 * Resolve the hierarchical back destination for the canonical category toolbar.
 * Root shop hub returns Home; top-level terms return the shop hub; child terms
 * return their direct parent category.
 */
function cr2026_category_back_url( $term = null ) {
    if ( is_shop() && ! ( $term instanceof WP_Term ) ) {
        return home_url( '/' );
    }
    if ( $term instanceof WP_Term && 'product_cat' === $term->taxonomy ) {
        if ( (int) $term->parent > 0 ) {
            $parent_term = get_term( (int) $term->parent, 'product_cat' );
            if ( $parent_term instanceof WP_Term && ! is_wp_error( $parent_term ) ) {
                $parent_link = get_term_link( $parent_term );
                if ( ! is_wp_error( $parent_link ) ) { return $parent_link; }
            }
        }
        return cr2026_shop_url();
    }
    return home_url( '/' );
}

/**
 * Keep product-card attachment URLs on the public uploads origin while
 * preserving WordPress-generated responsive srcset candidates and widths.
 */
function cr2026_product_card_image_attributes( $attr, $attachment, $size ) {
    if ( empty( $attr['class'] ) || false === strpos( $attr['class'], 'cr-product-card__image' ) ) {
        return $attr;
    }
    $attachment_id = isset( $attachment->ID ) ? absint( $attachment->ID ) : 0;
    if ( ! $attachment_id ) { return $attr; }
    $canonical_url = cr2026_attachment_public_url( $attachment_id );
    if ( $canonical_url ) { $attr['src'] = $canonical_url; }
    $uploads = wp_upload_dir();
    $home = wp_parse_url( home_url( '/' ) );
    if ( ! empty( $attr['srcset'] ) && ! empty( $uploads['baseurl'] ) && ! empty( $home['scheme'] ) && ! empty( $home['host'] ) ) {
        $canonical_base = $home['scheme'] . '://' . $home['host'] . '/wp-content/uploads';
        $attr['srcset'] = str_replace( untrailingslashit( $uploads['baseurl'] ), $canonical_base, $attr['srcset'] );
    }
    return $attr;
}
add_filter( 'wp_get_attachment_image_attributes', 'cr2026_product_card_image_attributes', 20, 3 );

/** Render the one shared toolbar markup for shop hub and category landings. */
function cr2026_render_category_toolbar( $title, $back_url, $filter_context = 'parent', $show_filters = true ) {
    echo '<div class="cr-parent-category__toolbar">';
    echo '<a class="cr-parent-category__back" href="' . esc_url( $back_url ) . '" aria-label="' . esc_attr__( 'Volver', 'crios-rango-2026' ) . '">' . cr2026_icon( 'arrow' ) . '</a>';
    echo '<h1 class="cr-parent-category__title">' . esc_html( $title ) . '</h1>';
    if ( $show_filters ) {
        echo '<button type="button" class="cr-parent-category__filters" data-cr-filter-open aria-haspopup="dialog">' . esc_html__( 'Filtros', 'crios-rango-2026' ) . '</button>';
    }
    echo '</div>';
}

/**
 * One semantic, fully clickable product card for every catalogue listing.
 * WooCommerce remains the source of product URLs, images, stock and prices.
 */
function cr2026_render_product_card( $product, $index = 99 ) {
    if ( ! $product instanceof WC_Product ) { return; }
    $product_id = $product->get_id();
    $name = $product->get_name();
    $permalink = get_permalink( $product_id );
    $image_id = absint( $product->get_image_id() );
    $image = '';
    if ( $image_id ) {
        $image = wp_get_attachment_image( $image_id, 'medium_large', false, array(
            'class' => 'cr-product-card__image', 'alt' => $name,
            'loading' => $index < 4 ? 'eager' : 'lazy', 'decoding' => 'async',
            'fetchpriority' => 0 === (int) $index ? 'high' : 'auto',
            'sizes' => '(max-width: 767px) calc((100vw - 52px) / 2), (max-width: 1023px) 28vw, (max-width: 1439px) 22vw, 18vw',
        ) );
    } else {
        $placeholder = function_exists( 'wc_placeholder_img_src' ) ? wc_placeholder_img_src( 'medium_large' ) : '';
        if ( $placeholder ) {
            $image = '<img class="cr-product-card__image" src="' . esc_url( $placeholder ) . '" alt="' . esc_attr( $name ) . '" loading="' . ( $index < 2 ? 'eager' : 'lazy' ) . '" decoding="async">';
        }
    }
    echo '<article class="cr-product-card"><a class="cr-product-card__link" href="' . esc_url( $permalink ) . '">';
    echo '<span class="cr-product-card__media">' . $image; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    if ( ! $product->is_in_stock() ) { echo '<span class="cr-product-card__stock">' . esc_html__( 'Agotado', 'crios-rango-2026' ) . '</span>'; }
    echo '</span><span class="cr-product-card__details"><span class="cr-product-card__name">' . esc_html( $name ) . '</span>';
    echo '<span class="cr-product-card__price">' . wp_kses_post( $product->get_price_html() ) . '</span></span></a></article>';
}

function cr2026_shop_url() {
    return function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/tienda/' );
}

function cr2026_home_categories() {
    return array(
        array( 'id' => 560, 'label' => 'Bautizo', 'asset' => 'category_bautizo.png' ),
        array( 'id' => 292, 'label' => 'Bebé niña', 'asset' => 'category_bebe_nina.png' ),
        array( 'id' => 294, 'label' => 'Bebé niño', 'asset' => 'category_bebe_nino.png' ),
        array( 'id' => 420, 'label' => 'Calzado', 'asset' => 'category_calzado.png' ),
        array( 'id' => 504, 'label' => 'Comunión niña', 'asset' => 'category_comunion_nina.png' ),
        array( 'id' => 509, 'label' => 'Comunión niño', 'asset' => 'category_comunion_nino.png' ),
        array( 'id' => 70, 'label' => 'Hombre', 'asset' => 'category_hombre.png' ),
        array( 'id' => 71, 'label' => 'Mujer', 'asset' => 'category_mujer.png' ),
        array( 'id' => 68, 'label' => 'Niña', 'asset' => 'category_nina.png' ),
        array( 'id' => 310, 'label' => 'Niño', 'asset' => 'category_nino.png' ),
        array( 'id' => 67, 'label' => 'Recién nacido', 'asset' => 'category_recien_nacido.png' ),
        array( 'id' => 445, 'label' => 'Outlet', 'asset' => 'category_outlet.png' ),
    );
}

/** Single URL map for bottom navigation and desktop rail. */
function cr2026_app_nav_urls() {
    $outlet = get_term( 445, 'product_cat' );
    if ( ! $outlet || is_wp_error( $outlet ) ) { $outlet = get_term_by( 'slug', 'outlet', 'product_cat' ); }
    $outlet_url = ( $outlet instanceof WP_Term ) ? get_term_link( $outlet ) : cr2026_shop_url();
    if ( is_wp_error( $outlet_url ) || ! $outlet_url ) { $outlet_url = cr2026_shop_url(); }
    return array(
        'home' => home_url( '/' ),
        'categories' => function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : cr2026_shop_url(),
        'outlet' => $outlet_url,
        'cart' => function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/carrito/' ),
        'account' => function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/mi-cuenta/' ),
    );
}

function cr2026_app_nav_active_item() {
    if ( is_front_page() ) { return 'home'; }
    if ( function_exists( 'is_cart' ) && is_cart() ) { return 'cart'; }
    if ( function_exists( 'is_account_page' ) && is_account_page() ) { return 'account'; }
    if ( function_exists( 'is_product_category' ) && is_product_category() ) {
        $term = get_queried_object();
        $outlet = get_term( 445, 'product_cat' );
        if ( ! $outlet || is_wp_error( $outlet ) ) { $outlet = get_term_by( 'slug', 'outlet', 'product_cat' ); }
        $root_id = ( $outlet instanceof WP_Term ) ? (int) $outlet->term_id : 445;
        if ( $term instanceof WP_Term && ( (int) $term->term_id === $root_id || in_array( $root_id, array_map( 'intval', get_ancestors( (int) $term->term_id, 'product_cat', 'taxonomy' ) ), true ) ) ) { return 'outlet'; }
        return 'categories';
    }
    if ( function_exists( 'is_shop' ) && is_shop() ) { return 'categories'; }
    return '';
}

function cr2026_is_app_nav_shell() {
    return is_front_page()
        || ( function_exists( 'is_shop' ) && is_shop() )
        || ( function_exists( 'is_product_category' ) && is_product_category() )
        || ( function_exists( 'is_product' ) && is_product() )
        || ( function_exists( 'is_cart' ) && is_cart() )
        || ( function_exists( 'is_checkout' ) && is_checkout() )
        || ( function_exists( 'is_account_page' ) && is_account_page() );
}
function cr2026_app_nav_body_class( $classes ) {
    $classes[] = 'cr-global-app-header';
    if ( ! empty( $GLOBALS['cr2026_parent_category_view'] ) ) { $classes[] = 'cr-parent-category-view'; }
    if ( ! empty( $GLOBALS['cr2026_product_listing_view'] ) ) { $classes[] = 'cr-product-listing-view'; }
    if ( cr2026_is_app_nav_shell() ) { $classes[] = 'cr-app-nav-shell'; }
    return $classes;
}
add_filter( 'body_class', 'cr2026_app_nav_body_class' );

function cr2026_category_filter_selected_values( $key ) {
    if ( ! isset( $_GET[ $key ] ) ) { return array(); }
    $raw = wp_unslash( $_GET[ $key ] );
    $values = is_array( $raw ) ? $raw : explode( ',', (string) $raw );
    $ids = array();
    foreach ( $values as $value ) {
        if ( ! is_scalar( $value ) ) { continue; }
        foreach ( explode( ',', (string) $value ) as $id ) {
            $id = absint( $id );
            if ( $id ) { $ids[] = $id; }
        }
    }
    return array_values( array_unique( $ids ) );
}
function cr2026_category_filters_selected() {
    return ! empty( cr2026_category_filter_selected_values( 'size_ids' ) )
        || ! empty( cr2026_category_filter_selected_values( 'color_ids' ) )
        || ! empty( cr2026_category_filter_selected_values( 'brand_ids' ) );
}
/** Labels are presentation metadata only; facet membership comes exclusively from Filter API. */
function cr2026_category_filter_term_labels() {
    $labels = array();
    foreach ( array( 'pa_tallas', 'pa_color', 'product_tag' ) as $taxonomy ) {
        if ( ! taxonomy_exists( $taxonomy ) ) { continue; }
        $terms = get_terms( array( 'taxonomy' => $taxonomy, 'hide_empty' => false, 'number' => 0 ) );
        if ( is_wp_error( $terms ) || ! is_array( $terms ) ) { continue; }
        foreach ( $terms as $term ) {
            if ( $term instanceof WP_Term ) {
                $labels[ $taxonomy ][ (string) $term->term_id ] = array( 'label' => $term->name, 'slug' => $term->slug );
            }
        }
    }
    return $labels;
}
/** Render the contextual filter dialog; its trigger lives in the category toolbar. */
function cr2026_render_category_filter_sheet( $term, $context = 'archive' ) {
    $is_root_catalog = 'root' === $context;
    if ( ! $is_root_catalog && ( ! $term instanceof WP_Term || 'product_cat' !== $term->taxonomy ) ) { return; }
    $filter_category_id = $is_root_catalog ? '' : (string) (int) $term->term_id;
    $labels = cr2026_category_filter_term_labels();
    $selected = array(
        'sizes' => cr2026_category_filter_selected_values( 'size_ids' ),
        'colors' => cr2026_category_filter_selected_values( 'color_ids' ),
        'brands' => cr2026_category_filter_selected_values( 'brand_ids' ),
    );
    echo '<div class="cr-category-filter-sheet" data-cr-filter-sheet hidden data-category-id="' . esc_attr( $filter_category_id ) . '" data-api-url="' . esc_url( rest_url( 'criosrango-filter/v1/query' ) ) . '" data-term-labels="' . esc_attr( wp_json_encode( $labels ) ) . '" data-initial-sizes="' . esc_attr( implode( ',', $selected['sizes'] ) ) . '" data-initial-colors="' . esc_attr( implode( ',', $selected['colors'] ) ) . '" data-initial-brands="' . esc_attr( implode( ',', $selected['brands'] ) ) . '">';
    echo '<div class="cr-category-filter-sheet__backdrop" data-cr-filter-close></div><section class="cr-category-filter-sheet__dialog" role="dialog" aria-modal="true" aria-labelledby="cr-category-filter-title" tabindex="-1">';
    echo '<div class="cr-category-filter-sheet__header"><h2 id="cr-category-filter-title">' . esc_html__( 'Filtros', 'crios-rango-2026' ) . '</h2></div>';
    echo '<div class="cr-category-filter-sheet__tabs" role="tablist" aria-label="' . esc_attr__( 'Tipo de filtro', 'crios-rango-2026' ) . '">';
    foreach ( array( 'sizes' => 'Talla', 'colors' => 'Color', 'brands' => 'Marca' ) as $dimension => $label ) {
        echo '<button type="button" role="tab" class="cr-category-filter-sheet__tab' . ( 'sizes' === $dimension ? ' is-active' : '' ) . '" data-cr-filter-tab="' . esc_attr( $dimension ) . '" aria-selected="' . ( 'sizes' === $dimension ? 'true' : 'false' ) . '">' . esc_html( $label ) . '</button>';
    }
    echo '</div><div class="cr-category-filter-sheet__content">';
    echo '<div class="cr-category-filter-sheet__options" data-cr-filter-options aria-live="polite"><p class="cr-category-filter-sheet__empty">' . esc_html__( 'Cargando opciones…', 'crios-rango-2026' ) . '</p></div></div>';
    echo '<div class="cr-category-filter-sheet__actions"><button type="button" class="cr-category-filter-sheet__clear" data-cr-filter-clear>' . esc_html__( 'Limpiar', 'crios-rango-2026' ) . '</button><button type="button" class="cr-category-filter-sheet__apply" data-cr-filter-apply>' . esc_html__( 'Aplicar', 'crios-rango-2026' ) . '</button></div></section></div>';
}
function cr2026_cart_count() {
    if ( function_exists( 'WC' ) && WC()->cart ) {
        return (int) WC()->cart->get_cart_contents_count();
    }
    return 0;
}

function cr2026_get_home_config() {
    $defaults = array(
        'hero_ids'          => array(),
        'outlet_winter_id'  => 0,
        'outlet_summer_id'  => 0,
    );

    $config = get_option( 'criosrango_home_config', array() );
    return is_array( $config ) ? wp_parse_args( $config, $defaults ) : $defaults;
}



/**
 * Return a useful image for a product category.
 *
 * Priority:
 * 1) WooCommerce category thumbnail.
 * 2) Featured image from a recent visible product in that category.
 *
 * The fallback is cached briefly so the Home does not run eight product queries
 * on every request when category thumbnails have not been configured.
 */
function cr2026_category_image_id( $term ) {
    if ( ! $term instanceof WP_Term ) {
        return 0;
    }

    $thumbnail_id = (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
    if ( $thumbnail_id ) {
        return $thumbnail_id;
    }

    $cache_key = 'cr2026_cat_img_v2_' . (int) $term->term_id;
    $cached    = get_transient( $cache_key );
    if ( false !== $cached ) {
        return (int) $cached;
    }

    /*
     * Use a real product image as a fallback. WP_Query with include_children=true
     * is deliberate: several app categories are parent categories and the actual
     * products live in their WooCommerce descendants.
     */
    $query = new WP_Query( array(
        'post_type'              => 'product',
        'post_status'            => 'publish',
        'posts_per_page'         => 16,
        'fields'                 => 'ids',
        'orderby'                => 'date',
        'order'                  => 'DESC',
        'no_found_rows'          => true,
        'ignore_sticky_posts'    => true,
        'update_post_meta_cache' => true,
        'update_post_term_cache' => false,
        'tax_query'              => array(
            array(
                'taxonomy'         => 'product_cat',
                'field'            => 'term_id',
                'terms'            => array( (int) $term->term_id ),
                'include_children' => true,
            ),
        ),
    ) );

    $image_id = 0;
    foreach ( $query->posts as $product_id ) {
        $candidate = (int) get_post_thumbnail_id( $product_id );
        if ( $candidate ) {
            $image_id = $candidate;
            break;
        }
    }

    set_transient( $cache_key, $image_id, 6 * HOUR_IN_SECONDS );
    return $image_id;
}

function cr2026_product_card( $product ) {
    if ( ! $product instanceof WC_Product || ! $product->is_visible() ) {
        return;
    }

    $url   = get_permalink( $product->get_id() );
    $image = $product->get_image( 'woocommerce_thumbnail', array( 'loading' => 'lazy' ) );
    ?>
    <article class="cr-product-card">
        <a class="cr-product-card__image" href="<?php echo esc_url( $url ); ?>">
            <?php echo wp_kses_post( $image ); ?>
            <?php if ( $product->is_on_sale() ) : ?>
                <span class="cr-product-card__badge"><?php esc_html_e( 'Oferta', 'crios-rango-2026' ); ?></span>
            <?php endif; ?>
        </a>
        <div class="cr-product-card__body">
            <h3 class="cr-product-card__title"><a href="<?php echo esc_url( $url ); ?>"><?php echo esc_html( $product->get_name() ); ?></a></h3>
            <div class="cr-product-card__price"><?php echo wp_kses_post( $product->get_price_html() ); ?></div>
        </div>
    </article>
    <?php
}


/**
 * Home: latest published WooCommerce products, matching the shared app limit.
 */
function cr2026_home_novedades() {
    if ( ! function_exists( 'wc_get_products' ) ) {
        return array();
    }

    $products = wc_get_products(
        array(
            'status'  => 'publish',
            'limit'   => 8,
            'orderby' => 'date',
            'order'   => 'DESC',
            'return'  => 'objects',
        )
    );

    return array_values(
        array_filter(
            $products,
            static function ( $product ) {
                return $product instanceof WC_Product && $product->is_visible();
            }
        )
    );
}

/**
 * Resolve an Outlet media URL from the configured attachment, then URL fallback.
 */
function cr2026_home_outlet_image_url( $season ) {
    $config = cr2026_get_home_config();
    $season = 'summer' === $season ? 'summer' : 'winter';
    $image_id = absint( $config[ 'outlet_' . $season . '_id' ] ?? 0 );

    if ( $image_id ) {
        $image_url = wp_get_attachment_image_url( $image_id, 'full' );
        if ( $image_url ) {
            return $image_url;
        }
    }

    $fallback = isset( $config[ 'outlet_' . $season . '_fallback_url' ] )
        ? trim( (string) $config[ 'outlet_' . $season . '_fallback_url' ] )
        : '';

    return $fallback ? esc_url_raw( $fallback ) : '';
}

/**
 * Resolve an Outlet season child by name/slug, then app-known ID, then root.
 */
function cr2026_home_outlet_term( $season ) {
    $season = 'summer' === $season ? 'verano' : 'invierno';
    $root   = get_term( 445, 'product_cat' );

    if ( ! $root || is_wp_error( $root ) ) {
        return null;
    }

    $children = get_terms(
        array(
            'taxonomy'   => 'product_cat',
            'parent'     => 445,
            'hide_empty' => false,
            'number'     => 0,
        )
    );

    if ( ! is_wp_error( $children ) ) {
        foreach ( $children as $child ) {
            if ( false !== stripos( $child->name, $season ) || false !== stripos( $child->slug, $season ) ) {
                return $child;
            }
        }
    }

    $fallback_id = 'invierno' === $season ? 446 : 475;
    $fallback    = get_term( $fallback_id, 'product_cat' );

    return ( $fallback && ! is_wp_error( $fallback ) ) ? $fallback : $root;
}

/**
 * Return up to 16 populated product brands in the app's stable ordering.
 */
function cr2026_home_brands() {
    if ( ! taxonomy_exists( 'product_brand' ) ) {
        return array();
    }

    $terms = get_terms(
        array(
            'taxonomy'   => 'product_brand',
            'hide_empty' => true,
            'number'     => 0,
        )
    );

    if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
        return array();
    }

    $terms = array_values(
        array_filter(
            $terms,
            static function ( $term ) {
                return $term instanceof WP_Term
                    && $term->term_id > 0
                    && $term->count > 0
                    && '' !== trim( $term->name );
            }
        )
    );

    usort(
        $terms,
        static function ( $left, $right ) {
            if ( (int) $left->count !== (int) $right->count ) {
                return (int) $right->count <=> (int) $left->count;
            }
            return strcasecmp( trim( $left->name ), trim( $right->name ) );
        }
    );

    return array_slice( $terms, 0, 16 );
}

/**
 * Resolve a brand logo from the supported WooCommerce term meta keys.
 */
function cr2026_home_brand_image_url( $term ) {
    if ( ! $term instanceof WP_Term ) {
        return '';
    }

    foreach ( array( 'thumbnail_id', 'image_id' ) as $meta_key ) {
        $image_id = absint( get_term_meta( $term->term_id, $meta_key, true ) );
        if ( $image_id ) {
            $image_url = cr2026_attachment_public_url( $image_id );
            if ( $image_url ) {
                return $image_url;
            }
        }
    }

    return '';
}

/**
 * Home section destinations: dedicated pages when present, Shop otherwise.
 */
function cr2026_home_novedades_url() {
    $page = get_page_by_path( 'novedades' );
    return $page ? get_permalink( $page ) : add_query_arg( 'orderby', 'date', cr2026_shop_url() );
}

function cr2026_home_brands_url() {
    $page = get_page_by_path( 'marcas' );
    return $page ? get_permalink( $page ) : cr2026_shop_url();
}



/**
 * Return only direct product_cat children, including empty categories.
 * WooCommerce's saved category order (term meta "order") is respected.
 */
function cr2026_product_cat_children( $term_id ) {
    $term_id = absint( $term_id );
    if ( ! $term_id || ! taxonomy_exists( 'product_cat' ) ) {
        return array();
    }

    $children = get_terms( array(
        'taxonomy'   => 'product_cat',
        'parent'     => $term_id,
        'hide_empty' => false,
        'number'     => 0,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ) );

    if ( is_wp_error( $children ) || ! is_array( $children ) ) {
        return array();
    }

    $children = array_values( array_filter( $children, static function ( $child ) {
        return $child instanceof WP_Term && 'product_cat' === $child->taxonomy;
    } ) );

    usort( $children, static function ( $left, $right ) {
        $left_order  = get_term_meta( $left->term_id, 'order', true );
        $right_order = get_term_meta( $right->term_id, 'order', true );
        $left_order  = '' === $left_order ? 0 : (int) $left_order;
        $right_order = '' === $right_order ? 0 : (int) $right_order;

        if ( $left_order !== $right_order ) {
            return $left_order <=> $right_order;
        }

        return strcasecmp( $left->name, $right->name );
    } );

    return $children;
}

/**
 * Display-only correction for a legacy category name.
 * The WordPress term name, slug, ID and relationships remain untouched.
 */
function cr2026_product_cat_display_name( $term ) {
    if ( ! $term instanceof WP_Term ) {
        return '';
    }

    if ( 'bebe-nina' === $term->slug && 'Bebe niña' === $term->name ) {
        return 'Bebé niña';
    }

    return $term->name;
}

/**
 * Resolve manually uploaded category art by term slug and supported extension.
 * Fall back to the WooCommerce category thumbnail; never use product imagery.
 */
function cr2026_subcategory_image_url( $term ) {
    if ( ! $term instanceof WP_Term || 'product_cat' !== $term->taxonomy ) {
        return '';
    }

    $relative_directory = 'assets/images/subcategories/';
    $absolute_directory = trailingslashit( get_template_directory() ) . $relative_directory;
    $public_directory   = trailingslashit( get_template_directory_uri() ) . $relative_directory;

    foreach ( array( 'webp', 'png', 'jpg', 'jpeg' ) as $extension ) {
        $filename = sanitize_file_name( $term->slug ) . '.' . $extension;
        if ( file_exists( $absolute_directory . $filename ) ) {
            return $public_directory . rawurlencode( $filename );
        }
    }

    $thumbnail_id = absint( get_term_meta( $term->term_id, 'thumbnail_id', true ) );
    if ( $thumbnail_id ) {
        $thumbnail_url = cr2026_attachment_public_url( $thumbnail_id );
        if ( $thumbnail_url ) {
            return $thumbnail_url;
        }
    }

    return '';
}
