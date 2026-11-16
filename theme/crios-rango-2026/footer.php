<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$active_nav_item = cr2026_app_nav_active_item();
$is_app_home = 'home' === $active_nav_item;
$cart_count = cr2026_cart_count();
$nav_urls = cr2026_app_nav_urls();
$is_outlet_active = 'outlet' === $active_nav_item;
$is_categories_active = 'categories' === $active_nav_item;
$is_cart_active = 'cart' === $active_nav_item;
$is_account_active = 'account' === $active_nav_item;
$is_mobile_account_active = cr2026_is_account_context();
?>


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
