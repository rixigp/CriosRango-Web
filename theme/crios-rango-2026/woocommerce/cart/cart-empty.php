<?php
/** App-style empty cart content; bypasses the legacy WooCommerce empty notice. */
defined( 'ABSPATH' ) || exit;
?>
<div class="cr-cart-empty-state__icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l2.2 12.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
</div>
<h2><?php esc_html_e( 'Tu carrito está vacío', 'crios-rango-2026' ); ?></h2>
<p class="return-to-shop">
    <a class="button wc-backward" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>"><?php esc_html_e( 'Volver a la tienda', 'crios-rango-2026' ); ?></a>
</p>