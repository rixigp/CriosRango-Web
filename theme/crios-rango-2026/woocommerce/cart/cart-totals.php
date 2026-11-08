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
 <div class="cr-cart-summary__rows" data-cr-summary-rows>
  <div class="cr-cart-summary__row cr-cart-summary__row--subtotal"><span class="cr-cart-summary__label"><?php esc_html_e( 'Subtotal', 'woocommerce' ); ?></span><span class="cr-cart-summary__value" data-cr-summary-subtotal><?php echo wp_kses_post( wc_price( $cr_merchandise_before_shipping ) ); ?></span></div>
  <?php if ( $cr_discount_amount > 0 ) : ?><div class="cr-cart-summary__row cr-cart-summary__row--discount"><span class="cr-cart-summary__label"><?php esc_html_e( 'Descuentos', 'crios-rango-2026' ); ?></span><span class="cr-cart-summary__value" data-cr-summary-discount>-<?php echo wp_kses_post( wc_price( $cr_discount_amount ) ); ?></span></div><?php endif; ?>
  <?php foreach ( $cr_cart->get_fees() as $fee ) : ?><div class="cr-cart-summary__row cr-cart-summary__row--fee"><span class="cr-cart-summary__label"><?php echo esc_html( $fee->name ); ?></span><span class="cr-cart-summary__value"><?php wc_cart_totals_fee_html( $fee ); ?></span></div><?php endforeach; ?>
  <?php do_action( 'woocommerce_cart_totals_before_shipping' ); ?>
  <div class="cr-cart-summary__row cr-cart-summary__row--shipping"><span class="cr-cart-summary__label"><?php esc_html_e( 'Envío', 'woocommerce' ); ?></span><span class="cr-cart-summary__value" data-cr-summary-shipping><?php echo $cr_shipping_is_presented_free ? esc_html__( 'Gratis', 'crios-rango-2026' ) : esc_html__( 'Se calcula en el checkout', 'crios-rango-2026' ); ?></span></div>
  <?php do_action( 'woocommerce_cart_totals_after_shipping' ); do_action( 'woocommerce_cart_totals_before_order_total' ); ?>
  <div class="cr-cart-summary__row cr-cart-summary__row--total"><span class="cr-cart-summary__label"><?php esc_html_e( 'Total', 'woocommerce' ); ?></span><span class="cr-cart-summary__value" data-cr-summary-total><?php echo wp_kses_post( wc_price( $cr_merchandise_after_discounts ) ); ?></span></div>
  <?php do_action( 'woocommerce_cart_totals_after_order_total' ); ?>
 </div>
 <div class="wc-proceed-to-checkout"><?php do_action( 'woocommerce_proceed_to_checkout' ); ?></div>
 <?php do_action( 'woocommerce_after_cart_totals' ); ?>
</div>