<?php
/**
 * Contract test for the app-canonical WordPress user-meta birthday source.
 * Uses isolated fake user meta only; no customer data is emitted.
 */
define( 'ABSPATH', __DIR__ );
$GLOBALS['test_current_user_id'] = 73;
$GLOBALS['test_user_meta'] = array( 'criosrango_birth_date' => '1988-02-03' );
$GLOBALS['test_meta_reads'] = array();
$GLOBALS['test_toolbar'] = null;

function add_action( ...$args ) {}
function add_filter( ...$args ) {}
function wp_is_mobile() { return true; }
function is_account_page() { return true; }
function is_wc_endpoint_url( $endpoint ) { return 'edit-account' === $endpoint; }
function is_user_logged_in() { return true; }
function get_current_user_id() { return $GLOBALS['test_current_user_id']; }
function get_user_meta( $user_id, $key, $single = false ) {
    $GLOBALS['test_meta_reads'][] = array( $user_id, $key, $single );
    return $GLOBALS['test_user_meta'][ $key ] ?? '';
}
function esc_attr( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); }
function esc_html( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); }
function esc_html_e( $value ) { echo esc_html( $value ); }
function __( $value, $domain = null ) { return $value; }
function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ); }
function wp_unslash( $value ) { return $value; }
function wp_parse_args( $args, $defaults = array() ) { return array_merge( $defaults, (array) $args ); }
function wc_get_page_permalink( $page ) { return '/mi-cuenta/'; }
function wc_get_account_endpoint_url( $endpoint ) { return '/mi-cuenta/' . $endpoint . '/'; }
function cr2026_render_category_toolbar( $title, $back_url, $kind, $flag ) {
    $GLOBALS['test_toolbar'] = array( $title, $back_url, $kind, $flag );
}

require __DIR__ . '/../theme/crios-rango-2026/inc/account-presentation.php';

function contract_assert( $condition, $label ) {
    if ( ! $condition ) {
        fwrite( STDERR, "FAIL: {$label}\n" );
        exit( 1 );
    }
    echo "PASS: {$label}\n";
}

$_GET = array( 'profile_view' => 'personal' );
$_POST = array( 'save_account_details' => 'Save', 'birth_date' => '1999-01-01' );
ob_start();
cr2026_account_render_birth_date_field();
$rendered = ob_get_clean();
contract_assert( false !== strpos( $rendered, '03/02/1988' ), 'canonical user-meta Y-m-d is displayed as DD/MM/YYYY' );
contract_assert( false !== strpos( $rendered, 'data-birth-date-source="wordpress-user-meta"' ), 'renderer identifies WordPress user meta as its source' );
contract_assert( false !== strpos( $rendered, '<span class="cr-account-birth-date__value">' ), 'birthday is rendered as display-only text' );
contract_assert( false === strpos( $rendered, '<input' ), 'birthday renderer contains no input, hidden field or picker' );
contract_assert( array( 73, 'criosrango_birth_date', true ) === $GLOBALS['test_meta_reads'][0], 'only the canonical app meta key is read for the current user' );

$GLOBALS['test_user_meta']['criosrango_birth_date'] = '';
$GLOBALS['test_meta_reads'] = array();
ob_start();
cr2026_account_render_birth_date_field();
$empty_rendered = ob_get_clean();
contract_assert( false !== strpos( $empty_rendered, 'No registrada' ), 'empty canonical meta alone produces No registrada' );
contract_assert( array( 73, 'criosrango_birth_date', true ) === $GLOBALS['test_meta_reads'][0], 'empty fallback is based on the actual canonical meta read' );

$GLOBALS['test_user_meta']['criosrango_birth_date'] = '2026-02-31';
ob_start();
cr2026_account_render_birth_date_field();
$invalid_rendered = ob_get_clean();
contract_assert( false === strpos( $invalid_rendered, 'No registrada' ), 'invalid non-empty data is not disguised as an empty meta value' );
contract_assert( false !== strpos( $invalid_rendered, 'Fecha no válida' ), 'invalid non-empty ISO date is rejected by strict parsing' );

$source = file_get_contents( __DIR__ . '/../theme/crios-rango-2026/inc/account-presentation.php' );
$birthday_start = strpos( $source, 'function cr2026_account_render_birth_date_field()' );
$birthday_end = strpos( $source, "add_action( 'woocommerce_edit_account_form', 'cr2026_account_render_birth_date_field', 1 );", $birthday_start );
$birthday_function = substr( $source, $birthday_start, $birthday_end - $birthday_start );
contract_assert( false === strpos( $source, 'EarnCampaign' ), 'profile presentation has no WPLoyalty EarnCampaign dependency' );
contract_assert( false === strpos( $source, 'getPointUserByEmail' ), 'profile presentation does not query WPLoyalty by email' );
contract_assert( false === strpos( $source, 'birthday_date' ), 'profile presentation does not read WPLoyalty birthday_date' );
contract_assert( false === strpos( $source, 'woocommerce_save_account_details_errors' ), 'birthday adds no WooCommerce profile validation hook' );
contract_assert( false === strpos( $birthday_function, '$_POST' ), 'birthday renderer has no POST read path' );
contract_assert( false === strpos( $birthday_function, 'update_user_meta' ), 'birthday renderer has no user-meta write path' );
contract_assert( false === strpos( $birthday_function, 'name="birth_date"' ), 'birthday renderer adds no POST field' );
contract_assert( false === strpos( $birthday_function, '<input' ), 'birthday renderer adds no date picker or hidden field' );

$shipping_fields = cr2026_account_shipping_address_fields( array(
    'shipping_address_1' => array( 'type' => 'text' ),
    'shipping_phone' => array( 'type' => 'tel', 'required' => true ),
), 'ES' );
contract_assert( isset( $shipping_fields['shipping_address_2'] ), 'native shipping_address_2 field remains in the address form schema' );
contract_assert( 'Dirección adicional / Piso, puerta, etc.' === $shipping_fields['shipping_address_2']['label'], 'shipping_address_2 label remains unchanged' );
contract_assert( '' === $shipping_fields['shipping_address_2']['placeholder'], 'shipping_address_2 placeholder remains empty' );
contract_assert( false === $shipping_fields['shipping_address_2']['required'] && false === $shipping_fields['shipping_address_2']['hidden'], 'shipping_address_2 remains optional and visible' );
contract_assert( true === $shipping_fields['shipping_phone']['required'], 'existing shipping_phone required policy is preserved' );

cr2026_account_address_endpoint_toolbar( 'shipping' );
contract_assert( 'Dirección de entrega' === $GLOBALS['test_toolbar'][0], 'shipping endpoint keeps the delivery toolbar heading' );
contract_assert( '' === cr2026_account_edit_address_title( 'Shipping address', 'shipping' ), 'WooCommerce secondary shipping heading remains suppressed' );

echo "BIRTH_DATE_CONTRACT=PASS\n";
