<?php
/**
 * Cart summary presentation only. No WooCommerce shipping/calculation settings are changed.
 * Display threshold source: merchandise subtotal + merchandise tax, pre-discount and pre-shipping.
 */
defined( 'ABSPATH' ) || exit;
$cr_cart = WC()->cart;
$cr_merchandise_before_shipping = (float) $cr_cart->get_subtotal() + (float) $cr_cart->get_subtotal_tax();
$cr_shipping_is_presented_free = $cr_merchandise_before_shipping > 50;
$cr_discount_amount = (float) $cr_cart->get_discount_total() + (float) $cr_cart->get_discount_tax();
$cr_merchandise_after_discounts = (float) $cr_cart->get_cart_contents_total() + (float) $cr_cart->get_cart_contents_tax() + (float) $cr_cart->get_fee_total() + (float) $cr_cart->get_fee_tax();
?>
<div class="cart_totals<?php echo WC()->customer->has_calculated_shipping() ? ' calculated_shipping' : ''; ?>" data-cr-cart-summary>
 <?php do_action( 'woocommerce_before_cart_totals' ); ?>
 <h2><?php esc_html_e( 'Resumen', 'crios-rango-2026' ); ?></h2>
 <table class="shop_table shop_table_responsive"><tbody>
  <tr class="cart-subtotal"><th><?php esc_html_e( 'Subtotal', 'woocommerce' ); ?></th><td data-cr-summary-subtotal><?php echo wp_kses_post( wc_price( $cr_merchandise_before_shipping ) ); ?></td></tr>
  <?php if ( $cr_discount_amount > 0 ) : ?><tr class="cart-discount cr-cart-summary-discount"><th><?php esc_html_e( 'Descuentos', 'crios-rango-2026' ); ?></th><td data-cr-summary-discount>-<?php echo wp_kses_post( wc_price( $cr_discount_amount ) ); ?></td></tr><?php endif; ?>
  <?php foreach ( $cr_cart->get_fees() as $fee ) : ?><tr class="fee"><th><?php echo esc_html( $fee->name ); ?></th><td><?php wc_cart_totals_fee_html( $fee ); ?></td></tr><?php endforeach; ?>
  <?php do_action( 'woocommerce_cart_totals_before_shipping' ); ?>
  <tr class="shipping cr-cart-shipping-pending"><th><?php esc_html_e( 'Envío', 'woocommerce' ); ?></th><td data-cr-summary-shipping><span class="cr-cart-shipping-pending__label"><?php echo $cr_shipping_is_presented_free ? esc_html__( 'Gratis', 'crios-rango-2026' ) : esc_html__( 'Se calcula en el checkout', 'crios-rango-2026' ); ?></span></td></tr>
  <?php do_action( 'woocommerce_cart_totals_after_shipping' ); do_action( 'woocommerce_cart_totals_before_order_total' ); ?>
  <tr class="order-total"><th><?php esc_html_e( 'Total', 'woocommerce' ); ?></th><td data-cr-summary-total><strong><?php echo wp_kses_post( wc_price( $cr_merchandise_after_discounts ) ); ?></strong></td></tr>
  <?php do_action( 'woocommerce_cart_totals_after_order_total' ); ?>
 </tbody></table>
 <div class="wc-proceed-to-checkout"><?php do_action( 'woocommerce_proceed_to_checkout' ); ?></div>
 <?php do_action( 'woocommerce_after_cart_totals' ); ?>
</div>