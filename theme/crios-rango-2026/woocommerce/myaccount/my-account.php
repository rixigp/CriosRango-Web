<?php
/**
 * Universal Críos & Rango Account shell. WooCommerce retains endpoint routing,
 * customer data, validation, persistence and endpoint callbacks.
 *
 * @package WooCommerce\Templates
 */
defined( 'ABSPATH' ) || exit;
?>
<div class="cr-account-shell">
    <div class="woocommerce">
        <?php do_action( 'woocommerce_before_my_account' ); ?>
        <div class="woocommerce-MyAccount-content cr-account-shell__content">
            <?php do_action( 'woocommerce_account_content' ); ?>
        </div>
        <?php do_action( 'woocommerce_after_my_account' ); ?>
    </div>
</div>
