<?php
/**
 * App-style cart totals presentation; calculations remain native WooCommerce.
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
                <td><?php wc_cart_totals_subtotal_html(); ?></td>
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
            <?php elseif ( WC()->cart->needs_shipping() ) : ?>
                <tr class="shipping cr-cart-shipping-pending">
                    <th><?php esc_html_e( 'Envío', 'woocommerce' ); ?></th>
                    <td data-title="<?php esc_attr_e( 'Envío', 'woocommerce' ); ?>">
                        <span class="cr-cart-shipping-pending__label"><?php esc_html_e( 'Se calcula en el checkout', 'crios-rango-2026' ); ?></span>

                    </td>
                </tr>
            <?php endif; ?>
            <?php do_action( 'woocommerce_cart_totals_before_order_total' ); ?>
            <tr class="order-total">
                <th><?php esc_html_e( 'Total', 'woocommerce' ); ?></th>
                <td data-title="<?php esc_attr_e( 'Total', 'woocommerce' ); ?>">
                    <strong><?php echo wp_kses_post( wc_price( WC()->cart->get_total( 'edit' ) ) ); ?></strong>

                </td>
            </tr>
            <?php do_action( 'woocommerce_cart_totals_after_order_total' ); ?>
        </tbody>
    </table>
    <div class="wc-proceed-to-checkout"><?php do_action( 'woocommerce_proceed_to_checkout' ); ?></div>
    <?php do_action( 'woocommerce_after_cart_totals' ); ?>
</div>
