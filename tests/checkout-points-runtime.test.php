<?php
declare(strict_types=1);

$GLOBALS['test_filters'] = array();
$GLOBALS['test_is_checkout'] = true;
$GLOBALS['test_is_ajax'] = false;
$GLOBALS['test_is_order_received'] = false;

function add_filter( $tag, $callback, $priority = 10, $accepted_args = 1 ) {
    $GLOBALS['test_filters'][ $tag ][ $priority ][] = array(
        'callback' => $callback,
        'accepted_args' => $accepted_args,
    );
    return true;
}
function remove_filter( $tag, $callback, $priority = 10 ) {
    if ( empty( $GLOBALS['test_filters'][ $tag ][ $priority ] ) ) { return false; }
    foreach ( $GLOBALS['test_filters'][ $tag ][ $priority ] as $index => $entry ) {
        if ( $entry['callback'] === $callback ) {
            unset( $GLOBALS['test_filters'][ $tag ][ $priority ][ $index ] );
            return true;
        }
    }
    return false;
}
function apply_filters( $tag, $value, ...$args ) {
    $groups = $GLOBALS['test_filters'][ $tag ] ?? array();
    ksort( $groups );
    foreach ( $groups as $entries ) {
        foreach ( $entries as $entry ) {
            $parameters = array_slice( array_merge( array( $value ), $args ), 0, $entry['accepted_args'] );
            $value = call_user_func_array( $entry['callback'], $parameters );
        }
    }
    return $value;
}
function __return_false() { return false; }
function is_checkout() { return $GLOBALS['test_is_checkout']; }
function is_wc_endpoint_url( $endpoint ) { return 'order-received' === $endpoint && $GLOBALS['test_is_order_received']; }
function wp_doing_ajax() { return $GLOBALS['test_is_ajax']; }
function sanitize_text_field( $value ) { return $value; }
function wp_unslash( $value ) { return $value; }
function cr2026_checkout_benefits_shipping_data() { return null; }
function esc_attr__( $value ) { return $value; }
function esc_html__( $value ) { return $value; }
function esc_html( $value ) { return $value; }
function number_format_i18n( $value, $precision = 0 ) { return number_format( $value, $precision, '.', ',' ); }
function wp_kses( $value, $allowed_html ) { return $value; }

final class TestWployaltyDisplayMessage {
    public function getCartMessage( $is_cart ) {
        $GLOBALS['test_get_cart_message_argument'] = $is_cart;
        $GLOBALS['test_wlr_message_result'] = apply_filters(
            'wlr_points_rewards_earn_points_message',
            'native WPLoyalty earn message',
            array( '{wlr_cart_points}' => '15' )
        );
        return $GLOBALS['test_wlr_message_result'];
    }
}
class_alias( TestWployaltyDisplayMessage::class, 'Wlr\\App\\Controllers\\Site\\DisplayMessage' );

function test_assert( $condition, $message ) {
    if ( ! $condition ) { throw new RuntimeException( $message ); }
}
function test_extract_function( $source, $name ) {
    $tokens = token_get_all( $source );
    $count = count( $tokens );
    for ( $i = 0; $i < $count; $i++ ) {
        if ( ! is_array( $tokens[$i] ) || T_FUNCTION !== $tokens[$i][0] ) { continue; }
        $start = 0;
        for ( $n = 0; $n < $i; $n++ ) {
            $part = $tokens[$n];
            $start += strlen( is_array( $part ) ? $part[1] : $part );
        }
        $j = $i + 1;
        while ( $j < $count && is_array( $tokens[$j]) && T_WHITESPACE === $tokens[$j][0] ) { $j++; }
        if ( $j < $count && '(' === $tokens[$j] ) { $j++; }
        while ( $j < $count && is_array( $tokens[$j]) && in_array( $tokens[$j][0], array( T_WHITESPACE, T_AMPERSAND_NOT_FOLLOWED_BY_VAR_OR_VARARG, T_AMPERSAND_FOLLOWED_BY_VAR_OR_VARARG ), true ) ) { $j++; }
        if ( $j >= $count || ! is_array( $tokens[$j]) || T_STRING !== $tokens[$j][0] || $name !== $tokens[$j][1] ) { continue; }
        while ( $j < $count && '{' !== $tokens[$j] ) { $j++; }
        $depth = 0;
        for ( $k = $j; $k < $count; $k++ ) {
            $token = $tokens[$k];
            if ( '{' === $token ) { $depth++; }
            if ( '}' === $token ) {
                $depth--;
                if ( 0 === $depth ) {
                    $end = $start;
                    for ( $m = $i; $m <= $k; $m++ ) {
                        $part = $tokens[$m];
                        $end += strlen( is_array( $part ) ? $part[1] : $part );
                    }
                    return substr( $source, $start, $end - $start );
                }
            }
        }
    }
    throw new RuntimeException( 'Function not found: ' . $name );
}

$source = file_get_contents( __DIR__ . '/../theme/crios-rango-2026/inc/woocommerce.php' );
$function_names = array(
    'cr2026_checkout_is_benefits_request',
    'cr2026_checkout_benefits_points_earned',
    'cr2026_checkout_render_benefits_card',
    'cr2026_checkout_benefits_order_review_fragment',
);
foreach ( $function_names as $function_name ) {
    eval( test_extract_function( $source, $function_name ) );
}

