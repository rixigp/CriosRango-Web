<?php
/**
 * App-style cart totals presentation; all monetary values and calculations
 * remain delegated to WooCommerce native cart-total helpers and hooks.
 *
 * @package CriosRango2026
 */
defined( 'ABSPATH' ) || exit;
?>
<div class="cart_totals<?php echo WC()->customer->has_calculated_shipping() ? ' calculated_shipping' : ''; ?>">
    <?php do_action( 'woocommerce_before_cart_totals' ); ?>

    <h2><?php esc_html_e( 'Resumen', 'crios-rango-2026' ); ?></h2>

    <table class="shop_table shop_table_responsive">
        <tbody>
            <tr class="cart-subtotal">
                <th><?php esc_html_e( 'Subtotal', 'woocommerce' ); ?></th>
                <td data-title="<?php esc_attr_e( 'Subtotal', 'woocommerce' ); ?>"><?php wc_cart_totals_subtotal_html(); ?></td>
            </tr>

            <?php foreach ( WC()->cart->get_coupons() as $code => $coupon ) : ?>
                <tr class="cart-discount coupon-<?php echo esc_attr( sanitize_title( $code ) ); ?>">
                    <th><?php wc_cart_totals_coupon_label( $coupon ); ?></th>
                    <td data-title="<?php echo esc_attr( wc_cart_totals_coupon_label( $coupon, false ) ); ?>"><?php wc_cart_totals_coupon_html( $coupon ); ?></td>
                </tr>
            <?php endforeach; ?>

            <?php foreach ( WC()->cart->get_fees() as $fee ) : ?>
                <tr class="fee">
                    <th><?php echo esc_html( $fee->name ); ?></th>
                    <td data-title="<?php echo esc_attr( $fee->name ); ?>"><?php wc_cart_totals_fee_html( $fee ); ?></td>
                </tr>
            <?php endforeach; ?>

            <?php if ( WC()->cart->needs_shipping() && WC()->cart->show_shipping() ) : ?>
                <?php do_action( 'woocommerce_cart_totals_before_shipping' ); ?>
                <?php wc_cart_totals_shipping_html(); ?>
                <?php do_action( 'woocommerce_cart_totals_after_shipping' ); ?>
            <?php elseif ( WC()->cart->needs_shipping() && 'yes' === get_option( 'woocommerce_enable_shipping_calc' ) ) : ?>
                <tr class="shipping">
                    <th><?php esc_html_e( 'Envío', 'woocommerce' ); ?></th>
                    <td data-title="<?php esc_attr_e( 'Envío', 'woocommerce' ); ?>"><?php woocommerce_shipping_calculator(); ?></td>
                </tr>
            <?php endif; ?>

            <?php foreach ( WC()->cart->get_tax_totals() as $code => $tax ) : ?>
                <tr class="tax-rate tax-rate-<?php echo esc_attr( sanitize_title( $code ) ); ?>">
                    <th><?php echo esc_html( $tax->label ); ?></th>
                    <td data-title="<?php echo esc_attr( $tax->label ); ?>"><?php echo wp_kses_post( $tax->formatted_amount ); ?></td>
                </tr>
            <?php endforeach; ?>

            <?php do_action( 'woocommerce_cart_totals_before_order_total' ); ?>
            <tr class="order-total">
                <th><?php esc_html_e( 'Total', 'woocommerce' ); ?></th>
                <td data-title="<?php esc_attr_e( 'Total', 'woocommerce' ); ?>"><?php wc_cart_totals_order_total_html(); ?></td>
            </tr>
            <?php do_action( 'woocommerce_cart_totals_after_order_total' ); ?>
        </tbody>
    </table>

    <div class="wc-proceed-to-checkout">
        <?php do_action( 'woocommerce_proceed_to_checkout' ); ?>
    </div>

    <?php do_action( 'woocommerce_after_cart_totals' ); ?>
</div>
