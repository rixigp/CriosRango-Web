<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Explicit, read-only diagnostics for an authorized store manager on checkout only. */
function cr2026_checkout_runtime_debug_enabled() {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout()
        || ( function_exists( 'is_order_received_page' ) && is_order_received_page() )
        || ! current_user_can( 'manage_woocommerce' )
        || ! isset( $_GET['cr_checkout_debug'] )
        || ! is_scalar( $_GET['cr_checkout_debug'] ) ) {
        return false;
    }
    return '1' === (string) wp_unslash( $_GET['cr_checkout_debug'] );
}

function cr2026_checkout_runtime_callback_name( $callback ) {
    if ( is_string( $callback ) ) return $callback;
    if ( is_array( $callback ) && 2 === count( $callback ) ) {
        $owner = is_object( $callback[0] ) ? get_class( $callback[0] ) : (string) $callback[0];
        return $owner . ( is_object( $callback[0] ) ? '->' : '::' ) . (string) $callback[1];
    }
    if ( $callback instanceof Closure ) return 'Closure';
    if ( is_object( $callback ) ) return get_class( $callback ) . '::__invoke';
    return 'Unknown callback';
}

/** Inspect live WP_Hook registrations without serializing callback objects or arguments. */
function cr2026_checkout_runtime_hook_callbacks( $hook_name ) {
    global $wp_filter;
    $result = array();
    if ( empty( $wp_filter[ $hook_name ] ) || ! $wp_filter[ $hook_name ] instanceof WP_Hook ) return $result;
    foreach ( $wp_filter[ $hook_name ]->callbacks as $priority => $items ) {
        foreach ( $items as $item ) {
            if ( empty( $item['function'] ) ) continue;
            $result[] = array(
                'priority' => (int) $priority,
                'callback' => cr2026_checkout_runtime_callback_name( $item['function'] ),
            );
        }
    }
    return $result;
}

function cr2026_checkout_runtime_template_path( $template_name ) {
    if ( ! function_exists( 'wc_locate_template' ) ) return 'WooCommerce template locator unavailable';
    $path = wc_locate_template( $template_name );
    return $path ? $path : 'Template not found';
}

function cr2026_checkout_runtime_is_theme_override( $path ) {
    if ( ! is_string( $path ) || ! file_exists( $path ) ) return false;
    $theme_root = realpath( get_stylesheet_directory() );
    $template_path = realpath( $path );
    return $theme_root && $template_path
        && 0 === strpos( $template_path, trailingslashit( $theme_root ) );
}

function cr2026_checkout_runtime_render_callbacks( $hook_name ) {
    $callbacks = cr2026_checkout_runtime_hook_callbacks( $hook_name );
    echo '<h4>' . esc_html( $hook_name ) . '</h4><ul>';
    if ( empty( $callbacks ) ) echo '<li>NONE</li>';
    foreach ( $callbacks as $callback ) {
        echo '<li>PRIORITY=' . esc_html( (string) $callback['priority'] )
            . ' · CALLBACK=' . esc_html( $callback['callback'] ) . '</li>';
    }
    echo '</ul>';
}

