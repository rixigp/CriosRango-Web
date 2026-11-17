<?php
get_header();
$is_checkout_form = function_exists( 'is_checkout' ) && is_checkout()
    && ( ! function_exists( 'is_order_received_page' ) || ! is_order_received_page() );
$is_mobile_account = ( function_exists( 'is_account_page' ) && is_account_page() )
    || ( function_exists( 'cr2026_is_account_information_page' ) && cr2026_is_account_information_page() );
$is_mobile_help = function_exists( 'cr2026_account_is_help_page' ) && cr2026_account_is_help_page()
    && function_exists( 'wp_is_mobile' ) && wp_is_mobile();
/* Page-level ownership covers both the Cart block and the classic cart shortcode. */
$is_mobile_cart_page = function_exists( 'is_cart' ) && is_cart()
    && function_exists( 'wp_is_mobile' ) && wp_is_mobile();
?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-page-shell">
        <?php while ( have_posts() ) : the_post(); ?>
            <article <?php post_class( 'cr-page' ); ?>>
                <?php if ( $is_mobile_cart_page ) : ?>
                    <?php
                    $GLOBALS['cr2026_cart_toolbar_rendered_by_page'] = true;
                    $cart_empty_action = function_exists( 'cr2026_cart_empty_action_markup' ) ? cr2026_cart_empty_action_markup() : '';
                    cr2026_render_category_toolbar( __( 'Tu carrito', 'crios-rango-2026' ), wc_get_page_permalink( 'shop' ), 'cart', false, $cart_empty_action, 'cr-cart-title' );
                    ?>
                <?php elseif ( ( ! function_exists( 'is_cart' ) || ! is_cart() ) && ! $is_checkout_form ) : ?>
                <?php if ( $is_mobile_account && function_exists( 'cr2026_is_account_information_page' ) && cr2026_is_account_information_page() ) : ?>
                    <?php
                    $account_back_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : '';
                    if ( ! $account_back_url ) { $account_back_url = home_url( '/mi-cuenta/' ); }
                    echo '<div class="cr-information-toolbar-shell">';
                    cr2026_render_category_toolbar( get_the_title(), $account_back_url, 'parent', false );
                    echo '</div>';
                    ?>
                <?php elseif ( ! $is_mobile_account && ! $is_mobile_help ) : ?>
                    <?php
                    $page_account_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/mi-cuenta/' );
                    $page_back_url = ( function_exists( 'cr2026_account_is_help_page' ) && cr2026_account_is_help_page() ) ? $page_account_url : home_url( '/' );
                    cr2026_render_category_toolbar( get_the_title(), $page_back_url, 'parent', false );
                    ?>
                <?php endif; ?>
            <?php endif; ?>
                <div class="cr-prose"><?php the_content(); ?></div>
            </article>
        <?php endwhile; ?>
    </div>
</main>
<?php get_footer(); ?>
