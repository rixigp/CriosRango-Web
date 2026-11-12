<?php
/**
 * Mobile app-style presentation for WooCommerce order details.
 *
 * @package WooCommerce\Templates
 */
defined( 'ABSPATH' ) || exit;

$order_id = absint( get_query_var( 'view-order' ) );
$order = wc_get_order( $order_id );
if ( ! $order instanceof WC_Order ) {
    return;
}

/* Desktop continues to use WooCommerce's standard order-detail table. */
if ( ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile()
    || (int) $order->get_customer_id() !== (int) get_current_user_id() ) {
    do_action( 'woocommerce_view_order', $order_id );
    ?>
    <p><?php echo wp_kses_post( sprintf( __( 'Order #%s was placed on %s and is currently %s.', 'woocommerce' ), $order->get_order_number(), wc_format_datetime( $order->get_date_created() ), wc_get_order_status_name( $order->get_status() ) ) ); ?></p>
    <?php if ( $order->needs_payment() ) : ?>
        <p><a href="<?php echo esc_url( $order->get_checkout_payment_url() ); ?>" class="button pay"><?php esc_html_e( 'Pay', 'woocommerce' ); ?></a></p>
    <?php endif; ?>
    <section class="woocommerce-order-details">
        <h2><?php esc_html_e( 'Order details', 'woocommerce' ); ?></h2>
        <?php do_action( 'woocommerce_order_details_table', $order_id ); ?>
    </section>
    <?php do_action( 'woocommerce_order_details_after_order_table', $order ); ?>
    <?php return;
}

$created = $order->get_date_created();
$status = $order->get_status();
$status_class = sanitize_html_class( $status );
$items = $order->get_items( 'line_item' );
$item_count = count( $items );
$shipping_method = trim( (string) $order->get_shipping_method() );
$shipping_address = trim( (string) $order->get_formatted_shipping_address() );
$shipping_total = (float) $order->get_shipping_total();
$payment_title = trim( (string) $order->get_payment_method_title() );
$payment_method = strtolower( trim( (string) $order->get_payment_method() ) );
if ( '' === $payment_title ) {
    $payment_title = $payment_method;
}
$payment_map = array(
    'bizum' => 'Bizum',
    'cecabank_gateway' => 'Tarjeta',
    'redsys' => 'Tarjeta',
    'redsys_card' => 'Tarjeta',
    'stripe' => 'Tarjeta',
    'stripe_cc' => 'Tarjeta',
    'cod' => 'Contra reembolso',
    'bacs' => 'Transferencia bancaria',
);
if ( isset( $payment_map[ $payment_method ] ) ) {
    $payment_title = $payment_map[ $payment_method ];
}
$pickup = ( false !== stripos( $shipping_method, 'recogida' ) || false !== stripos( $shipping_method, 'pickup' ) );
$store_label = $shipping_method;
$formatted_shipping = $shipping_address ? wp_strip_all_tags( str_replace( '<br/>', "\n", $shipping_address ) ) : '';

