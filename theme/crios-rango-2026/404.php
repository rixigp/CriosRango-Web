<?php get_header(); ?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-empty-state">
        <?php if ( function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) : ?>
            <?php cr2026_render_category_toolbar( __( 'Esta página no está por aquí.', 'crios-rango-2026' ), '', 'parent', false ); ?>
        <?php endif; ?>
        <p class="cr-eyebrow">404</p>
        <h1><?php esc_html_e( 'Esta página no está por aquí.', 'crios-rango-2026' ); ?></h1>
        <p><?php esc_html_e( 'Puedes volver al inicio o seguir comprando.', 'crios-rango-2026' ); ?></p>
        <a class="cr-button" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Volver al inicio', 'crios-rango-2026' ); ?></a>
    </div>
</main>
<?php get_footer(); ?>
