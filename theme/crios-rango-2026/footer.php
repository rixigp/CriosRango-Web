<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$active_nav_item = cr2026_app_nav_active_item();
$is_app_home = 'home' === $active_nav_item;
$is_app_category_view = ! empty( $GLOBALS['cr2026_parent_category_view'] );
$is_app_categories_hub = function_exists( 'is_shop' ) && is_shop();
$is_app_nav_shell = cr2026_is_app_nav_shell();
$is_checkout_form = function_exists( 'is_checkout' ) && is_checkout()
    && ( ! function_exists( 'is_order_received_page' ) || ! is_order_received_page() );
$cart_count = cr2026_cart_count();
$nav_urls = cr2026_app_nav_urls();
$is_outlet_active = 'outlet' === $active_nav_item;
$is_categories_active = 'categories' === $active_nav_item;
$is_cart_active = 'cart' === $active_nav_item;
$is_account_active = 'account' === $active_nav_item;
$is_mobile_account_active = cr2026_is_account_context();
$is_mobile_account_context = function_exists( 'wp_is_mobile' ) && wp_is_mobile() && $is_mobile_account_active;
$is_mobile_app_shell_context = function_exists( 'wp_is_mobile' ) && wp_is_mobile() && $is_app_nav_shell;
?>
<?php if ( ! ( function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) && ! $is_app_home && ! $is_app_category_view && ! $is_app_categories_hub && ( ! function_exists( 'is_cart' ) || ! is_cart() ) && ! $is_checkout_form && ! $is_mobile_account_context && ! $is_mobile_app_shell_context ) : ?>
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

<?php if ( $is_app_nav_shell ) : ?>
<nav class="cr-desktop-rail" aria-label="<?php esc_attr_e( 'Navegación principal', 'crios-rango-2026' ); ?>">
    <a class="cr-desktop-rail__brand" href="<?php echo esc_url( $nav_urls['home'] ); ?>" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
        <img src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/brand/home_logo.png' ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>" width="42" height="42" decoding="async">
    </a>
    <div class="cr-desktop-rail__destinations">
        <a class="cr-desktop-rail__destination<?php echo $is_app_home ? ' is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['home'] ); ?>"<?php echo $is_app_home ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_app_home ? 'home-filled' : 'home-outlined' ); ?><span><?php esc_html_e( 'Inicio', 'crios-rango-2026' ); ?></span></a>
        <a class="cr-desktop-rail__destination<?php echo $is_categories_active ? ' is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['categories'] ); ?>"<?php echo $is_categories_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_categories_active ? 'categories-filled' : 'categories-outlined' ); ?><span><?php esc_html_e( 'Categorías', 'crios-rango-2026' ); ?></span></a>
        <a class="cr-desktop-rail__destination<?php echo $is_outlet_active ? ' is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['outlet'] ); ?>"<?php echo $is_outlet_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_outlet_active ? 'outlet-filled' : 'outlet-outlined' ); ?><span><?php esc_html_e( 'Outlet', 'crios-rango-2026' ); ?></span></a>
        <a class="cr-desktop-rail__destination cr-mobile-bottom-nav__cart<?php echo $is_cart_active ? ' is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['cart'] ); ?>"<?php echo $is_cart_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_cart_active ? 'cart-filled' : 'cart-outlined' ); ?><span><?php esc_html_e( 'Carrito', 'crios-rango-2026' ); ?></span><span class="cr-cart-count<?php echo 0 === $cart_count ? ' is-empty' : ''; ?>" data-cr-cart-count data-count="<?php echo esc_attr( $cart_count ); ?>"><?php echo esc_html( $cart_count ); ?></span></a>
        <a class="cr-desktop-rail__destination<?php echo $is_account_active ? ' is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['account'] ); ?>"<?php echo $is_account_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_account_active ? 'account-filled' : 'account-outlined' ); ?><span><?php esc_html_e( 'Cuenta', 'crios-rango-2026' ); ?></span></a>
    </div>
</nav>
<?php endif; ?>
<nav class="cr-mobile-bottom-nav cr-app-bottom-nav" aria-label="<?php esc_attr_e( 'Navegación móvil', 'crios-rango-2026' ); ?>">
<div class="cr-mobile-bottom-nav__inner">
    <a class="<?php echo $is_app_home ? 'is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['home'] ); ?>"<?php echo $is_app_home ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_app_home ? 'home-filled' : 'home-outlined' ); ?><span><?php esc_html_e( 'Inicio', 'crios-rango-2026' ); ?></span></a>
    <a class="<?php echo $is_categories_active ? 'is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['categories'] ); ?>"<?php echo $is_categories_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_categories_active ? 'categories-filled' : 'categories-outlined' ); ?><span><?php esc_html_e( 'Categorías', 'crios-rango-2026' ); ?></span></a>
    <a class="<?php echo $is_outlet_active ? 'is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['outlet'] ); ?>"<?php echo $is_outlet_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_outlet_active ? 'outlet-filled' : 'outlet-outlined' ); ?><span><?php esc_html_e( 'Outlet', 'crios-rango-2026' ); ?></span></a>
    <a class="cr-mobile-bottom-nav__cart<?php echo $is_cart_active ? ' is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['cart'] ); ?>"<?php echo $is_cart_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_cart_active ? 'cart-filled' : 'cart-outlined' ); ?><span><?php esc_html_e( 'Carrito', 'crios-rango-2026' ); ?></span><span class="cr-cart-count<?php echo 0 === $cart_count ? ' is-empty' : ''; ?>" data-cr-cart-count data-count="<?php echo esc_attr( $cart_count ); ?>"><?php echo esc_html( $cart_count ); ?></span></a>
    <a class="<?php echo $is_mobile_account_active ? 'is-active' : ''; ?>" href="<?php echo esc_url( $nav_urls['account'] ); ?>"<?php echo $is_mobile_account_active ? ' aria-current="page"' : ''; ?>><?php echo cr2026_icon( $is_mobile_account_active ? 'account-filled' : 'account-outlined' ); ?><span><?php esc_html_e( 'Cuenta', 'crios-rango-2026' ); ?></span></a>
</div>
</nav>
<?php wp_footer(); ?>
</body>
</html>
