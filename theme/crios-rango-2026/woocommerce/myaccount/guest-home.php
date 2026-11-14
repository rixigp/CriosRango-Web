<?php
/**
 * Public Account landing for logged-out customers.
 * Private destinations open the unchanged WooCommerce login/register subview.
 */
defined( 'ABSPATH' ) || exit;

$login_url   = cr2026_account_guest_login_url();
$orders_url  = cr2026_account_guest_login_url( wc_get_account_endpoint_url( 'orders' ) );
$promotions_url = cr2026_account_guest_login_url( wc_get_account_endpoint_url( 'loyalty_reward' ) );
$profile_url = cr2026_account_guest_login_url( wc_get_account_endpoint_url( 'edit-account' ) );

$find_guest_page = static function( $slugs ) {
    foreach ( $slugs as $slug ) {
        $page = get_page_by_path( $slug, OBJECT, 'page' );
        if ( $page instanceof WP_Post && 'publish' === $page->post_status ) {
            return get_permalink( $page );
        }
    }
    return '';
};
$help_url = $find_guest_page( array( 'ayuda', 'preguntas-frecuentes', 'contacto' ) );

$information = array(
    array(
        'label' => __( 'Cambios y devoluciones', 'crios-rango-2026' ),
        'url' => $find_guest_page( array( 'cambios-y-devoluciones' ) ),
        'icon' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5M12 7v5l4 2"></path></svg>',
    ),
    array(
        'label' => __( 'Condiciones de contratación', 'crios-rango-2026' ),
        'url' => $find_guest_page( array( 'condiciones-generales-de-contratacion' ) ),
        'icon' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"></path></svg>',
    ),
);
?>
<section class="cr-account-home cr-account-home--guest" aria-label="<?php esc_attr_e( 'Cuenta', 'crios-rango-2026' ); ?>">
    <a class="cr-account-home__user cr-account-home__user--guest" href="<?php echo esc_url( $login_url ); ?>">
        <span class="cr-account-home__avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 21c.6-4.1 3.2-6.2 7.5-6.2s6.9 2.1 7.5 6.2"></path></svg></span>
        <span class="cr-account-home__identity">
            <strong><?php esc_html_e( 'Inicia sesión o regístrate', 'crios-rango-2026' ); ?></strong>
            <span><?php esc_html_e( 'Accede a tu cuenta', 'crios-rango-2026' ); ?></span>
        </span>
        <span class="cr-account-home__guest-chevron" aria-hidden="true">›</span>
    </a>

    <div class="cr-account-home__grid" aria-label="<?php esc_attr_e( 'Secciones de cuenta', 'crios-rango-2026' ); ?>">
        <a class="cr-account-home__tile cr-account-home__tile--orders" href="<?php echo esc_url( $orders_url ); ?>">
            <span class="cr-account-home__tile-top"><span class="cr-account-home__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M8 4.5h8M9 3h6v3H9zM6 5.5H4.5v15h15v-8"></path><path d="m10 14 2.5 2.5L21 8"></path></svg></span><span class="cr-account-home__chevron" aria-hidden="true">›</span></span>
            <strong><?php esc_html_e( 'Pedidos', 'crios-rango-2026' ); ?></strong>
            <span><?php esc_html_e( 'Consulta y gestiona tus pedidos', 'crios-rango-2026' ); ?></span>
        </a>
        <a class="cr-account-home__tile cr-account-home__tile--promotions" href="<?php echo esc_url( $promotions_url ); ?>">
            <span class="cr-account-home__tile-top"><span class="cr-account-home__icon" aria-hidden="true"><?php echo cr2026_icon( 'tag' ); ?></span><span class="cr-account-home__chevron" aria-hidden="true">›</span></span>
            <strong><?php esc_html_e( 'Cupones y promociones', 'crios-rango-2026' ); ?></strong>
            <span><?php esc_html_e( 'Descuentos y ofertas exclusivas', 'crios-rango-2026' ); ?></span>
        </a>
        <a class="cr-account-home__tile cr-account-home__tile--profile" href="<?php echo esc_url( $profile_url ); ?>">
            <span class="cr-account-home__tile-top"><span class="cr-account-home__icon" aria-hidden="true"><?php echo cr2026_icon( 'user' ); ?></span><span class="cr-account-home__chevron" aria-hidden="true">›</span></span>
            <strong><?php esc_html_e( 'Perfil', 'crios-rango-2026' ); ?></strong>
            <span><?php esc_html_e( 'Tus datos, direcciones y preferencias', 'crios-rango-2026' ); ?></span>
        </a>
        <?php if ( $help_url ) : ?>
        <a class="cr-account-home__tile cr-account-home__tile--help" href="<?php echo esc_url( $help_url ); ?>">
        <?php else : ?>
        <div class="cr-account-home__tile cr-account-home__tile--help" aria-disabled="true">
        <?php endif; ?>
            <span class="cr-account-home__tile-top"><span class="cr-account-home__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1.2 1.2-2 1.5-2 3"></path><path d="M12 17.2h.01"></path></svg></span><span class="cr-account-home__chevron" aria-hidden="true">›</span></span>
            <strong><?php esc_html_e( 'Ayuda', 'crios-rango-2026' ); ?></strong>
            <span><?php esc_html_e( 'Preguntas frecuentes y contacto', 'crios-rango-2026' ); ?></span>
        <?php if ( $help_url ) : ?>
        </a>
        <?php else : ?>
        </div>
        <?php endif; ?>
    </div>

    <section class="cr-account-home__information" aria-labelledby="cr-account-information-title">
        <h2 id="cr-account-information-title"><?php esc_html_e( 'Información', 'crios-rango-2026' ); ?></h2>
        <div class="cr-account-home__information-card">
            <?php foreach ( $information as $item ) : ?>
                <?php if ( $item['url'] ) : ?>
                    <a class="cr-account-home__information-row" href="<?php echo esc_url( $item['url'] ); ?>">
                        <span class="cr-account-home__information-icon" aria-hidden="true"><?php echo $item['icon']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed inline SVG defined in this template. ?></span>
                        <span><?php echo esc_html( $item['label'] ); ?></span>
                        <span class="cr-account-home__information-chevron" aria-hidden="true">›</span>
                    </a>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
    </section>
</section>
