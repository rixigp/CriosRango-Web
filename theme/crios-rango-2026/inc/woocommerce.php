<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * The unfiltered Shop request is a category hub, not a product archive.
 * Short-circuit only its main query before SQL; filtered Shop requests continue
 * through the Filter API integration in helpers.php.
 */
function cr2026_shop_hub_short_circuit_main_query( $posts, $query ) {
    if (
        null !== $posts
        || is_admin()
        || ! $query->is_main_query()
        || ! function_exists( 'is_shop' )
        || ! is_shop()
        || cr2026_category_filters_selected()
    ) {
        return $posts;
    }

    $query->set( 'no_found_rows', true );
    $query->found_posts = 0;
    $query->max_num_pages = 0;
    return array();
}
add_filter( 'posts_pre_query', 'cr2026_shop_hub_short_circuit_main_query', 20, 2 );

function cr2026_woocommerce_wrappers() {
    remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
    remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );
    add_action( 'woocommerce_before_main_content', 'cr2026_wrapper_start', 10 );
    add_action( 'woocommerce_after_main_content', 'cr2026_wrapper_end', 10 );
}
add_action( 'wp', 'cr2026_woocommerce_wrappers' );

function cr2026_wrapper_start() {
    echo '<main id="primary" class="cr-main cr-main--woocommerce"><div class="cr-shell">';
}

function cr2026_wrapper_end() {
    echo '</div></main>';
}

function cr2026_loop_columns() {
    return 4;
}
add_filter( 'loop_shop_columns', 'cr2026_loop_columns' );

function cr2026_products_per_page( $cols ) {
    return 24;
}
add_filter( 'loop_shop_per_page', 'cr2026_products_per_page', 20 );

function cr2026_cart_count_fragment( $fragments ) {
    ob_start();
    ?>
    <?php $cart_count = cr2026_cart_count(); ?>
    <span class="cr-cart-count<?php echo 0 === $cart_count ? ' is-empty' : ''; ?>" data-cr-cart-count data-count="<?php echo esc_attr( $cart_count ); ?>"><?php echo esc_html( $cart_count ); ?></span>
    <?php
    $fragments['span[data-cr-cart-count]'] = ob_get_clean();
    return $fragments;
}
add_filter( 'woocommerce_add_to_cart_fragments', 'cr2026_cart_count_fragment' );


/**
 * Keep loyalty accounting active but remove its promotional points sentence
 * from product listing cards. The message is useful on product/cart/checkout,
 * but on a two-column mobile catalogue it creates excessive vertical noise.
 */
function cr2026_callable_name( $callback ) {
    if ( is_string( $callback ) ) {
        return $callback;
    }

    if ( is_array( $callback ) && 2 === count( $callback ) ) {
        $owner = is_object( $callback[0] ) ? get_class( $callback[0] ) : (string) $callback[0];
        return $owner . '::' . (string) $callback[1];
    }

    if ( $callback instanceof Closure ) {
        return 'Closure';
    }

    if ( is_object( $callback ) ) {
        return get_class( $callback );
    }

    return '';
}

function cr2026_remove_loyalty_messages_from_product_loops() {
    if ( is_admin() ) {
        return;
    }

    global $wp_filter;

    $hooks = array(
        'woocommerce_after_shop_loop_item_title',
        'woocommerce_after_shop_loop_item',
    );

    foreach ( $hooks as $hook_name ) {
        if ( empty( $wp_filter[ $hook_name ] ) || ! $wp_filter[ $hook_name ] instanceof WP_Hook ) {
            continue;
        }

        $callbacks = $wp_filter[ $hook_name ]->callbacks;
        foreach ( $callbacks as $priority => $items ) {
            foreach ( $items as $item ) {
                if ( empty( $item['function'] ) ) {
                    continue;
                }

                $name = strtolower( cr2026_callable_name( $item['function'] ) );
                if ( false === strpos( $name, 'wployalty' ) && false === strpos( $name, 'wlr' ) ) {
                    continue;
                }

                remove_action( $hook_name, $item['function'], (int) $priority );
            }
        }
    }
}
add_action( 'wp', 'cr2026_remove_loyalty_messages_from_product_loops', 100 );