?>
<section class="cr-order-detail" aria-label="<?php esc_attr_e( 'Detalle de pedido', 'crios-rango-2026' ); ?>">
    <article class="cr-order-detail__card cr-order-detail__card--header">
        <h2 class="cr-order-detail__number"><?php echo esc_html( sprintf( __( 'Pedido #%s', 'crios-rango-2026' ), $order->get_order_number() ) ); ?></h2>
        <span class="cr-order-detail__status cr-order-detail__status--<?php echo esc_attr( $status_class ); ?>"><?php echo esc_html( wc_get_order_status_name( $status ) ); ?></span>
        <?php if ( $created ) : ?><div class="cr-order-detail__muted"><?php echo esc_html( sprintf( __( 'Realizado el %s', 'crios-rango-2026' ), wc_format_datetime( $created, 'd-m-Y' ) ) ); ?></div><?php endif; ?>
        <div class="cr-order-detail__strong"><?php echo wp_kses_post( sprintf( __( 'Total: %s', 'crios-rango-2026' ), $order->get_formatted_order_total() ) ); ?></div>
    </article>

    <article class="cr-order-detail__card cr-order-detail__card--products">
        <h2 class="cr-order-detail__heading"><?php echo cr2026_icon( 'bag' ); ?><?php echo esc_html( sprintf( __( 'Productos (%d)', 'crios-rango-2026' ), $item_count ) ); ?></h2>
        <?php foreach ( $items as $item ) :
            if ( ! $item instanceof WC_Order_Item_Product ) { continue; }
            $product = $item->get_product();
            if ( ! $product instanceof WC_Product ) { $product = wc_get_product( $item->get_product_id() ); }
            $image_url = '';
            $parent_product = null;
            if ( $product instanceof WC_Product && $product->is_type( 'variation' ) ) {
                $parent_product = wc_get_product( $product->get_parent_id() );
            }
            if ( $product instanceof WC_Product ) {
                $image_candidates = array( $product );
                if ( $parent_product instanceof WC_Product ) { $image_candidates[] = $parent_product; }
                foreach ( $image_candidates as $candidate ) {
                    $attachment_id = (int) $candidate->get_image_id();
                    if ( $attachment_id && wp_attachment_is_image( $attachment_id ) ) {
                        $candidate_url = wp_get_attachment_image_url( $attachment_id, 'woocommerce_thumbnail' );
                        if ( is_string( $candidate_url ) && '' !== $candidate_url && wp_http_validate_url( $candidate_url ) ) {
                            $image_url = $candidate_url;
                            break;
                        }
                    }
                }
            }
            /* Prefer the real parent product name for variations; never parse the item label. */
            $product_name = $item->get_name();
            if ( $parent_product instanceof WC_Product ) {
                $parent_name = trim( (string) $parent_product->get_name() );
                if ( '' !== $parent_name ) { $product_name = $parent_name; }
            }
            $meta_values = array();
            foreach ( $item->get_formatted_meta_data() as $meta ) {
                $key = trim( wp_strip_all_tags( (string) $meta->display_key ) );
                $value = trim( wp_strip_all_tags( (string) $meta->display_value ) );
                if ( '' !== $key && '' !== $value ) {
                    $meta_values[] = $key . ': ' . $value;
                }
            }
            $variation_summary = implode( ' · ', $meta_values );
            $qty = (int) $item->get_quantity();
            ?>
            <div class="cr-order-detail__product">
                <div class="cr-order-detail__image" aria-hidden="true">
                    <span class="cr-order-detail__image-placeholder"><?php echo cr2026_icon( 'bag' ); ?></span>
                    <?php if ( $image_url ) : ?><img src="<?php echo esc_url( $image_url ); ?>" alt="" loading="lazy" decoding="async"><?php endif; ?>
                </div>
                <div class="cr-order-detail__product-info">
                    <strong class="cr-order-detail__product-name"><?php echo esc_html( $product_name ); ?></strong>
                    <?php if ( '' !== $variation_summary ) : ?><span class="cr-order-detail__meta"><?php echo esc_html( $variation_summary ); ?></span><?php endif; ?>
                    <span class="cr-order-detail__meta"><?php echo esc_html( sprintf( __( 'Cantidad: %d', 'crios-rango-2026' ), $qty ) ); ?></span>
                </div>
            </div>
        <?php endforeach; ?>
    </article>

    <article class="cr-order-detail__card cr-order-detail__card--delivery">
        <h2 class="cr-order-detail__heading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg><?php esc_html_e( 'Entrega', 'crios-rango-2026' ); ?></h2>
        <?php if ( $pickup ) :
            $pickup_location = preg_replace( '/^(?:recogida\s+en\s+tienda|local\s+pickup|pickup)\s*/iu', '', $shipping_method );
            $pickup_location = trim( preg_replace( '/^[\s:–—-]+/u', '', (string) $pickup_location ) );
            if ( '' === $pickup_location ) { $pickup_location = $formatted_shipping; }
            ?>
            <div class="cr-order-detail__strong"><?php esc_html_e( 'Recogida en tienda', 'crios-rango-2026' ); ?></div>
            <?php if ( $pickup_location ) : ?><div class="cr-order-detail__address"><?php echo nl2br( esc_html( $pickup_location ) ); ?></div><?php endif; ?>
        <?php elseif ( $formatted_shipping ) : ?>
            <div class="cr-order-detail__address"><?php echo nl2br( esc_html( $formatted_shipping ) ); ?></div>
            <div class="cr-order-detail__muted"><?php echo wp_kses_post( 0.0 === $shipping_total ? __( 'Envío gratuito', 'crios-rango-2026' ) : wc_price( $shipping_total, array( 'currency' => $order->get_currency() ) ) ); ?></div>
        <?php else : ?>
            <div class="cr-order-detail__muted"><?php esc_html_e( 'Datos de entrega no disponibles', 'crios-rango-2026' ); ?></div>
            <div class="cr-order-detail__muted"><?php echo wp_kses_post( 0.0 === $shipping_total ? __( 'Envío gratuito', 'crios-rango-2026' ) : wc_price( $shipping_total, array( 'currency' => $order->get_currency() ) ) ); ?></div>
        <?php endif; ?>
    </article>

    <article class="cr-order-detail__card cr-order-detail__card--payment">
        <h2 class="cr-order-detail__heading"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M3 10h18"/></svg><?php esc_html_e( 'Pago', 'crios-rango-2026' ); ?></h2>
        <div class="cr-order-detail__strong"><?php echo esc_html( $payment_title ); ?></div>
    </article>

    <article class="cr-order-detail__card cr-order-detail__card--summary">
        <h2 class="cr-order-detail__heading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/></svg><?php esc_html_e( 'Resumen', 'crios-rango-2026' ); ?></h2>
        <div class="cr-order-detail__rows">
            <div class="cr-order-detail__row"><span><?php esc_html_e( 'Productos', 'crios-rango-2026' ); ?></span><span><?php echo wp_kses_post( wc_price( $order->get_subtotal(), array( 'currency' => $order->get_currency() ) ) ); ?></span></div>
            <?php if ( (float) $order->get_discount_total() > 0 ) : ?><div class="cr-order-detail__row"><span><?php esc_html_e( 'Descuento', 'crios-rango-2026' ); ?></span><span>−<?php echo wp_kses_post( wc_price( $order->get_discount_total(), array( 'currency' => $order->get_currency() ) ) ); ?></span></div><?php endif; ?>
            <?php foreach ( $order->get_fees() as $fee ) : ?><div class="cr-order-detail__row"><span><?php echo esc_html( $fee->get_name() ); ?></span><span><?php echo wp_kses_post( wc_price( $fee->get_total(), array( 'currency' => $order->get_currency() ) ) ); ?></span></div><?php endforeach; ?>
            <div class="cr-order-detail__row"><span><?php esc_html_e( 'Envío', 'crios-rango-2026' ); ?></span><span><?php echo wp_kses_post( 0.0 === $shipping_total ? __( 'Gratis', 'crios-rango-2026' ) : wc_price( $shipping_total, array( 'currency' => $order->get_currency() ) ) ); ?></span></div>
            <?php if ( (float) $order->get_total_tax() > 0 ) : ?><div class="cr-order-detail__row"><span><?php esc_html_e( 'Impuestos', 'crios-rango-2026' ); ?></span><span><?php echo wp_kses_post( wc_price( $order->get_total_tax(), array( 'currency' => $order->get_currency() ) ) ); ?></span></div><?php endif; ?>
            <div class="cr-order-detail__divider"></div>
            <div class="cr-order-detail__row cr-order-detail__row--total"><span><?php esc_html_e( 'Total', 'crios-rango-2026' ); ?></span><span><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></span></div>
        </div>
    </article>
</section>
