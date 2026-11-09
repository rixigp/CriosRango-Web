<?php
/**
 * Review order table
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/checkout/review-order.php.
 *
 * HOWEVER, on occasion WooCommerce will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the template file will be bumped and the readme will
 * list any important changes.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\\Templates
 * @version 11.2.0
 */

defined( 'ABSPATH' ) || exit;
?>
<table class="shop_table woocommerce-checkout-review-order-table">
	<thead>
		<tr>
			<th class="product-name"><?php esc_html_e( 'Product', 'woocommerce' ); ?></th>
			<th class="product-total"><?php esc_html_e( 'Subtotal', 'woocommerce' ); ?></th>
		</tr>
	</thead>
	<tbody>
		<?php if ( WC()->cart->needs_shipping() && WC()->cart->show_shipping() ) : ?>
			<tr class="cr-checkout-shipping-section-row">
				<td colspan="2">
					<div class="cr-checkout-shipping-section">
						<div class="cr-checkout-delivery-heading cr-checkout-shipping-heading"><span class="cr-checkout-delivery-heading__step" aria-hidden="true">2</span><h2><?php esc_html_e( 'Envío', 'crios-rango-2026' ); ?></h2></div>
						<table class="cr-checkout-shipping-table">
							<tbody>
								<?php do_action( 'woocommerce_review_order_before_shipping' ); ?>
																<?php wc_cart_totals_shipping_html(); ?>
																<?php do_action( 'woocommerce_review_order_after_shipping' ); ?>
							</tbody>
						</table>
					</div>
				</td>
			</tr>
		<?php endif; ?>
	</tbody>
	<tbody class="cr-checkout-summary-heading">
		<tr class="cr-checkout-summary-heading-row">
			<td colspan="2">
				<div class="cr-checkout-delivery-heading cr-checkout-summary-heading"><span class="cr-checkout-delivery-heading__step" aria-hidden="true">3</span><h2><?php esc_html_e( 'Resumen', 'crios-rango-2026' ); ?></h2></div>
			</td>
		</tr>
	</tbody>
	<tbody class="cr-checkout-summary-products">
		<?php
		do_action( 'woocommerce_review_order_before_cart_contents' );

		foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
			$_product = apply_filters( 'woocommerce_cart_item_product', $cart_item['data'], $cart_item, $cart_item_key );

			/**
			 * Filter whether this cart item is visible in the checkout review order table.
			 *
			 * @since 2.1.0
			 * @param bool   $visible       Whether the cart item is visible. Default true.
			 * @param array  $cart_item     The cart item data.
			 * @param string $cart_item_key The cart item key.
			 */
			$visible = apply_filters( 'woocommerce_checkout_cart_item_visible', true, $cart_item, $cart_item_key );

			if ( $_product instanceof WC_Product && $_product->exists() && $cart_item['quantity'] > 0 && $visible ) {
				?>
				<tr class="<?php echo esc_attr( apply_filters( 'woocommerce_cart_item_class', 'cart_item', $cart_item, $cart_item_key ) ); ?>">
					<td class="product-name">
						<?php
						$cart_item_name = WC()->cart->get_item_product_name( $cart_item, $_product );
						/**
						 * This filter is documented in woocommerce/templates/cart/cart.php.
						 *
						 * @since 2.1.0
						 */
						$product_name = apply_filters( 'woocommerce_cart_item_name', $cart_item_name, $cart_item, $cart_item_key );
						?>
						<?php echo wp_kses_post( $product_name ) . '&nbsp;'; ?>
						<?php echo apply_filters( 'woocommerce_checkout_cart_item_quantity', ' <strong class="product-quantity">' . sprintf( '&times;&nbsp;%s', $cart_item['quantity'] ) . '</strong>', $cart_item, $cart_item_key ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php echo wc_get_formatted_cart_item_data( $cart_item, false, $cart_item_name ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</td>
					<td class="product-total">
						<?php echo apply_filters( 'woocommerce_cart_item_subtotal', WC()->cart->get_product_subtotal( $_product, $cart_item['quantity'] ), $cart_item, $cart_item_key ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</td>
				</tr>
				<?php
			}
		}

		do_action( 'woocommerce_review_order_after_cart_contents' );
		?>
	</tbody>
	<tfoot class="cr-checkout-summary-totals">
		<?php
		$cart                         = WC()->cart;
		$display_prices_including_tax = $cart->display_prices_including_tax();
		$summary_discount_total       = (float) $cart->get_discount_total();

		// Coupon discounts come from WooCommerce's calculated numeric totals.
		if ( $display_prices_including_tax ) {
			$summary_discount_total += (float) $cart->get_discount_tax();
		}

		// WC_Cart_Totals writes each applied fee total and tax back onto its fee
		// object. Aggregate negative fees from those calculated values, not HTML
		// or the original fee amount; keep positive fees as independent rows.
		$summary_positive_fees = array();
		foreach ( $cart->get_fees() as $fee ) {
			if ( ! isset( $fee->total ) || ! is_numeric( $fee->total ) ) {
				// Unknown extension fee shape: preserve it rather than hide it.
				$summary_positive_fees[] = $fee;
				continue;
			}

			$fee_total = (float) $fee->total;
			if ( $fee_total < 0 ) {
				$summary_discount_total += abs( $fee_total );
				if ( $display_prices_including_tax && isset( $fee->tax ) && is_numeric( $fee->tax ) ) {
					$summary_discount_total += abs( (float) $fee->tax );
				}
			} else {
				$summary_positive_fees[] = $fee;
			}
		}

		$summary_discount_total = round( $summary_discount_total, wc_get_price_decimals() );
		$summary_shipping_total = (float) $cart->get_shipping_total();
		if ( $display_prices_including_tax ) {
			$summary_shipping_total += (float) $cart->get_shipping_tax();
		}
		$summary_shipping_total = round( $summary_shipping_total, wc_get_price_decimals() );
		?>

		<tr class="cart-subtotal">
			<th><?php esc_html_e( 'Subtotal', 'woocommerce' ); ?></th>
			<td><?php wc_cart_totals_subtotal_html(); ?></td>
		</tr>

		<?php if ( $summary_discount_total > 0 ) : ?>
			<tr class="cr-checkout-summary-discounts">
				<th><?php esc_html_e( 'Descuentos', 'crios-rango-2026' ); ?></th>
				<td><?php echo wp_kses_post( wc_price( -$summary_discount_total ) ); ?></td>
			</tr>
		<?php endif; ?>

		<?php foreach ( $summary_positive_fees as $fee ) : ?>
			<tr class="fee">
				<th><?php echo esc_html( $fee->name ); ?></th>
				<td><?php wc_cart_totals_fee_html( $fee ); ?></td>
			</tr>
		<?php endforeach; ?>

		<?php if ( $summary_shipping_total > 0 ) : ?>
			<tr class="shipping">
				<th><?php esc_html_e( 'Envío', 'woocommerce' ); ?></th>
				<td><?php echo wp_kses_post( wc_price( $summary_shipping_total ) ); ?></td>
			</tr>
		<?php endif; ?>

		<?php if ( wc_tax_enabled() && ! $cart->display_prices_including_tax() ) : ?>
			<?php if ( 'itemized' === get_option( 'woocommerce_tax_total_display' ) ) : ?>
				<?php foreach ( $cart->get_tax_totals() as $code => $tax ) : // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited ?>
					<tr class="tax-rate tax-rate-<?php echo esc_attr( sanitize_title( $code ) ); ?>">
						<th><?php echo esc_html( $tax->label ); ?></th>
						<td><?php echo wp_kses_post( $tax->formatted_amount ); ?></td>
					</tr>
				<?php endforeach; ?>
			<?php else : ?>
				<tr class="tax-total">
					<th><?php echo esc_html( WC()->countries->tax_or_vat() ); ?></th>
					<td><?php wc_cart_totals_taxes_total_html(); ?></td>
				</tr>
			<?php endif; ?>
		<?php endif; ?>

		<?php do_action( 'woocommerce_review_order_before_order_total' ); ?>

		<tr class="order-total">
			<th><?php esc_html_e( 'Total', 'woocommerce' ); ?></th>
			<td><?php wc_cart_totals_order_total_html(); ?></td>
		</tr>

		<?php do_action( 'woocommerce_review_order_after_order_total' ); ?>
	</tfoot>
</table>
