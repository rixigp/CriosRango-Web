<?php
get_header();
$is_checkout_form = function_exists( 'is_checkout' ) && is_checkout()
    && ( ! function_exists( 'is_order_received_page' ) || ! is_order_received_page() );
$is_mobile_account = ( function_exists( 'is_account_page' ) && is_account_page() )
    || ( function_exists( 'cr2026_is_account_information_page' ) && cr2026_is_account_information_page() );
$is_information_page = function_exists( 'cr2026_is_information_page' ) && cr2026_is_information_page();
$is_help_page = function_exists( 'cr2026_account_is_help_page' ) && cr2026_account_is_help_page();
/* Page-level ownership covers both the Cart block and the classic cart shortcode. */
$is_cart_page = function_exists( 'is_cart' ) && is_cart();
?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-page-shell">
        <?php while ( have_posts() ) : the_post(); ?>
            <article <?php post_class( 'cr-page' ); ?>>
                <?php if ( $is_cart_page ) : ?>
                    <?php
                    $GLOBALS['cr2026_cart_toolbar_rendered_by_page'] = true;
                    // The empty-cart action belongs only to the cart summary, never the top toolbar.
                    cr2026_render_category_toolbar( __( 'Tu carrito', 'crios-rango-2026' ), wc_get_page_permalink( 'shop' ), 'cart', false, '', 'cr-cart-title' );
                    ?>
                <?php elseif ( ( ! function_exists( 'is_cart' ) || ! is_cart() ) && ! $is_checkout_form ) : ?>
                <?php if ( $is_information_page ) : ?>
                    <?php
                    $account_back_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : '';
                    if ( ! $account_back_url ) { $account_back_url = home_url( '/mi-cuenta/' ); }
                    echo '<div class="cr-information-toolbar-shell">';
                    cr2026_render_category_toolbar( get_the_title(), $account_back_url, 'parent', false );
                    echo '</div>';
                    ?>
                <?php elseif ( ! $is_mobile_account && ! $is_help_page ) : ?>
                    <?php
                    $page_account_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/mi-cuenta/' );
                    $page_back_url = ( function_exists( 'cr2026_account_is_help_page' ) && cr2026_account_is_help_page() ) ? $page_account_url : home_url( '/' );
                    cr2026_render_category_toolbar( get_the_title(), $page_back_url, 'parent', false );
                    ?>
                <?php endif; ?>
            <?php endif; ?>
                <?php if ( $is_help_page && function_exists( 'cr2026_account_render_endpoint_toolbar' ) ) : ?>
                    <?php cr2026_account_render_endpoint_toolbar( __( 'Ayuda', 'crios-rango-2026' ) ); ?>
                <?php endif; ?>
                <div class="cr-prose">
                    <?php if ( $is_help_page && function_exists( 'cr2026_account_help_content' ) ) : ?>
                        <?php echo cr2026_account_help_content(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- controlled renderer escapes dynamic content. ?>
                    <?php else : ?>
                        <?php the_content(); ?>
                    <?php endif; ?>
                </div>
            </article>
        <?php endwhile; ?>
    </div>
</main>
<?php get_footer(); ?>
