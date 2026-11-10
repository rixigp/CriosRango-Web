<?php
get_header();
$is_checkout_form = function_exists( 'is_checkout' ) && is_checkout()
    && ( ! function_exists( 'is_order_received_page' ) || ! is_order_received_page() );
?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-page-shell">
        <?php while ( have_posts() ) : the_post(); ?>
            <article <?php post_class( 'cr-page' ); ?>>
                <?php if ( ( ! function_exists( 'is_cart' ) || ! is_cart() ) && ! $is_checkout_form ) : ?>
                <?php if ( function_exists( 'wp_is_mobile' ) && wp_is_mobile() && ( ! function_exists( 'cr2026_account_is_help_page' ) || ! cr2026_account_is_help_page() ) ) : ?>
                    <?php cr2026_render_category_toolbar( get_the_title(), '', 'parent', false ); ?>
                <?php endif; ?>
                <header class="cr-page__header">
                    <h1><?php the_title(); ?></h1>
                </header>
            <?php endif; ?>
                <div class="cr-prose"><?php the_content(); ?></div>
            </article>
        <?php endwhile; ?>
    </div>
</main>
<?php get_footer(); ?>
