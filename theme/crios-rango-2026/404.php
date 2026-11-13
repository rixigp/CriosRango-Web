<?php get_header(); ?>
<main id="primary" class="cr-main cr-main--404">
    <div class="cr-shell cr-page-shell">
        <?php if ( function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) : ?>
            <?php
            // Keep the established 404 pattern: the canonical toolbar is rendered without a back link.
            cr2026_render_category_toolbar( __( 'Página no encontrada', 'crios-rango-2026' ), '', 'parent', false );
            ?>
        <?php endif; ?>
        <section class="cr-empty-state cr-404-page" aria-labelledby="cr-404-title">
            <h1 id="cr-404-title"><?php esc_html_e( 'Página no encontrada', 'crios-rango-2026' ); ?></h1>
            <p class="cr-404-page__message"><?php esc_html_e( 'No hemos encontrado la página que buscas.', 'crios-rango-2026' ); ?></p>
            <a class="cr-button cr-404-page__cta" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Volver al inicio', 'crios-rango-2026' ); ?></a>
        </section>
    </div>
</main>
<?php get_footer(); ?>
