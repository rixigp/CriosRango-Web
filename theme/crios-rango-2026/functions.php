<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'CR2026_VERSION', '0.2.0' );
define( 'CR2026_DIR', get_template_directory() );
define( 'CR2026_URI', get_template_directory_uri() );

require_once CR2026_DIR . '/inc/setup.php';
require_once CR2026_DIR . '/inc/assets.php';
require_once CR2026_DIR . '/inc/helpers.php';
require_once CR2026_DIR . '/inc/navigation.php';
require_once CR2026_DIR . '/inc/woocommerce.php';
require_once CR2026_DIR . '/inc/cart.php';
require_once CR2026_DIR . '/inc/catalog-routes.php';
require_once CR2026_DIR . '/inc/product-skin.php';
require_once CR2026_DIR . '/inc/login.php';
require_once CR2026_DIR . '/inc/checkout-runtime-debug.php';