function cr2026_checkout_runtime_debug_panel() {
    if ( ! cr2026_checkout_runtime_debug_enabled() ) return;

    $review_path = cr2026_checkout_runtime_template_path( 'checkout/review-order.php' );
    $form_path = cr2026_checkout_runtime_template_path( 'checkout/form-checkout.php' );
    $theme = wp_get_theme();
    $build_sha = 'UNAVAILABLE';
    $build_file = trailingslashit( CR2026_DIR ) . 'build.json';
    if ( is_readable( $build_file ) ) {
        $build_data = json_decode( file_get_contents( $build_file ), true );
        if ( is_array( $build_data ) && ! empty( $build_data['sha'] )
            && preg_match( '/^[a-f0-9]{40}$/i', (string) $build_data['sha'] ) ) {
            $build_sha = (string) $build_data['sha'];
        }
    }

    echo '<section id="cr-checkout-runtime-debug" style="margin:12px;padding:12px;border:2px solid #555;background:#fff;color:#111;font:13px/1.45 monospace;overflow-wrap:anywhere">';
    echo '<h2 style="margin:0 0 8px;font:700 16px/1.3 monospace">CHECKOUT RUNTIME DEBUG</h2>';
    echo '<p>THEME_NAME=' . esc_html( $theme->get( 'Name' ) )
        . '<br>THEME_VERSION=' . esc_html( $theme->get( 'Version' ) )
        . '<br>STAGING_BUILD_SHA=' . esc_html( $build_sha ) . '</p>';
    echo '<p>REVIEW_ORDER_TEMPLATE_PATH=' . esc_html( $review_path )
        . '<br>REVIEW_ORDER_TEMPLATE_IS_THEME_OVERRIDE=' . ( cr2026_checkout_runtime_is_theme_override( $review_path ) ? 'YES' : 'NO' )
        . '<br>FORM_CHECKOUT_TEMPLATE_PATH=' . esc_html( $form_path )
        . '<br>FORM_CHECKOUT_TEMPLATE_IS_THEME_OVERRIDE=' . ( cr2026_checkout_runtime_is_theme_override( $form_path ) ? 'YES' : 'NO' ) . '</p>';
    echo '<p>STATIC_THEME_SHIPPING_RENDER_COUNT=1 (static theme count; not runtime)</p>';

    echo '<h3>HOOK CALLBACKS RUNTIME</h3>';
    cr2026_checkout_runtime_render_callbacks( 'woocommerce_review_order_before_shipping' );
    cr2026_checkout_runtime_render_callbacks( 'woocommerce_review_order_after_shipping' );
    cr2026_checkout_runtime_render_callbacks( 'woocommerce_checkout_order_review' );
    cr2026_checkout_runtime_render_callbacks( 'woocommerce_before_checkout_form' );

    echo '<h3>DOM COUNTS</h3>';
    $fields = array(
        'DEBUG_INITIAL_SCAN' => 'initial',
        'DEBUG_AFTER_UPDATED_CHECKOUT' => 'after-ajax',
        'DUPLICATE_EXISTS_ON_INITIAL_LOAD' => 'initial-duplicate',
        'DUPLICATE_APPEARS_AFTER_UPDATED_CHECKOUT' => 'ajax-duplicate',
        'VISIBLE_SHIPPING_HEADING_COUNT' => 'visible_shipping_heading_count',
        'SHIPPING_METHOD_LIST_COUNT' => 'shipping_method_list_count',
        'SHIPPING_RADIO_COUNT' => 'shipping_radio_count',
        'CR_SHIPPING_SECTION_COUNT' => 'cr_shipping_section_count',
        'NATIVE_SHIPPING_ROW_COUNT' => 'native_shipping_row_count',
        'SHIPPING_INSTANCE_1_PARENT_PATH' => 'shipping_instance_1_parent_path',
        'SHIPPING_INSTANCE_2_PARENT_PATH' => 'shipping_instance_2_parent_path',
        'SHIPPING_METHOD_LIST_PARENT_PATHS' => 'shipping_method_list_parent_paths',
        'NATIVE_SHIPPING_ROW_PARENT_PATHS' => 'native_shipping_row_parent_paths',
    );
    foreach ( $fields as $label => $key ) {
        echo '<p style="margin:4px 0">' . esc_html( $label ) . '=<output data-cr-debug="' . esc_attr( $key ) . '">PENDING</output></p>';
    }
    echo '</section>';
}
add_action( 'woocommerce_before_checkout_form', 'cr2026_checkout_runtime_debug_panel', 0 );

/** HTML comments bracketing the one known theme shipping render call. */
function cr2026_checkout_runtime_debug_marker( $marker ) {
    if ( cr2026_checkout_runtime_debug_enabled() ) {
        echo "\n<!-- CR_SHIPPING_OVERRIDE_" . esc_html( $marker ) . " -->\n";
    }
}

function cr2026_checkout_runtime_debug_enqueue() {
    if ( ! cr2026_checkout_runtime_debug_enabled() ) return;
    wp_enqueue_script(
        'cr2026-checkout-runtime-debug',
        CR2026_URI . '/assets/js/checkout-runtime-debug.js',
        array( 'jquery' ),
        cr2026_asset_version( 'assets/js/checkout-runtime-debug.js' ),
        true
    );
}
add_action( 'wp_enqueue_scripts', 'cr2026_checkout_runtime_debug_enqueue', 40 );
