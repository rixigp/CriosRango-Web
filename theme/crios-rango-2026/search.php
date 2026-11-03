<?php get_header(); ?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-page-shell">
        <header class="cr-page__header">
            <p class="cr-eyebrow"><?php esc_html_e( 'Resultados', 'crios-rango-2026' ); ?></p>
            <h1><?php printf( esc_html__( 'Buscar: %s', 'crios-rango-2026' ), esc_html( get_search_query() ) ); ?></h1>
        </header>
        <?php get_search_form(); ?>
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
            <p><?php esc_html_e( 'No hemos encontrado resultados.', 'crios-rango-2026' ); ?></p>
        <?php endif; ?>
    </div>
</main>
<?php get_footer(); ?>
