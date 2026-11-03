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
