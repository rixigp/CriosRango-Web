<?php
/**
 * Mobile-first account dashboard. All destinations and customer details use
 * native WordPress/WooCommerce data; this template does not change account logic.
 */
defined( 'ABSPATH' ) || exit;

$current_user = wp_get_current_user();
$full_name = trim( (string) $current_user->first_name . ' ' . (string) $current_user->last_name );
if ( '' === $full_name ) {
    $full_name = (string) $current_user->display_name;
}
if ( '' === $full_name ) {
    $full_name = (string) $current_user->user_login;
}
$name_parts = preg_split( '/\s+/u', trim( $full_name ), -1, PREG_SPLIT_NO_EMPTY );
$initials = '';
if ( is_array( $name_parts ) && count( $name_parts ) > 1 ) {
    $initials = function_exists( 'mb_substr' )
        ? mb_substr( $name_parts[0], 0, 1 ) . mb_substr( $name_parts[ count( $name_parts ) - 1 ], 0, 1 )
        : substr( $name_parts[0], 0, 1 ) . substr( $name_parts[ count( $name_parts ) - 1 ], 0, 1 );
} elseif ( '' !== $full_name ) {
    $initials = function_exists( 'mb_substr' ) ? mb_substr( $full_name, 0, 2 ) : substr( $full_name, 0, 2 );
}
$initials = function_exists( 'mb_strtoupper' ) ? mb_strtoupper( $initials ) : strtoupper( $initials );

$account_url = wc_get_page_permalink( 'myaccount' );
$orders_url = wc_get_account_endpoint_url( 'orders' );
$promotions_url = wc_get_account_endpoint_url( 'loyalty_reward' );
$profile_url = wc_get_account_endpoint_url( 'edit-account' );

$find_account_page = static function( $slugs ) {
    foreach ( $slugs as $slug ) {
        $page = get_page_by_path( $slug, OBJECT, 'page' );
        if ( $page instanceof WP_Post && 'publish' === $page->post_status ) {
            return get_permalink( $page );
        }
    }
    return '';
};
$help_url = $find_account_page( array( 'ayuda', 'preguntas-frecuentes', 'contacto' ) );

$information = array(
    array( 'label' => __( 'Cambios y devoluciones', 'crios-rango-2026' ), 'icon_svg' => '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 7v5h5M4.8 11A8 8 0 1 1 5 15"></path><path d="M12 7v5l3 2"></path></svg>', 'slugs' => array( 'cambios-y-devoluciones' ) ),
    array( 'label' => __( 'Condiciones de contratación', 'crios-rango-2026' ), 'icon_svg' => '<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3.5h8l4 4V20.5H6z"></path><path d="M14 3.5v4h4M9 12h6M9 16h6"></path></svg>', 'slugs' => array( 'condiciones-generales-de-contratacion' ) ),
    array( 'label' => __( 'Política de privacidad', 'crios-rango-2026' ), 'icon_svg' => '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6z"></path><path d="M12 9v4M12 16h.01"></path></svg>', 'slugs' => array( 'politica-de-privacidad' ) ),
    array( 'label' => __( 'Aviso legal', 'crios-rango-2026' ), 'icon_svg' => '<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3.5h8l4 4V20.5H6z"></path><path d="M14 3.5v4h4M9 12h6M9 16h6"></path></svg>', 'slugs' => array( 'aviso-legal' ) ),
    array( 'label' => __( 'Política de cookies', 'crios-rango-2026' ), 'icon_svg' => '<svg viewBox="0 0 24 24" focusable="false"><path d="M20 12.2A8.2 8.2 0 1 1 11.8 4a3.2 3.2 0 0 0 8.2 8.2Z"></path><path d="M8 9h.01M11 15h.01M15 11h.01M7 14h.01"></path></svg>', 'slugs' => array( 'politica-de-cookies' ) ),
);
?>
<section class="cr-account-home" aria-labelledby="cr-account-title">
    <div class="cr-account-home__toolbar">
        <a class="cr-account-home__back" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php esc_attr_e( 'Volver al inicio', 'crios-rango-2026' ); ?>">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7"></path></svg>
        </a>
        <h1 id="cr-account-title"><?php esc_html_e( 'Cuenta', 'crios-rango-2026' ); ?></h1>
    </div>

    <div class="cr-account-home__user">
        <span class="cr-account-home__avatar" aria-hidden="true"><?php echo esc_html( $initials ); ?></span>
        <span class="cr-account-home__identity">
            <strong><?php echo esc_html( $full_name ); ?></strong>
            <span><?php echo esc_html( $current_user->user_email ); ?></span>
        </span>
    </div>

    <div class="cr-account-home__grid" aria-label="<?php esc_attr_e( 'Secciones de cuenta', 'crios-rango-2026' ); ?>">
        <a class="cr-account-home__tile cr-account-home__tile--orders" href="<?php echo esc_url( $orders_url ); ?>">
            <span class="cr-account-home__tile-top"><span class="cr-account-home__icon" aria-hidden="true"><?php echo cr2026_icon( 'bag' ); ?></span><span class="cr-account-home__chevron" aria-hidden="true">›</span></span>
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
            <span class="cr-account-home__tile-top"><span class="cr-account-home__icon" aria-hidden="true"><?php echo cr2026_icon( 'message' ); ?></span><span class="cr-account-home__chevron" aria-hidden="true">›</span></span>
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
            <?php foreach ( $information as $item ) :
                $page_url = $find_account_page( $item['slugs'] );
                if ( ! $page_url ) { continue; }
            ?>
                <a class="cr-account-home__information-row" href="<?php echo esc_url( $page_url ); ?>">
                    <span class="cr-account-home__information-icon" aria-hidden="true"><?php echo $item['icon_svg']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed inline SVG markup defined in this template. ?></span>
                    <span><?php echo esc_html( $item['label'] ); ?></span>
                    <span class="cr-account-home__information-chevron" aria-hidden="true">›</span>
                </a>
            <?php endforeach; ?>
        </div>
    </section>
</section>
