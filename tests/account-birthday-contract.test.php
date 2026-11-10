<?php
/**
 * Isolated contract test for the theme/WPLoyalty 1.4.9 birthday boundary.
 * Uses fake account data only; no real customer information is emitted.
 */
namespace Wlr\App\Helpers {
    class EarnCampaign {
        public static $user;
        public static $lookedUpEmail = '';
        public static function getInstance() { return new self(); }
        public function getPointUserByEmail( $email ) {
            self::$lookedUpEmail = $email;
            return self::$user;
        }
    }
    class Woocommerce {
        public static $editable = true;
        public static function getInstance() { return new self(); }
        public function canShowBirthdateField() { return self::$editable; }
        public function beforeDisplayDate( $timestamp, $format = 'Y-m-d' ) {
            return gmdate( $format, (int) $timestamp );
        }
    }
    class Base {
        public static $actionData;
        public static $transactionType;
        public static function getInstance() { return new self(); }
        public function addExtraPointAction( $action_data, $transaction_type ) {
            self::$actionData = $action_data;
            self::$transactionType = $transaction_type;
            EarnCampaign::$user->birthday_date = $action_data['birthday_date'];
            return true;
        }
    }
}
namespace {
    define( 'ABSPATH', __DIR__ );
    $GLOBALS['test_authenticated'] = true;
    $GLOBALS['test_nonce_valid'] = true;
    $GLOBALS['test_current_user'] = (object) array( 'ID' => 73, 'user_email' => 'contract@example.test' );
    $GLOBALS['test_filter_override'] = null;
    function add_action( ...$args ) {}
    function add_filter( ...$args ) {}
    function is_email( $value ) { return is_string( $value ) && false !== strpos( $value, '@' ); }
    function is_user_logged_in() { return $GLOBALS['test_authenticated']; }
    function wp_get_current_user() { return $GLOBALS['test_current_user']; }
    function wp_is_mobile() { return true; }
    function wp_verify_nonce( $nonce, $action ) { return $GLOBALS['test_nonce_valid'] && 'theme-nonce' === $nonce && 'cr2026_update_birth_date' === $action; }
    function sanitize_text_field( $value ) { return trim( (string) $value ); }
    function wp_parse_args( $args, $defaults = array() ) { return array_merge( $defaults, (array) $args ); }
    function is_account_page() { return true; }
    function wc_get_page_permalink( $page ) { return '/mi-cuenta/'; }
    function wc_get_account_endpoint_url( $endpoint ) { return '/mi-cuenta/' . $endpoint . '/'; }
    function cr2026_render_category_toolbar( $title, $back_url, $kind, $flag ) { $GLOBALS['test_toolbar'] = array( $title, $back_url, $kind, $flag ); }
    function get_query_var( $key ) { return ''; }
    function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_\\-]/', '', strtolower( (string) $value ) ); }
    function wp_unslash( $value ) { return $value; }
    function wp_date( $format ) { return '2026-11-10'; }
    function apply_filters( $hook, $value, ...$args ) {
        return null === $GLOBALS['test_filter_override'] ? $value : (bool) $GLOBALS['test_filter_override'];
    }
    function __( $value ) { return $value; }
    class ContractErrors {
        public $errors = array();
        public function add( $code, $message ) { $this->errors[$code] = $message; }
        public function has_errors() { return ! empty( $this->errors ); }
    }
    require __DIR__ . '/../theme/crios-rango-2026/inc/account-presentation.php';

    function contract_assert( $condition, $label ) {
        if ( ! $condition ) {
            fwrite( STDERR, "FAIL: {$label}\n" );
            exit( 1 );
        }
        echo "PASS: {$label}\n";
    }
    function contract_reset() {
        $_GET = array( 'profile_view' => 'personal' );
        $_POST = array(
            'save_account_details' => 'Save',
            'cr2026_birth_date_nonce' => 'theme-nonce',
            'cr2026_birth_date' => '1990-05-12',
            'user_email' => 'attacker@example.test',
            'user_id' => '999',
        );
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $GLOBALS['test_authenticated'] = true;
        $GLOBALS['test_nonce_valid'] = true;
        $GLOBALS['test_filter_override'] = null;
        \Wlr\App\Helpers\Woocommerce::$editable = true;
        \Wlr\App\Helpers\EarnCampaign::$user = (object) array( 'birthday_date' => '1988-02-03' );
        \Wlr\App\Helpers\Base::$actionData = null;
        \Wlr\App\Helpers\Base::$transactionType = null;
        unset( $GLOBALS['cr2026_account_pending_birth_date'] );
    }

    contract_reset();
    contract_assert( '1988-02-03' === cr2026_account_wlr_birth_date( \Wlr\App\Helpers\EarnCampaign::$user ), 'birthday_date is the preferred Y-m-d read field' );
    contract_assert( cr2026_account_wlr_field_exists( \Wlr\App\Helpers\EarnCampaign::$user, 'birthday_date' ), 'birthday_date property existence is detected independently' );
    contract_assert( cr2026_account_wlr_field_present( \Wlr\App\Helpers\EarnCampaign::$user, 'birthday_date' ), 'birthday_date populated value is detected without exposing it' );
    contract_assert( ! cr2026_account_wlr_field_exists( \Wlr\App\Helpers\EarnCampaign::$user, 'birth_date' ), 'missing birth_date fallback is reported as absent' );

    $protected_user = new class {
        protected $birthday_date = '1988-02-03';
    };
    contract_assert( cr2026_account_wlr_field_exists( $protected_user, 'birthday_date' ), 'protected model birthday_date property is detected' );
    contract_assert( '1988-02-03' === cr2026_account_wlr_birth_date( $protected_user ), 'protected model birthday_date is read and normalized' );

    contract_reset();
    \Wlr\App\Helpers\EarnCampaign::$user = (object) array( 'birth_date' => strtotime( '1991-06-07 UTC' ) );
    contract_assert( '1991-06-07' === cr2026_account_wlr_birth_date( \Wlr\App\Helpers\EarnCampaign::$user ), 'legacy birth_date timestamp fallback is converted through WPLoyalty helper' );

    contract_reset();
    $array_user = array( 'birthday_date' => '2026-10-07', 'birth_date' => strtotime( '1991-06-07 UTC' ) );
    contract_assert( '2026-10-07' === cr2026_account_wlr_birth_date( $array_user ), 'array-shaped WPLoyalty data preserves ISO birthday_date' );
    contract_assert( 'birthday_date' === cr2026_account_wlr_birth_date_source( $array_user ), 'birthday_date is identified as the selected source' );

    contract_reset();
    $invalid_primary = array( 'birthday_date' => '2026-02-31', 'birth_date' => strtotime( '1991-06-07 UTC' ) );
    contract_assert( '1991-06-07' === cr2026_account_wlr_birth_date( $invalid_primary ), 'invalid birthday_date falls back to the WPLoyalty timestamp helper' );

    $shipping_fields = cr2026_account_shipping_address_fields( array(
        'shipping_address_1' => array( 'type' => 'text' ),
        'shipping_phone' => array( 'type' => 'tel', 'required' => true ),
    ), 'ES' );
    contract_assert( isset( $shipping_fields['shipping_address_2'] ), 'native shipping_address_2 field is retained in the address form schema' );
    contract_assert( 'Dirección adicional / Piso, puerta, etc.' === $shipping_fields['shipping_address_2']['label'], 'shipping_address_2 base label leaves the optional suffix to WooCommerce' );
    contract_assert( '' === $shipping_fields['shipping_address_2']['placeholder'], 'shipping_address_2 has no duplicate placeholder copy' );
    contract_assert( false === $shipping_fields['shipping_address_2']['required'] && false === $shipping_fields['shipping_address_2']['hidden'], 'shipping_address_2 remains optional and visible' );
    contract_assert( true === $shipping_fields['shipping_phone']['required'], 'existing shipping_phone required policy is preserved' );

    $GLOBALS['test_toolbar'] = null;
    cr2026_account_address_endpoint_toolbar( 'shipping' );
    contract_assert( 'Dirección de entrega' === $GLOBALS['test_toolbar'][0], 'shipping endpoint argument selects the canonical delivery toolbar heading' );
    contract_assert( '' === cr2026_account_edit_address_title( 'Shipping address', 'shipping' ), 'WooCommerce secondary shipping heading is removed in mobile markup' );

    contract_reset();
    $GLOBALS['test_authenticated'] = false;
    contract_assert( false === cr2026_account_is_mobile_personal_post(), 'unauthenticated account save is rejected' );

    contract_reset();
    $GLOBALS['test_nonce_valid'] = false;
    $errors = new ContractErrors();
    cr2026_account_validate_birth_date( $errors, null );
    contract_assert( isset( $errors->errors['cr2026_birth_date_nonce'] ), 'invalid theme nonce is rejected' );

    contract_reset();
    $_POST['cr2026_birth_date'] = '2026-02-31';
    $errors = new ContractErrors();
    cr2026_account_validate_birth_date( $errors, null );
    contract_assert( isset( $errors->errors['cr2026_birth_date_invalid'] ), 'invalid calendar date is rejected' );

    contract_reset();
    \Wlr\App\Helpers\Woocommerce::$editable = false;
    $errors = new ContractErrors();
    cr2026_account_validate_birth_date( $errors, null );
    contract_assert( isset( $errors->errors['cr2026_birth_date_locked'] ), 'WPLoyalty non-editable policy is respected' );

    contract_reset();
    $errors = new ContractErrors();
    cr2026_account_validate_birth_date( $errors, null );
    contract_assert( ! $errors->has_errors(), 'valid birthday request passes theme and WPLoyalty validation' );
    cr2026_account_save_birth_date( 73 );
    $action = \Wlr\App\Helpers\Base::$actionData;
    contract_assert( 'contract@example.test' === \Wlr\App\Helpers\EarnCampaign::$lookedUpEmail, 'loyalty lookup uses canonical current-user email, not POST email' );
    contract_assert( ! isset( $action['user_id'] ) && ! isset( $action['user_email'] ) || 'contract@example.test' === $action['user_email'], 'client-supplied user_id and email do not select the loyalty account' );
    contract_assert( 'birthday_change' === $action['action_type'], 'WPLoyalty action_type is birthday_change' );
    contract_assert( 'customer_change' === $action['action_process_type'], 'WPLoyalty action_process_type is customer_change' );
    contract_assert( '0' === $action['points'], 'birthday update awards zero points' );
    contract_assert( 'credit' === \Wlr\App\Helpers\Base::$transactionType, 'WPLoyalty transaction type is credit' );
    contract_assert( '1990-05-12' === \Wlr\App\Helpers\EarnCampaign::$user->birthday_date, 'WPLoyalty model action persists the requested date' );

    $source = file_get_contents( __DIR__ . '/../theme/crios-rango-2026/inc/account-presentation.php' );
    contract_assert( false === strpos( $source, '$wpdb->update' ) && false === strpos( $source, 'insertOrUpdate(' ), 'theme does not write WPLoyalty tables or bypass its Users model' );
    echo "BIRTH_DATE_CONTRACT=PASS\n";
}
