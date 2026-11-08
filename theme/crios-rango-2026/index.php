<?php get_header(); ?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-page-shell">
        <?php if ( have_posts() ) : ?>
            <div class="cr-post-grid">
                <?php while ( have_posts() ) : the_post(); ?>
                    <article <?php post_class( 'cr-post-card' ); ?>>
                        <?php if ( has_post_thumbnail() ) : ?><a href="<?php the_permalink(); ?>"><?php the_post_thumbnail( 'large' ); ?></a><?php endif; ?>
                        <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                        <?php the_excerpt(); ?>
                    </article>
                <?php endwhile; ?>
            </div>
            <?php the_posts_pagination(); ?>
        <?php else : ?>
            <p><?php esc_html_e( 'No hay contenido disponible.', 'crios-rango-2026' ); ?></p>
        <?php endif; ?>
    </div>
</main>
<?php get_footer(); ?>
