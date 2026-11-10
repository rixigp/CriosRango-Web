<?php
declare(strict_types=1);

final class WP_Hook {
    public array $callbacks = array();
}

$GLOBALS['test_filters'] = array();
$GLOBALS['test_is_checkout'] = true;
$GLOBALS['test_is_order_received'] = false;
$GLOBALS['test_is_ajax'] = false;

function add_filter( $tag, $callback, $priority = 10, $accepted_args = 1 ) {
    $GLOBALS['test_filters'][ $tag ][ $priority ][] = array(
        'callback' => $callback,
        'accepted_args' => $accepted_args,
    );
    return true;
}
function remove_filter( $tag, $callback, $priority = 10 ) {
    if ( empty( $GLOBALS['test_filters'][ $tag ][ $priority ] ) ) {
        return false;
    }
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
function is_checkout() { return $GLOBALS['test_is_checkout']; }
function is_wc_endpoint_url( $endpoint ) { return 'order-received' === $endpoint && $GLOBALS['test_is_order_received']; }
function wp_doing_ajax() { return $GLOBALS['test_is_ajax']; }
function sanitize_text_field( $value ) { return $value; }
function wp_unslash( $value ) { return $value; }

function test_assert( $condition, $message ) {
    if ( ! $condition ) {
        throw new RuntimeException( $message );
    }
}
function test_extract_function( $source, $name ) {
    $tokens = token_get_all( $source );
    $count = count( $tokens );
    for ( $i = 0; $i < $count; $i++ ) {
        if ( ! is_array( $tokens[$i] ) || T_FUNCTION !== $tokens[$i][0] ) {
            continue;
        }
        $start = $tokens[$i][1];
        $j = $i + 1;
        while ( $j < $count && is_array( $tokens[$j]) && T_WHITESPACE === $tokens[$j][0] ) { $j++; }
        if ( $j < $count && '(' === $tokens[$j] ) { $j++; }
        while ( $j < $count && is_array( $tokens[$j]) && in_array( $tokens[$j][0], array( T_WHITESPACE, T_AMPERSAND_NOT_FOLLOWED_BY_VAR_OR_VARARG, T_AMPERSAND_FOLLOWED_BY_VAR_OR_VARARG ), true ) ) { $j++; }
        if ( $j >= $count || ! is_array( $tokens[$j]) || T_STRING !== $tokens[$j][0] || $name !== $tokens[$j][1] ) {
            continue;
        }
        while ( $j < $count && '{' !== $tokens[$j] ) { $j++; }
        $depth = 0;
        for ( $k = $j; $k < $count; $k++ ) {
            $token = $tokens[$k];
            if ( '{' === $token || ( is_array($token) && T_CURLY_OPEN === $token[0] ) ) { $depth++; }
            if ( '}' === $token || ( is_array($token) && T_CURLY_CLOSE === $token[0] ) ) {
                $depth--;
                if ( 0 === $depth ) {
                    $end = is_array($token) ? $token[1] + strlen($token[1]) : 1;
                    return substr( $source, $start, $end - $start );
                }
            }
        }
    }
    throw new RuntimeException( 'Function not found: ' . $name );
}

$source = file_get_contents( __DIR__ . '/../theme/crios-rango-2026/inc/woocommerce.php' );
foreach ( array(
    'cr2026_checkout_is_benefits_request',
    'cr2026_checkout_capture_earn_points_message',
    'cr2026_checkout_suppress_redeem_points_message',
    'cr2026_find_points_rewards_callback',
    'cr2026_checkout_benefits_points_earned',
) as $function_name ) {
    eval( test_extract_function( $source, $function_name ) );
}

$_REQUEST = array();
test_assert( '' === cr2026_checkout_capture_earn_points_message( 'legacy', 15 ), 'Earn filter must suppress Checkout message.' );
test_assert( 15.0 === $GLOBALS['cr2026_checkout_points_earned'], 'Earn filter must capture the plugin points argument.' );
test_assert( '' === cr2026_checkout_suppress_redeem_points_message( 'redeem legacy', 4 ), 'Redeem filter must suppress Checkout message.' );

$GLOBALS['test_is_checkout'] = false;
test_assert( 'cart earn' === cr2026_checkout_capture_earn_points_message( 'cart earn', 15 ), 'Cart earn message must remain unchanged.' );
test_assert( 'cart redeem' === cr2026_checkout_suppress_redeem_points_message( 'cart redeem', 4 ), 'Cart redeem message must remain unchanged.' );

$renderer = new class {
    public function render_earn_points_message() {
        echo 'discard this renderer output';
        apply_filters( 'wc_points_rewards_earn_points_message', 'legacy earn', 15 );
    }
};
$GLOBALS['wp_filter']['woocommerce_before_checkout_form'] = new WP_Hook();
$GLOBALS['wp_filter']['woocommerce_before_checkout_form']->callbacks = array(
    5 => array(
        'synthetic-earn' => array( 'function' => array( $renderer, 'render_earn_points_message' ) ),
    ),
);
$resolved = cr2026_find_points_rewards_callback( 'render_earn_points_message' );
test_assert( is_array( $resolved ) && $resolved[0] === $renderer && 'render_earn_points_message' === $resolved[1], 'Resolver must find an arbitrary object's exact registered method.' );
test_assert( 5 === $GLOBALS['cr2026_checkout_real_earn_callback_priority'], 'Resolver must retain the real priority.' );

$GLOBALS['test_is_checkout'] = false;
$GLOBALS['test_is_ajax'] = true;
$_REQUEST['wc-ajax'] = 'update_order_review';
add_filter( 'wc_points_rewards_earn_points_message', 'cr2026_checkout_capture_earn_points_message', 9999, 2 );
$level = ob_get_level();
$earned = cr2026_checkout_benefits_points_earned( true );
test_assert( 15.0 === $earned, 'AJAX renderer invocation must capture 15 from the public filter argument.' );
test_assert( $level === ob_get_level(), 'AJAX renderer output buffer must be closed.' );
test_assert( 1 === count( $GLOBALS['test_filters']['wc_points_rewards_earn_points_message'][9999] ), 'Temporary capture filter must be removed after invocation.' );

echo "PASS: checkout points filters, arbitrary WP_Hook callback resolution, and AJAX points capture\n";