test_assert(
    1 === preg_match( "/add_filter\\(\\s*['\\\"]wlr_is_checkout_earn_message_enabled['\\\"]\\s*,\\s*'__return_false'/", $source ),
    'WPLoyalty Checkout earn message must be disabled through its dedicated filter.'
);
test_assert(
    1 === preg_match( "/add_filter\\(\\s*['\\\"]wlr_is_checkout_redeem_message_enabled['\\\"]\\s*,\\s*'__return_false'/", $source ),
    'WPLoyalty Checkout redeem message must be disabled through its dedicated filter.'
);
test_assert( false === strpos( $source, 'wc_points_rewards_earn_points_message' ), 'The wrong WooCommerce Points earn filter must be removed.' );
test_assert( false === strpos( $source, 'wc_points_rewards_redeem_points_message' ), 'The wrong WooCommerce Points redeem filter must be removed.' );
test_assert( false === strpos( $source, 'cr2026_find_points_rewards_callback' ), 'The old WP_Hook resolver must be removed.' );
test_assert( false === strpos( $source, 'render_earn_points_message' ) && false === strpos( $source, 'render_redeem_points_message' ), 'The wrong renderer method names must be removed.' );

$feature_start = strpos( $source, '// WPLoyalty exposes Checkout-only switches' );
$feature_end = strpos( $source, '/**\n * Resolve a real free-shipping method', $feature_start );
$feature_source = substr( $source, $feature_start, $feature_end - $feature_start );
test_assert( false === strpos( $feature_source, 'strip_tags' ) && false === strpos( $feature_source, 'preg_match' ), 'WPLoyalty message HTML must not be parsed.' );
test_assert( false === strpos( $feature_source, 'get_points_earned_for_purchase' ), 'The theme must not duplicate WPLoyalty point calculation.' );
test_assert( false !== strpos( $feature_source, "class_exists( '\\\\Wlr\\\\App\\\\Controllers\\\\Site\\\\DisplayMessage' )" ), 'The public DisplayMessage class must be checked.' );
test_assert( false !== strpos( $feature_source, "new \\\\Wlr\\\\App\\\\Controllers\\\\Site\\\\DisplayMessage()" ), 'The public DisplayMessage class must be instantiated.' );
test_assert( false !== strpos( $feature_source, '$display_message->getCartMessage( false )' ), 'The helper must call getCartMessage(false).' );
test_assert( false !== strpos( $feature_source, "'{wlr_cart_points}'" ), 'The points value must come from the WPLoyalty shortcode key.' );

// Execute the exact Checkout-only enable switches.
add_filter( 'wlr_is_checkout_earn_message_enabled', '__return_false' );
add_filter( 'wlr_is_checkout_redeem_message_enabled', '__return_false' );
test_assert( false === apply_filters( 'wlr_is_checkout_earn_message_enabled', true ), 'WPLoyalty Checkout earn messages must be disabled.' );
test_assert( false === apply_filters( 'wlr_is_checkout_redeem_message_enabled', true ), 'WPLoyalty Checkout redeem messages must be disabled.' );

// Normal Checkout: use WPLoyalty's own public calculator and capture its shortcode value.
$normal_points = cr2026_checkout_benefits_points_earned();
test_assert( 15.0 === $normal_points, 'The normal request must capture {wlr_cart_points}=15.' );
test_assert( false === $GLOBALS['test_get_cart_message_argument'], 'getCartMessage must be called with false.' );
test_assert( '' === $GLOBALS['test_wlr_message_result'], 'The temporary earn message filter must suppress the native return.' );
test_assert( 15.0 === $GLOBALS['cr2026_checkout_points_earned'], 'Captured points must be stored only in this request.' );

// The temporary capture callback must be removed after the public method returns.
test_assert( empty( $GLOBALS['test_filters']['wlr_points_rewards_earn_points_message'][PHP_INT_MAX] ), 'The temporary WPLoyalty capture filter must be removed.' );

// The real benefits renderer calls the same helper and prints the captured live value.
ob_start();
cr2026_checkout_render_benefits_card();
$markup = ob_get_clean();
test_assert( false !== strpos( $markup, 'Sumarás <span class="cr-checkout-benefits__value">15</span> puntos con esta compra' ), 'The card must render the live 15 points.' );
test_assert( false === strpos( $markup, 'native WPLoyalty earn message' ), 'The native message must not be rendered by the theme card.' );

// AJAX request: no before_checkout_form hook is needed; fragment rendering resolves points directly.
$GLOBALS['test_is_checkout'] = false;
$GLOBALS['test_is_ajax'] = true;
$_REQUEST = array( 'wc-ajax' => 'update_order_review' );
$ajax_fragments = cr2026_checkout_benefits_order_review_fragment( array() );
test_assert( isset( $ajax_fragments['.cr-checkout-benefits'] ), 'The AJAX response must regenerate the benefits fragment.' );
test_assert( false !== strpos( $ajax_fragments['.cr-checkout-benefits'], 'Sumarás <span class="cr-checkout-benefits__value">15</span> puntos con esta compra' ), 'The AJAX benefits fragment must capture the current 15 points.' );
test_assert( empty( $GLOBALS['test_filters']['wlr_points_rewards_earn_points_message'][PHP_INT_MAX] ), 'The AJAX temporary WPLoyalty filter must be removed.' );

echo "PASS: WPLoyalty Checkout suppression, public points capture, and AJAX card refresh\\n";
