<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$is_app_home = is_front_page();
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="cr-skip-link" href="#primary"><?php esc_html_e( 'Saltar al contenido', 'crios-rango-2026' ); ?></a>

<?php if ( $is_app_home ) : ?>
    <header class="cr-header cr-header--app-home" data-cr-header>
        <div class="cr-home-topbar">
            <a class="cr-home-mark" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
                <img
                    class="cr-home-mark__logo"
                    src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/brand/home_logo.png' ); ?>"
                    alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
                    width="34"
                    height="34"
                    decoding="async"
                >
            </a>

            <div class="cr-home-topbar__actions">
                <a class="cr-app-icon-button" href="<?php echo esc_url( home_url( '/?s=&post_type=product' ) ); ?>" aria-label="<?php esc_attr_e( 'Buscar', 'crios-rango-2026' ); ?>">
                    <?php echo cr2026_icon( 'search' ); ?>
                </a>
                <a class="cr-app-icon-button cr-cart-link" href="<?php echo esc_url( function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/carrito/' ) ); ?>" aria-label="<?php esc_attr_e( 'Carrito', 'crios-rango-2026' ); ?>">
                    <?php echo cr2026_icon( 'bag' ); ?>
                    <span class="cr-cart-count" data-cr-cart-count><?php echo esc_html( cr2026_cart_count() ); ?></span>
                </a>
            </div>
        </div>
    </header>
<?php else : ?>
    <header class="cr-header" data-cr-header>
        <div class="cr-shell cr-header__inner">
            <button class="cr-icon-button cr-header__menu-button" type="button" data-cr-menu-toggle aria-expanded="false" aria-controls="cr-mobile-menu">
                <?php echo cr2026_icon( 'menu' ); ?>
                <span class="screen-reader-text"><?php esc_html_e( 'Abrir menú', 'crios-rango-2026' ); ?></span>
            </button>

            <div class="cr-brand">
                <?php if ( has_custom_logo() ) : ?>
                    <?php the_custom_logo(); ?>
                <?php else : ?>
                    <a class="cr-brand__text" href="<?php echo esc_url( home_url( '/' ) ); ?>">Críos <span>&amp;</span> Rango</a>
                <?php endif; ?>
            </div>

            <nav class="cr-nav cr-nav--desktop" aria-label="<?php esc_attr_e( 'Navegación principal', 'crios-rango-2026' ); ?>">
                <?php
                wp_nav_menu( array(
                    'theme_location' => 'primary',
                    'container'      => false,
                    'menu_class'     => 'cr-nav-list',
                    'fallback_cb'    => 'cr2026_primary_menu_fallback',
                    'depth'          => 1,
                ) );
                ?>
            </nav>

            <div class="cr-header__actions">
                <a class="cr-icon-button" href="<?php echo esc_url( home_url( '/?s=&post_type=product' ) ); ?>" aria-label="<?php esc_attr_e( 'Buscar', 'crios-rango-2026' ); ?>">
                    <?php echo cr2026_icon( 'search' ); ?>
                </a>
                <a class="cr-icon-button" href="<?php echo esc_url( function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/mi-cuenta/' ) ); ?>" aria-label="<?php esc_attr_e( 'Mi cuenta', 'crios-rango-2026' ); ?>">
                    <?php echo cr2026_icon( 'user' ); ?>
                </a>
                <a class="cr-icon-button cr-cart-link" href="<?php echo esc_url( function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/carrito/' ) ); ?>" aria-label="<?php esc_attr_e( 'Carrito', 'crios-rango-2026' ); ?>">
                    <?php echo cr2026_icon( 'bag' ); ?>
                    <span class="cr-cart-count" data-cr-cart-count><?php echo esc_html( cr2026_cart_count() ); ?></span>
                </a>
            </div>
        </div>

        <div class="cr-mobile-menu" id="cr-mobile-menu" data-cr-mobile-menu hidden>
            <div class="cr-shell">
                <?php
                wp_nav_menu( array(
                    'theme_location' => 'primary',
                    'container'      => false,
                    'menu_class'     => 'cr-mobile-menu__list',
                    'fallback_cb'    => 'cr2026_primary_menu_fallback',
                    'depth'          => 1,
                ) );
                ?>
            </div>
        </div>
    </header>
<?php endif; ?>
