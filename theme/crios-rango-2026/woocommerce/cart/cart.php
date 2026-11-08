<?php
/**
 * App-style cart layout. Keeps WooCommerce cart form, quantity input,
 * remove URL, calculations and cart-collaterals hooks authoritative.
 *
 * @package CriosRango2026
 */
defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_before_cart' );
?>
<section class="cr-cart-page" aria-labelledby="cr-cart-title">
    <div class="cr-cart-heading">
        <a class="cr-cart-back" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>" aria-label="<?php esc_attr_e( 'Volver a la tienda', 'crios-rango-2026' ); ?>">
            <span aria-hidden="true">←</span>
        </a>
        <h1 id="cr-cart-title"><?php esc_html_e( 'Tu carrito', 'crios-rango-2026' ); ?></h1>
        <?php if ( ! WC()->cart->is_empty() ) : ?>
            <form class="cr-cart-empty-form" method="post" action="<?php echo esc_url( wc_get_cart_url() ); ?>">
                <?php wp_nonce_field( 'cr2026_empty_cart', 'cr2026_empty_cart_nonce' ); ?>
                <button type="submit" name="cr2026_empty_cart" value="1"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m3 3v7m6-7v7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span><?php esc_html_e( 'Vaciar carrito', 'crios-rango-2026' ); ?></span></button>
            </form>
        <?php endif; ?>
    </div>

    <?php if ( WC()->cart->is_empty() ) : ?>
        <div class="cr-cart-empty-state">
            <?php wc_get_template( 'cart/cart-empty.php' ); ?>
        </div>
    <?php else : ?>
        <div class="cr-cart-layout">
            <div class="cr-cart-primary">
                <form class="woocommerce-cart-form cr-cart-form" action="<?php echo esc_url( wc_get_cart_url() ); ?>" method="post">
                    <?php do_action( 'woocommerce_before_cart_table' ); ?>
                    <table class="shop_table shop_table_responsive cart woocommerce-cart-form__contents cr-cart-table" cellspacing="0">
                        <thead class="screen-reader-text">
                            <tr>
                                <th><?php esc_html_e( 'Producto', 'crios-rango-2026' ); ?></th>
                                <th><?php esc_html_e( 'Precio', 'crios-rango-2026' ); ?></th>
                                <th><?php esc_html_e( 'Cantidad', 'crios-rango-2026' ); ?></th>
                                <th><?php esc_html_e( 'Subtotal', 'crios-rango-2026' ); ?></th>
                                <th><?php esc_html_e( 'Eliminar', 'crios-rango-2026' ); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php do_action( 'woocommerce_before_cart_contents' ); ?>
                            <?php foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) :
                                $_product   = apply_filters( 'woocommerce_cart_item_product', $cart_item['data'], $cart_item, $cart_item_key );
                                $product_id = apply_filters( 'woocommerce_cart_item_product_id', $cart_item['product_id'], $cart_item, $cart_item_key );
                                if ( ! $_product || ! $_product->exists() || $cart_item['quantity'] <= 0 || ! apply_filters( 'woocommerce_cart_item_visible', true, $cart_item, $cart_item_key ) ) {
                                    continue;
                                }
                                $product_permalink = apply_filters(
                                    'woocommerce_cart_item_permalink',
                                    $_product->is_visible() ? $_product->get_permalink( $cart_item ) : '',
                                    $cart_item,
                                    $cart_item_key
                                );
                                $thumbnail = apply_filters(
                                    'woocommerce_cart_item_thumbnail',
                                    $_product->get_image( 'woocommerce_thumbnail', array( 'class' => 'cr-cart-item__image-img', 'loading' => 'lazy', 'decoding' => 'async' ) ),
                                    $cart_item,
                                    $cart_item_key
                                );
                                $product_name = apply_filters(
                                    'woocommerce_cart_item_name',
                                    $_product->get_name(),
                                    $cart_item,
                                    $cart_item_key
                                );
                                // Display the parent product title for variations; keep the stored cart item untouched.
                                $cart_display_name = $product_name;
                                if ( $_product->is_type( 'variation' ) && $_product->get_parent_id() ) {
                                    $parent_product = wc_get_product( $_product->get_parent_id() );
                                    if ( $parent_product instanceof WC_Product && $parent_product->exists() ) {
                                        $cart_display_name = $parent_product->get_name();
                                    }
                                }
                                $product_price = apply_filters(
                                    'woocommerce_cart_item_price',
                                    WC()->cart->get_product_price( $_product ),
                                    $cart_item,
                                    $cart_item_key
                                );
                                $product_subtotal = apply_filters(
                                    'woocommerce_cart_item_subtotal',
                                    WC()->cart->get_product_subtotal( $_product, $cart_item['quantity'] ),
                                    $cart_item,
                                    $cart_item_key
                                );
                                $quantity_html = woocommerce_quantity_input(
                                    array(
                                        'input_name'   => "cart[{$cart_item_key}][qty]",
                                        'input_value'  => $cart_item['quantity'],
                                        'max_value'    => $_product->get_max_purchase_quantity(),
                                        'min_value'    => $_product->get_min_purchase_quantity(),
                                        'product_name' => $_product->get_name(),
                                    ),
                                    $_product,
                                    false
                                );
                                $quantity_html = apply_filters( 'woocommerce_cart_item_quantity', $quantity_html, $cart_item_key, $cart_item );
                                // Pass the parent display name so WooCommerce does not suppress attributes
                                // already embedded in the variation's own title.
                                $variation_html = wc_get_formatted_cart_item_data( $cart_item, false, $cart_display_name );
                                $remove_url = wc_get_cart_remove_url( $cart_item_key );
                                $remove_link = sprintf(
                                    '<a href="%s" class="cr-cart-remove" aria-label="%s"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m3 3v7m6-7v7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span>%s</span></a>',
                                    esc_url( $remove_url ),
                                    esc_attr( sprintf( __( 'Eliminar %s del carrito', 'crios-rango-2026' ), wp_strip_all_tags( $_product->get_name() ) ) ),
                                    esc_html__( 'Eliminar', 'crios-rango-2026' )
                                );
                                $remove_link = apply_filters( 'woocommerce_cart_item_remove_link', $remove_link, $cart_item_key );
                                ?>
                                <tr class="woocommerce-cart-form__cart-item cart_item cr-cart-item">
                                    <td class="cr-cart-item-cell" colspan="6">
                                        <article class="cr-cart-item__card">
                                            <div class="cr-cart-item__main">
                                                <div class="cr-cart-item__media">
                                                    <?php if ( $product_permalink ) : ?>
                                                        <a href="<?php echo esc_url( $product_permalink ); ?>"><?php echo wp_kses_post( $thumbnail ); ?></a>
                                                    <?php else : ?>
                                                        <?php echo wp_kses_post( $thumbnail ); ?>
                                                    <?php endif; ?>
                                                </div>
                                                <div class="cr-cart-item__content">
                                                    <div class="cr-cart-item__name">
                                                        <?php if ( $product_permalink ) : ?>
                                                            <a href="<?php echo esc_url( $product_permalink ); ?>"><?php echo wp_kses_post( $cart_display_name ); ?></a>
                                                        <?php else : ?>
                                                            <?php echo wp_kses_post( $cart_display_name ); ?>
                                                        <?php endif; ?>
                                                    </div>
                                                    <?php if ( ! empty( $variation_html ) ) : ?>
                                                        <div class="cr-cart-item__variations"><?php echo $variation_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
                                                    <?php endif; ?>
                                                    <?php if ( $_product->backorders_require_notification() && $_product->is_on_backorder( $cart_item['quantity'] ) ) : ?>
                                                        <p class="backorder_notification"><?php esc_html_e( 'Disponible bajo pedido', 'crios-rango-2026' ); ?></p>
                                                    <?php endif; ?>
                                                    <div class="cr-cart-item__unit"><span class="screen-reader-text"><?php esc_html_e( 'Precio unitario', 'crios-rango-2026' ); ?></span><?php echo wp_kses_post( $product_price ); ?> <span class="cr-cart-item__unit-label">/ ud.</span></div>
                                                    <div class="cr-cart-item__subtotal"><span><?php esc_html_e( 'Subtotal', 'crios-rango-2026' ); ?></span> <?php echo wp_kses_post( $product_subtotal ); ?></div>
                                                </div>
                                            </div>
                                            <div class="cr-cart-item__actions">
                                                <div class="cr-cart-quantity" data-cr-cart-quantity>
                                                    <button type="button" class="cr-cart-quantity__button" data-cr-qty-change="-1" aria-label="<?php esc_attr_e( 'Reducir cantidad', 'crios-rango-2026' ); ?>">−</button>
                                                    <?php echo $quantity_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                                                    <button type="button" class="cr-cart-quantity__button" data-cr-qty-change="1" aria-label="<?php esc_attr_e( 'Aumentar cantidad', 'crios-rango-2026' ); ?>">+</button>
                                                </div>
                                                <?php echo $remove_link; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                                            </div>
                                        </article>
                                    </td>
                                </tr>                           </tr>
                            <?php endforeach; ?>
                            <?php do_action( 'woocommerce_cart_contents' ); ?>
                            <?php do_action( 'woocommerce_after_cart_contents' ); ?>
                        </tbody>
                    </table>
                    <div class="cr-cart-form-actions">
                        <button type="submit" class="button" name="update_cart" value="<?php esc_attr_e( 'Actualizar carrito', 'woocommerce' ); ?>"><?php esc_html_e( 'Actualizar carrito', 'woocommerce' ); ?></button>
                        <?php do_action( 'woocommerce_cart_actions' ); ?>
                        <?php wp_nonce_field( 'woocommerce-cart', 'woocommerce-cart-nonce' ); ?>
                    </div>
                    <?php do_action( 'woocommerce_after_cart_table' ); ?>
                </form>

                <section class="cr-cart-promotions" data-cr-cart-promotions aria-labelledby="cr-cart-promotions-title">
                    <h2 id="cr-cart-promotions-title"><?php esc_html_e( 'Promociones y descuentos', 'crios-rango-2026' ); ?></h2>
                    <div class="cr-cart-promotions__loading" data-cr-cart-loading><?php esc_html_e( 'Cargando promociones…', 'crios-rango-2026' ); ?></div>
                    <div class="cr-cart-wallet" data-cr-cart-wallet hidden></div>
                    <div class="cr-cart-promotions__available" data-cr-cart-promotions-list></div>
                    <div class="cr-cart-applied" data-cr-cart-applied hidden></div>
                    <details class="cr-cart-manual-coupon">
                        <summary><?php esc_html_e( 'Tengo otro código de descuento', 'crios-rango-2026' ); ?></summary>
                        <form data-cr-cart-manual-form>
                            <label class="screen-reader-text" for="cr-cart-coupon-code"><?php esc_html_e( 'Código de descuento', 'crios-rango-2026' ); ?></label>
                            <input id="cr-cart-coupon-code" name="code" type="text" autocomplete="off" placeholder="<?php esc_attr_e( 'Introduce tu código', 'crios-rango-2026' ); ?>" required>
                            <button type="submit" class="button"><?php esc_html_e( 'Aplicar', 'crios-rango-2026' ); ?></button>
                        </form>
                    </details>
                    <p class="cr-cart-feedback" data-cr-cart-feedback role="status" aria-live="polite" hidden></p>
                </section>
            </div>

            <?php do_action( 'woocommerce_before_cart_collaterals' ); ?>
            <aside class="cart-collaterals cr-cart-summary" aria-label="<?php esc_attr_e( 'Resumen del carrito', 'crios-rango-2026' ); ?>">
                <?php do_action( 'woocommerce_cart_collaterals' ); ?>
            </aside>
        </div>
    <?php endif; ?>
</section>
<?php do_action( 'woocommerce_after_cart' ); ?>
