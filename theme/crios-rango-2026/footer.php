<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$is_app_home = is_front_page();
$cart_count  = cr2026_cart_count();

$is_product_category = function_exists( 'is_product_category' ) && is_product_category();
$queried_category    = $is_product_category ? get_queried_object() : null;
$outlet_ancestors    = ( $queried_category instanceof WP_Term )
    ? array_map( 'intval', get_ancestors( (int) $queried_category->term_id, 'product_cat', 'taxonomy' ) )
    : array();
$is_outlet_active    = $is_product_category && (
    445 === (int) $queried_category->term_id || in_array( 445, $outlet_ancestors, true )
);
$is_categories_active = $is_product_category && ! $is_outlet_active;
$is_cart_active       = function_exists( 'is_cart' ) && is_cart();
$is_account_active    = function_exists( 'is_account_page' ) && is_account_page();
$outlet_term = get_term_by( 'slug', 'outlet', 'product_cat' );
$outlet_url  = ( $outlet_term && ! is_wp_error( $outlet_term ) ) ? get_term_link( $outlet_term ) : home_url( '/categoria-producto/outlet/' );
if ( is_wp_error( $outlet_url ) ) {
    $outlet_url = home_url( '/categoria-producto/outlet/' );
}
?>
<?php if ( ! $is_app_home ) : ?>
<footer class="cr-footer">
    <div class="cr-shell cr-footer__grid">
        <div>
            <div class="cr-footer__brand">Críos &amp; Rango</div>
            <p><?php esc_html_e( 'Moda para crecer, jugar y disfrutar.', 'crios-rango-2026' ); ?></p>
        </div>
        <nav aria-label="<?php esc_attr_e( 'Navegación del pie', 'crios-rango-2026' ); ?>">
            <?php
            wp_nav_menu( array(
                'theme_location' => 'footer',
                'container'      => false,
                'menu_class'     => 'cr-footer__menu',
                'fallback_cb'    => false,
            ) );
            ?>
        </nav>
        <div class="cr-footer__legal">
            <a href="<?php echo esc_url( home_url( '/aviso-legal/' ) ); ?>"><?php esc_html_e( 'Aviso legal', 'crios-rango-2026' ); ?></a>
            <a href="<?php echo esc_url( home_url( '/politica-de-privacidad/' ) ); ?>"><?php esc_html_e( 'Privacidad', 'crios-rango-2026' ); ?></a>
            <a href="<?php echo esc_url( home_url( '/politica-de-cookies/' ) ); ?>"><?php esc_html_e( 'Cookies', 'crios-rango-2026' ); ?></a>
        </div>
    </div>
    <div class="cr-shell cr-footer__bottom">© <?php echo esc_html( gmdate( 'Y' ) ); ?> Críos &amp; Rango</div>
</footer>
<?php endif; ?>

<?php if ( $is_app_home ) : ?>
<nav class="cr-desktop-rail" aria-label="<?php esc_attr_e( 'Navegación principal', 'crios-rango-2026' ); ?>">
    <a class="cr-desktop-rail__brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
        <img src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/brand/home_logo.png' ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>" width="42" height="42" decoding="async">
    </a>
    <div class="cr-desktop-rail__destinations">
        <a class="cr-desktop-rail__destination is-active" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-current="page"><?php echo cr2026_icon( 'home-filled' ); ?><span><?php esc_html_e( 'Inicio', 'crios-rango-2026' ); ?></span></a>
        <a class="cr-desktop-rail__destination" href="<?php echo esc_url( home_url( '/#categorias' ) ); ?>"><?php echo cr2026_icon( 'categories-outlined' ); ?><span><?php esc_html_e( 'Categorías', 'crios-rango-2026' ); ?></span></a>
        <a class="cr-desktop-rail__destination" href="<?php echo esc_url( $outlet_url ); ?>"><?php echo cr2026_icon( 'outlet-outlined' ); ?><span><?php esc_html_e( 'Outlet', 'crios-rango-2026' ); ?></span></a>
        <a class="cr-desktop-rail__destination cr-mobile-bottom-nav__cart" href="<?php echo esc_url( function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/carrito/' ) ); ?>"><?php echo cr2026_icon( 'cart-outlined' ); ?><span><?php esc_html_e( 'Carrito', 'crios-rango-2026' ); ?></span><span class="cr-cart-count<?php echo 0 === $cart_count ? ' is-empty' : ''; ?>" data-cr-cart-count data-count="<?php echo esc_attr( $cart_count ); ?>"><?php echo esc_html( $cart_count ); ?></span></a>
        <a class="cr-desktop-rail__destination" href="<?php echo esc_url( function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/mi-cuenta/' ) ); ?>"><?php echo cr2026_icon( 'account-outlined' ); ?><span><?php esc_html_e( 'Cuenta', 'crios-rango-2026' ); ?></span></a>
    </div>
</nav>
<?php endif; ?>
<nav class="cr-mobile-bottom-nav cr-app-bottom-nav" aria-label="<?php esc_attr_e( 'Navegación móvil', 'crios-rango-2026' ); ?>">
<div class="cr-mobile-bottom-nav__inner">
    <a class="<?php echo $is_app_home ? 'is-active' : ''; ?>" href="<?php echo esc_url( home_url( '/' ) ); ?>"<?php echo $is_app_home ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_app_home ? 'home-filled' : 'home-outlined' ); ?><span><?php esc_html_e( 'Inicio', 'crios-rango-2026' ); ?></span></a>
    <a class="<?php echo $is_categories_active ? 'is-active' : ''; ?>" href="<?php echo esc_url( $is_app_home ? '#categorias' : home_url( '/#categorias' ) ); ?>"<?php echo $is_categories_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_categories_active ? 'categories-filled' : 'categories-outlined' ); ?><span><?php esc_html_e( 'Categorías', 'crios-rango-2026' ); ?></span></a>
    <a class="<?php echo $is_outlet_active ? 'is-active' : ''; ?>" href="<?php echo esc_url( $outlet_url ); ?>"<?php echo $is_outlet_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_outlet_active ? 'outlet-filled' : 'outlet-outlined' ); ?><span><?php esc_html_e( 'Outlet', 'crios-rango-2026' ); ?></span></a>
    <a class="cr-mobile-bottom-nav__cart<?php echo $is_cart_active ? ' is-active' : ''; ?>" href="<?php echo esc_url( function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/carrito/' ) ); ?>"<?php echo $is_cart_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_cart_active ? 'cart-filled' : 'cart-outlined' ); ?><span><?php esc_html_e( 'Carrito', 'crios-rango-2026' ); ?></span><span class="cr-cart-count<?php echo 0 === $cart_count ? ' is-empty' : ''; ?>" data-cr-cart-count data-count="<?php echo esc_attr( $cart_count ); ?>"><?php echo esc_html( $cart_count ); ?></span></a>
    <a class="<?php echo $is_account_active ? 'is-active' : ''; ?>" href="<?php echo esc_url( function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/mi-cuenta/' ) ); ?>"<?php echo $is_account_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_account_active ? 'account-filled' : 'account-outlined' ); ?><span><?php esc_html_e( 'Cuenta', 'crios-rango-2026' ); ?></span></a>
</div>
</nav>
<?php wp_footer(); ?>
</body>
</html>
