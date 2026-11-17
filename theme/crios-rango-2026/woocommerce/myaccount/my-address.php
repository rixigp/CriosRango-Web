<?php
/**
 * Críos & Rango address overview using WooCommerce customer address data.
 *
 * @package WooCommerce\Templates
 */
defined( 'ABSPATH' ) || exit;
$customer_id = get_current_user_id();
$has_address = false;
$addresses = apply_filters(
    'woocommerce_my_account_get_addresses',
    array(
        'billing'  => __( 'Dirección de facturación', 'woocommerce' ),
        'shipping' => __( 'Dirección de envío', 'woocommerce' ),
    ),
    $customer_id
);
?>
<section class="cr-account-addresses" aria-label="<?php esc_attr_e( 'Direcciones', 'crios-rango-2026' ); ?>">
    <?php foreach ( $addresses as $name => $title ) :
        $formatted_address = wc_get_account_formatted_address( $name, $customer_id );
        if ( ! $formatted_address ) { continue; }
        $has_address = true;
        $edit_url = wc_get_endpoint_url( 'edit-address', $name, wc_get_page_permalink( 'myaccount' ) );
    ?>
        <article class="cr-account-address-card">
            <header class="cr-account-address-card__header">
                <h2><?php echo esc_html( $title ); ?></h2>
                <a class="cr-account-address-card__edit" href="<?php echo esc_url( $edit_url ); ?>"><?php esc_html_e( 'Editar', 'crios-rango-2026' ); ?></a>
            </header>
            <address><?php echo wp_kses_post( $formatted_address ); ?></address>
            <?php do_action( 'woocommerce_my_account_after_my_address', $name ); ?>
        </article>
    <?php endforeach; ?>
    <?php if ( ! $has_address ) : ?>
        <div class="cr-account-empty-state"><?php esc_html_e( 'Todavía no tienes direcciones guardadas.', 'crios-rango-2026' ); ?></div>
    <?php endif; ?>
</section>
