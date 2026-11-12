<?php
/**
 * Mobile account orders presentation using WooCommerce's native account query.
 *
 * @package WooCommerce\Templates
 * @version 9.5.0
 */
defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_before_account_orders', $has_orders );

$account_url = wc_get_page_permalink( 'myaccount' );
$shop_url = apply_filters( 'woocommerce_return_to_shop_redirect', wc_get_page_permalink( 'shop' ) );
?>
<section class="cr-account-orders" aria-labelledby="cr-account-orders-title">
    <?php if ( function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) : ?>
        <?php cr2026_render_category_toolbar( __( 'Pedidos', 'crios-rango-2026' ), $account_url, 'parent', false, '', 'cr-account-orders-title' ); ?>
    <?php else : ?>
        <div class="cr-account-orders__desktop-toolbar">
            <a class="cr-account-orders__back" href="<?php echo esc_url( $account_url ); ?>" aria-label="<?php esc_attr_e( 'Volver a Cuenta', 'crios-rango-2026' ); ?>">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7"></path></svg>
            </a>
            <h1 id="cr-account-orders-title" class="cr-account-orders__desktop-title"><?php esc_html_e( 'Pedidos', 'crios-rango-2026' ); ?></h1>
        </div>
    <?php endif; ?>

    <?php if ( $has_orders ) : ?>
        <div class="cr-account-orders__filters" role="group" aria-label="<?php esc_attr_e( 'Filtrar pedidos', 'crios-rango-2026' ); ?>">
            <button type="button" class="is-active" data-cr-order-filter="all" aria-pressed="true"><?php esc_html_e( 'Todos', 'crios-rango-2026' ); ?></button>
            <button type="button" data-cr-order-filter="waiting" aria-pressed="false"><?php esc_html_e( 'En espera', 'crios-rango-2026' ); ?></button>
            <button type="button" data-cr-order-filter="processing" aria-pressed="false"><?php esc_html_e( 'Procesando', 'crios-rango-2026' ); ?></button>
            <button type="button" data-cr-order-filter="completed" aria-pressed="false"><?php esc_html_e( 'Completado', 'crios-rango-2026' ); ?></button>
            <button type="button" data-cr-order-filter="refunded" aria-pressed="false"><?php esc_html_e( 'Reembolsado', 'crios-rango-2026' ); ?></button>
            <button type="button" data-cr-order-filter="cancelled" aria-pressed="false"><?php esc_html_e( 'Cancelado', 'crios-rango-2026' ); ?></button>
        </div>

        <div class="cr-account-orders__list" data-cr-orders-list>
            <?php foreach ( $customer_orders->orders as $customer_order ) :
                $order = wc_get_order( $customer_order );
                if ( ! $order instanceof WC_Order ) {
                    continue;
                }

                $status = $order->get_status();
                $filter_status = in_array( $status, array( 'pending', 'on-hold' ), true )
                    ? 'waiting'
                    : ( in_array( $status, array( 'processing', 'completed', 'refunded', 'cancelled' ), true ) ? $status : 'other' );

                $created = $order->get_date_created();
                $image_url = '';
                foreach ( $order->get_items() as $order_item ) {
                    if ( ! $order_item instanceof WC_Order_Item_Product ) {
                        continue;
                    }

                    $item_product = $order_item->get_product();
                    if ( ! $item_product instanceof WC_Product ) {
                        $item_product = wc_get_product( $order_item->get_product_id() );
                    }
                    if ( ! $item_product instanceof WC_Product ) {
                        continue;
                    }

                    // Prefer the variation's own image, then its parent, then the order item's product.
                    $image_candidates = array( $item_product );
                    if ( $item_product->is_type( 'variation' ) ) {
                        $parent_product = wc_get_product( $item_product->get_parent_id() );
                        if ( $parent_product instanceof WC_Product ) {
                            $image_candidates[] = $parent_product;
                        }
                    }
                    $order_item_product = wc_get_product( $order_item->get_product_id() );
                    if ( $order_item_product instanceof WC_Product ) {
                        $image_candidates[] = $order_item_product;
                    }

                    foreach ( $image_candidates as $image_candidate ) {
                        $image_id = (int) $image_candidate->get_image_id();
                        if ( ! $image_id || ! wp_attachment_is_image( $image_id ) ) {
                            continue;
                        }

                        $resolved_image_url = wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
                        if ( is_string( $resolved_image_url ) && '' !== $resolved_image_url && wp_http_validate_url( $resolved_image_url ) ) {
                            $image_url = $resolved_image_url;
                            break 2;
                        }
                    }
                }

                $view_url = $order->get_view_order_url();
            ?>
                <article class="cr-account-order" data-cr-order-card data-status="<?php echo esc_attr( $filter_status ); ?>">
                    <div class="cr-account-order__top">
                        <span class="cr-account-order__thumbnail" aria-hidden="true">
                            <?php if ( $image_url ) : ?>
                                <img src="<?php echo esc_url( $image_url ); ?>" alt="" loading="lazy" decoding="async">
                            <?php else : ?>
                                <span class="cr-account-order__placeholder"><?php echo cr2026_icon( 'bag' ); ?></span>
                            <?php endif; ?>
                        </span>
                        <div class="cr-account-order__details">
                            <strong class="cr-account-order__number"><?php echo esc_html( sprintf( __( 'Pedido #%s', 'crios-rango-2026' ), $order->get_order_number() ) ); ?></strong>
                            <?php if ( $created ) : ?>
                                <time datetime="<?php echo esc_attr( $created->date( 'c' ) ); ?>"><?php echo esc_html( sprintf( __( 'Realizado el %s', 'crios-rango-2026' ), wc_format_datetime( $created, 'd-m-Y' ) ) ); ?></time>
                            <?php endif; ?>
                            <span class="cr-account-order__total"><?php echo wp_kses_post( sprintf( __( 'Total: %s', 'crios-rango-2026' ), $order->get_formatted_order_total() ) ); ?></span>
                        </div>
                        <span class="cr-account-order__status cr-account-order__status--<?php echo esc_attr( sanitize_html_class( $status ) ); ?>"><?php echo esc_html( wc_get_order_status_name( $status ) ); ?></span>
                    </div>
                    <div class="cr-account-order__bottom">
                        <a class="cr-account-order__view" href="<?php echo esc_url( $view_url ); ?>"><?php esc_html_e( 'Ver detalle', 'crios-rango-2026' ); ?><span aria-hidden="true">›</span></a>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
        <p class="cr-account-orders__filter-empty" data-cr-orders-filter-empty hidden><?php esc_html_e( 'No hay pedidos en esta categoría.', 'crios-rango-2026' ); ?></p>

        <?php do_action( 'woocommerce_before_account_orders_pagination' ); ?>
        <?php if ( 1 < $customer_orders->max_num_pages ) : ?>
            <nav class="cr-account-orders__pagination woocommerce-pagination woocommerce-pagination--without-numbers woocommerce-Pagination" aria-label="<?php esc_attr_e( 'Paginación de pedidos', 'crios-rango-2026' ); ?>">
                <?php if ( 1 !== $current_page ) : ?>
                    <a class="woocommerce-button woocommerce-button--previous button" href="<?php echo esc_url( wc_get_endpoint_url( 'orders', $current_page - 1 ) ); ?>"><?php esc_html_e( 'Anteriores', 'crios-rango-2026' ); ?></a>
                <?php endif; ?>
                <?php if ( (int) $customer_orders->max_num_pages !== (int) $current_page ) : ?>
                    <a class="woocommerce-button woocommerce-button--next button" href="<?php echo esc_url( wc_get_endpoint_url( 'orders', $current_page + 1 ) ); ?>"><?php esc_html_e( 'Siguientes', 'crios-rango-2026' ); ?></a>
                <?php endif; ?>
            </nav>
        <?php endif; ?>
    <?php else : ?>
        <div class="cr-account-orders__empty">
            <span class="cr-account-orders__empty-icon" aria-hidden="true"><?php echo cr2026_icon( 'bag' ); ?></span>
            <p><?php esc_html_e( 'Todavía no tienes pedidos.', 'crios-rango-2026' ); ?></p>
            <a href="<?php echo esc_url( $shop_url ); ?>"><?php esc_html_e( 'Volver a la tienda', 'crios-rango-2026' ); ?></a>
        </div>
    <?php endif; ?>
</section>
<?php do_action( 'woocommerce_after_account_orders', $has_orders ); ?>
