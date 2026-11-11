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
    function is_wc_endpoint_url( $endpoint ) { return 'edit-account' === $endpoint; }
    function esc_attr( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); }
    function esc_html( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); }
    function esc_html_e( $value ) { echo esc_html( $value ); }
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

    $source = file_get_contents( __DIR__ . '/../theme/crios-rango-2026/inc/account-presentation.php' );
    contract_assert( false === strpos( $source, 'cr2026_account_validate_birth_date' ), 'birthday validation callback is removed from the profile save flow' );
    contract_assert( false === strpos( $source, 'cr2026_account_save_birth_date' ), 'birthday profile write handler is removed' );
    contract_assert( false === strpos( $source, 'cr2026_birth_date_nonce' ), 'profile no longer emits or verifies a birthday nonce' );
    contract_assert( false === strpos( $source, 'woocommerce_save_account_details_errors' ), 'profile save no longer attaches birthday validation to WooCommerce errors' );
    contract_assert( false === strpos( $source, 'cr2026_birth_date' ), 'profile contains no birthday POST field or input identifier' );
    contract_assert( false === strpos( $source, '<input type="date"' ), 'birthday renderer uses no date input or picker' );
    contract_assert( false === strpos( $source, 'cr2026_account_birth_date_save_error' ), 'birthday cannot inject a profile save error' );

    contract_assert( 'd/m/Y' === cr2026_account_wlr_birth_date_raw_format( '03/02/1988' ), 'raw d/m/Y format is detected' );
    contract_assert( 'Y-m-d' === cr2026_account_wlr_birth_date_raw_format( '1988-02-03' ), 'raw ISO format is detected' );
    contract_assert( 'timestamp' === cr2026_account_wlr_birth_date_raw_format( strtotime( '1988-02-03 UTC' ) ), 'raw timestamp format is detected' );

    contract_reset();
    $_GET['profile_view'] = 'personal';
    \Wlr\App\Helpers\EarnCampaign::$user = (object) array( 'birthday_date' => '1988-02-03' );
    ob_start();
    cr2026_account_render_birth_date_field();
    $rendered = ob_get_clean();
    contract_assert( 'contract@example.test' === \Wlr\App\Helpers\EarnCampaign::$lookedUpEmail, 'birthday display reads WPLoyalty by current account email' );
    contract_assert( false !== strpos( $rendered, 'data-wlr-user-found="yes"' ), 'WPLoyalty user-found status is reflected for renderer contract' );
    contract_assert( false !== strpos( $rendered, 'data-birth-date-source-field="birthday_date"' ), 'birthday_date is selected before legacy fallback' );
    contract_assert( false !== strpos( $rendered, 'data-birth-date-raw-format="Y-m-d"' ), 'renderer identifies raw WPLoyalty date format' );
    contract_assert( false !== strpos( $rendered, 'data-birth-date-control-type="read-only-display"' ), 'birthday control is marked read-only display' );
    contract_assert( false !== strpos( $rendered, '03/02/1988' ), 'normalized birthday is displayed as DD/MM/YYYY' );
    contract_assert( false !== strpos( $rendered, '<span class="cr-account-birth-date__value">' ), 'birthday value is rendered as a span' );
    contract_assert( false === strpos( $rendered, '<input' ), 'birthday renderer has no input, picker or editable control' );

    contract_reset();
    $_GET['profile_view'] = 'personal';
    \Wlr\App\Helpers\EarnCampaign::$user = (object) array( 'birth_date' => strtotime( '1991-06-07 UTC' ) );
    ob_start();
    cr2026_account_render_birth_date_field();
    $legacy_rendered = ob_get_clean();
    contract_assert( false !== strpos( $legacy_rendered, 'data-birth-date-source-field="birth_date"' ), 'legacy birth_date is used only as fallback source' );
    contract_assert( false !== strpos( $legacy_rendered, '07/06/1991' ), 'legacy timestamp fallback is displayed normalized' );

    contract_reset();
    $_GET['profile_view'] = 'personal';
    \Wlr\App\Helpers\EarnCampaign::$user = false;
    ob_start();
    cr2026_account_render_birth_date_field();
    $missing_rendered = ob_get_clean();
    contract_assert( false !== strpos( $missing_rendered, 'No registrada' ), 'missing WPLoyalty birthday displays No registrada' );
    contract_assert( false !== strpos( $missing_rendered, 'data-wlr-user-found="no"' ), 'missing WPLoyalty account is indicated without blocking profile save' );

    $theme_files = array(
        __DIR__ . '/../theme/crios-rango-2026/inc/login.php',
        __DIR__ . '/../theme/crios-rango-2026/woocommerce/myaccount/dashboard.php',
    );
    $registration_birthday_found = false;
    foreach ( $theme_files as $theme_file ) {
        $registration_source = file_get_contents( $theme_file );
        if ( false !== strpos( $registration_source, 'birth_date' ) || false !== strpos( $registration_source, 'birthday_date' ) ) {
            $registration_birthday_found = true;
        }
    }
    contract_assert( false === $registration_birthday_found, 'theme authentication/dashboard templates contain no custom registration birthday field' );

    echo "BIRTH_DATE_CONTRACT=PASS\n";
}
