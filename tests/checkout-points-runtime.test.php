<?php
declare(strict_types=1);

final class WP_Hook {
    public array $callbacks = array();
}

$GLOBALS['test_filters'] = array();
$GLOBALS['test_actions'] = array();
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
    if ( empty( $GLOBALS['test_filters'][ $tag ][ $priority ] ) ) { return false; }
    foreach ( $GLOBALS['test_filters'][ $tag ][ $priority ] as $index => $entry ) {
        if ( $entry['callback'] === $callback ) {
            unset( $GLOBALS['test_filters'][ $tag ][ $priority ][ $index] );
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
function add_action( $tag, $callback, $priority = 10, $accepted_args = 1 ) {
    $GLOBALS['test_actions'][ $tag ][ $priority ][] = $callback;
    return true;
}
function remove_action( $tag, $callback, $priority = 10 ) { return true; }
function test_do_action( $tag, array $events ) {
    ksort( $events );
    foreach ( $events as $priority => $callback ) {
        if ( $priority >= 1 ) { call_user_func( $callback ); }
    }
}
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
    'cr2026_checkout_capture_earn_points_message',
    'cr2026_checkout_suppress_redeem_points_message',
    'cr2026_checkout_register_points_rewards_filters',
    'cr2026_find_points_rewards_callback',
    'cr2026_checkout_benefits_points_earned',
    'cr2026_checkout_render_benefits_card',
);
$functions = array();
foreach ( $function_names as $function_name ) {
    $functions[ $function_name ] = test_extract_function( $source, $function_name );
    eval( $functions[ $function_name ] );
}

test_assert(
    false !== strpos( $source, "add_action( 'woocommerce_before_checkout_form', 'cr2026_checkout_register_points_rewards_filters', 1 );" ),
    'Points & Rewards filters must be registered only from before_checkout_form at priority 1.'
);
test_assert(
    1 !== preg_match( '/^add_filter\\(/m', $source ),
    'Points & Rewards filters must not be registered globally during bootstrap.'
);
test_assert(
    false === strpos( $functions['cr2026_checkout_capture_earn_points_message'], 'cr2026_checkout_is_benefits_request' )
    && false === strpos( $functions['cr2026_checkout_suppress_redeem_points_message'], 'cr2026_checkout_is_benefits_request' )
    && false === strpos( $functions['cr2026_checkout_capture_earn_points_message'], 'is_checkout' )
    && false === strpos( $functions['cr2026_checkout_suppress_redeem_points_message'], 'is_checkout' ),
    'Suppression callbacks must not depend on is_checkout or request-context predicates.'
);

// Model the actual hook order: our registration at 1, plugin earn at 5,
// plugin redeem at 6, and the theme benefits card at 20.
add_action( 'woocommerce_before_checkout_form', 'cr2026_checkout_register_points_rewards_filters', 1 );
$registered_checkout_callbacks = $GLOBALS['test_actions']['woocommerce_before_checkout_form'][1] ?? array();
test_assert( in_array( 'cr2026_checkout_register_points_rewards_filters', $registered_checkout_callbacks, true ), 'Filter registrar must be attached at checkout hook priority 1.' );
test_assert( empty( $GLOBALS['test_filters']['wc_points_rewards_earn_points_message'] ), 'Cart/bootstrap must not have the earn filter installed.' );
test_assert( empty( $GLOBALS['test_filters']['wc_points_rewards_redeem_points_message'] ), 'Cart/bootstrap must not have the redeem filter installed.' );

$hook_events = array(
    1 => function () use ( $registered_checkout_callbacks ) { call_user_func( $registered_checkout_callbacks[0] ); },
    5 => function () {
        $GLOBALS['test_earn_output'] = apply_filters( 'wc_points_rewards_earn_points_message', 'Complete your order and earn 15...', 15 );
    },
    6 => function () {
        $GLOBALS['test_redeem_output'] = apply_filters( 'wc_points_rewards_redeem_points_message', 'You have ... point earned...', 4 );
    },
    20 => function () {
        ob_start();
        cr2026_checkout_render_benefits_card();
        $GLOBALS['test_benefits_markup'] = ob_get_clean();
    },
);
test_do_action( 'woocommerce_before_checkout_form', $hook_events );

test_assert( '' === $GLOBALS['test_earn_output'], 'Earn renderer output must be suppressed at plugin priority 5.' );
test_assert( '' === $GLOBALS['test_redeem_output'], 'Redeem renderer output must be suppressed at plugin priority 6.' );
test_assert( 15.0 === $GLOBALS['cr2026_checkout_points_earned'], 'Earn filter must capture 15 before the card renderer.' );
test_assert(
    false !== strpos( $GLOBALS['test_benefits_markup'], 'Sumarás <span class="cr-checkout-benefits__value">15</span> puntos con esta compra' ),
    'Priority-20 benefits card must render the 15 points captured at priority 5.'
);
test_assert(
    false === strpos( $GLOBALS['test_benefits_markup'], 'Complete your order' )
    && false === strpos( $GLOBALS['test_benefits_markup'], 'You have' ),
    'Legacy earn/redeem copy must not appear in the benefits card markup.'
);

// A Cart request never runs before_checkout_form, so neither public filter exists.
$GLOBALS['test_filters'] = array();
$GLOBALS['test_is_checkout'] = false;
test_assert( 'cart earn' === apply_filters( 'wc_points_rewards_earn_points_message', 'cart earn', 15 ), 'Cart earn message must remain unchanged.' );
test_assert( 'cart redeem' === apply_filters( 'wc_points_rewards_redeem_points_message', 'cart redeem', 4 ), 'Cart redeem message must remain unchanged.' );

// AJAX continues to resolve the actual callable by method name, without a class filter.
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
test_assert( is_array( $resolved ) && $resolved[0] === $renderer && 'render_earn_points_message' === $resolved[1], 'Resolver must find the exact registered method on an arbitrary object.' );
test_assert( 5 === $GLOBALS['cr2026_checkout_real_earn_callback_priority'], 'Resolver must retain the real priority.' );

$GLOBALS['test_is_checkout'] = false;
$GLOBALS['test_is_ajax'] = true;
$_REQUEST = array( 'wc-ajax' => 'update_order_review' );
$level = ob_get_level();
$earned = cr2026_checkout_benefits_points_earned( true );
test_assert( 15.0 === $earned, 'AJAX renderer invocation must capture 15 from the temporary public filter.' );
test_assert( $level === ob_get_level(), 'AJAX renderer output buffer must be closed.' );
test_assert( empty( $GLOBALS['test_filters']['wc_points_rewards_earn_points_message'][PHP_INT_MAX] ), 'Temporary AJAX capture filter must be removed after invocation.' );

echo "PASS: checkout-scoped priority ordering, Cart isolation, and AJAX points capture\\n";
