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
    );

    if ( ! isset( $icons[ $name ] ) ) {
        return '';
    }

    return '<span class="cr-icon ' . esc_attr( $class ) . '">' . $icons[ $name ] . '</span>';
}

function cr2026_shop_url() {
    return function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/tienda/' );
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
            $image_url = wp_get_attachment_image_url( $image_id, 'full' );
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
