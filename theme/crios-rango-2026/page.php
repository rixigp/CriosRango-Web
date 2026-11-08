<?php get_header(); ?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-page-shell">
        <?php while ( have_posts() ) : the_post(); ?>
            <article <?php post_class( 'cr-page' ); ?>>
                <?php if ( ! function_exists( 'is_cart' ) || ! is_cart() ) : ?>
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
