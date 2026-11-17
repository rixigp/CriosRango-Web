<?php
/**
 * Críos & Rango downloads cards using WooCommerce's native download list.
 *
 * @package WooCommerce\Templates
 */
defined( 'ABSPATH' ) || exit;
do_action( 'woocommerce_before_available_downloads' );
?>
<?php if ( ! empty( $downloads ) ) : ?>
<section class="cr-account-downloads" aria-label="<?php esc_attr_e( 'Descargas', 'crios-rango-2026' ); ?>">
    <?php foreach ( $downloads as $download ) :
        $product_name = isset( $download['product_name'] ) ? $download['product_name'] : '';
        $download_name = isset( $download['download_name'] ) ? $download['download_name'] : __( 'Archivo descargable', 'crios-rango-2026' );
        $download_url = isset( $download['download_url'] ) ? $download['download_url'] : '';
        $remaining = isset( $download['downloads_remaining'] ) ? $download['downloads_remaining'] : '';
        $expires = isset( $download['access_expires'] ) ? $download['access_expires'] : false;
    ?>
    <article class="cr-account-download">
        <div class="cr-account-download__copy">
            <strong><?php echo esc_html( $download_name ); ?></strong>
            <?php if ( $product_name ) : ?><span><?php echo esc_html( $product_name ); ?></span><?php endif; ?>
            <?php if ( '' !== (string) $remaining ) : ?><span><?php echo esc_html( sprintf( __( 'Descargas restantes: %s', 'crios-rango-2026' ), $remaining ) ); ?></span><?php endif; ?>
            <?php if ( $expires ) : ?><span><?php echo esc_html( sprintf( __( 'Acceso hasta: %s', 'crios-rango-2026' ), wc_format_datetime( $expires ) ) ); ?></span><?php endif; ?>
        </div>
        <?php if ( $download_url ) : ?><a class="cr-account-download__link" href="<?php echo esc_url( $download_url ); ?>"><?php esc_html_e( 'Descargar', 'crios-rango-2026' ); ?></a><?php endif; ?>
    </article>
    <?php endforeach; ?>
</section>
<?php else : ?>
<div class="cr-account-empty-state"><?php esc_html_e( 'Todavía no tienes descargas disponibles.', 'crios-rango-2026' ); ?></div>
<?php endif; ?>
<?php do_action( 'woocommerce_after_available_downloads' ); ?>
