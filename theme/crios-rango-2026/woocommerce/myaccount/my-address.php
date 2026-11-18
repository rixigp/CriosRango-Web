<?php
/**
 * Críos & Rango account address overview: the operational address is shipping.
 *
 * @package WooCommerce\\Templates
 */
defined( 'ABSPATH' ) || exit;
$customer_id = get_current_user_id();
$formatted_address = wc_get_account_formatted_address( 'shipping', $customer_id );
$edit_url = wc_get_endpoint_url( 'edit-address', 'envio', wc_get_page_permalink( 'myaccount' ) );
?>
<section class="cr-account-addresses" aria-label="<?php esc_attr_e( 'Dirección', 'crios-rango-2026' ); ?>">
    <?php if ( $formatted_address ) : ?>
        <article class="cr-account-address-card">
            <header class="cr-account-address-card__header">
                <h2><?php esc_html_e( 'Dirección', 'crios-rango-2026' ); ?></h2>
                <a class="cr-account-address-card__edit" href="<?php echo esc_url( $edit_url ); ?>"><?php esc_html_e( 'Editar', 'crios-rango-2026' ); ?></a>
            </header>
            <address><?php echo wp_kses_post( $formatted_address ); ?></address>
            <?php do_action( 'woocommerce_my_account_after_my_address', 'shipping' ); ?>
        </article>
    <?php else : ?>
        <div class="cr-account-empty-state"><?php esc_html_e( 'Todavía no tienes una dirección guardada.', 'crios-rango-2026' ); ?></div>
    <?php endif; ?>
</section>
