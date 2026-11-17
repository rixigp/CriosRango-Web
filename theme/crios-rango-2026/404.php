<?php get_header(); ?>
<main id="primary" class="cr-main cr-main--404">
    <div class="cr-shell cr-page-shell">
        <?php
        // The 404 route uses the same contextual toolbar as every standard page.
        cr2026_render_category_toolbar( __( 'Página no encontrada', 'crios-rango-2026' ), '', 'parent', false, '', 'cr-404-title' );
        ?>
        <section class="cr-empty-state cr-404-page" aria-labelledby="cr-404-title">
            <p class="cr-404-page__message"><?php esc_html_e( 'No hemos encontrado la página que buscas.', 'crios-rango-2026' ); ?></p>
            <a class="cr-button cr-404-page__cta" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Volver al inicio', 'crios-rango-2026' ); ?></a>
        </section>
    </div>
</main>
<?php get_footer(); ?>
