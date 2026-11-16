<?php
get_header();
$is_non_cart_page = ! function_exists( 'is_cart' ) || ! is_cart();
$is_checkout_form = function_exists( 'is_checkout' ) && is_checkout()
    && ( ! function_exists( 'is_order_received_page' ) || ! is_order_received_page() );
$is_account_information = function_exists( 'cr2026_is_account_information_page' )
    && cr2026_is_account_information_page();
$account_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : '';
if ( ! $account_url ) { $account_url = home_url( '/mi-cuenta/' ); }
?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-page-shell">
        <?php while ( have_posts() ) : the_post(); ?>
            <article <?php post_class( 'cr-page' ); ?>>
                <?php if ( $is_non_cart_page && ! $is_checkout_form ) : ?>
                    <?php
                    if ( $is_account_information ) {
                        $page_back_url = $account_url;
                    } elseif ( function_exists( 'cr2026_account_is_help_page' ) && cr2026_account_is_help_page() ) {
                        $page_back_url = $account_url;
                    } else {
                        $page_back_url = home_url( '/' );
                    }
                    cr2026_render_category_toolbar( get_the_title(), $page_back_url, 'parent', false );
                    ?>
                <?php endif; ?>
                <div class="cr-prose"><?php the_content(); ?></div>
            </article>
        <?php endwhile; ?>
    </div>
</main>
<?php get_footer(); ?>
