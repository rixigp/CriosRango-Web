<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Presentation-only toolbar for native WooCommerce account endpoints.
 * WPLoyalty and WooCommerce continue to own their data and endpoint actions.
 */
function cr2026_account_render_endpoint_toolbar( $title, $back_url = '' ) {
    if ( ! function_exists( 'wc_get_page_permalink' ) ) {
        return;
    }
    if ( ! $back_url ) {
        $back_url = wc_get_page_permalink( 'myaccount' );
    }
    cr2026_render_category_toolbar( $title, $back_url, 'parent', false );
}

/** Add the title before WPLoyalty renders its native reward page. */
function cr2026_account_loyalty_endpoint_toolbar() {
    if ( function_exists( 'is_account_page' ) && is_account_page()
        && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'loyalty_reward' ) ) {
        cr2026_account_render_endpoint_toolbar( __( 'Cupones y promociones', 'crios-rango-2026' ) );
    }
}
add_action( 'woocommerce_account_loyalty_reward_endpoint', 'cr2026_account_loyalty_endpoint_toolbar', 1 );


/** Resolve the mobile profile subview without changing WooCommerce endpoint data. */
function cr2026_account_profile_view() {
    $view = isset( $_GET['profile_view'] ) ? sanitize_key( wp_unslash( $_GET['profile_view'] ) ) : 'home';
    return in_array( $view, array( 'home', 'personal', 'password' ), true ) ? $view : 'home';
}

/** Route only the mobile edit-account endpoint through this presentation layer. */
function cr2026_account_route_mobile_profile() {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page()
        || ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'edit-account' )
        || ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile() ) {
        return;
    }
    remove_action( 'woocommerce_account_edit-account_endpoint', 'woocommerce_account_edit_account', 10 );
    add_action( 'woocommerce_account_edit-account_endpoint', 'cr2026_account_render_mobile_profile', 10 );
}
add_action( 'wp', 'cr2026_account_route_mobile_profile', 20 );

/** Render a profile landing page or WooCommerce's unmodified native edit-account form. */
function cr2026_account_render_mobile_profile() {
    $view = cr2026_account_profile_view();
    if ( 'home' === $view ) {
        cr2026_account_render_profile_home();
        return;
    }
    woocommerce_account_edit_account();
}

/** Profile landing page; all destinations remain native WordPress/WooCommerce URLs. */
function cr2026_account_render_profile_home() {
    $base = wc_get_account_endpoint_url( 'edit-account' );
    $personal_url = add_query_arg( 'profile_view', 'personal', $base );
    $password_url = add_query_arg( 'profile_view', 'password', $base );
    $shipping_url = wc_get_endpoint_url( 'edit-address', 'shipping', wc_get_page_permalink( 'myaccount' ) );
    $delete_url = wc_get_account_endpoint_url( 'wpf-delete-account' );
    ?>
    <section class="cr-account-profile-home" aria-label="<?php esc_attr_e( 'Perfil', 'crios-rango-2026' ); ?>">
        <div class="cr-account-profile-home__main">
            <a href="<?php echo esc_url( $personal_url ); ?>" class="cr-account-profile-home__row">
                <span class="cr-account-profile-home__icon" aria-hidden="true"><?php echo cr2026_icon( 'user' ); ?></span><span><?php esc_html_e( 'Datos personales', 'crios-rango-2026' ); ?></span><span class="cr-account-profile-home__chevron" aria-hidden="true">›</span>
            </a>
            <a href="<?php echo esc_url( $shipping_url ); ?>" class="cr-account-profile-home__row">
                <span class="cr-account-profile-home__icon" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg></span><span><?php esc_html_e( 'Dirección de entrega', 'crios-rango-2026' ); ?></span><span class="cr-account-profile-home__chevron" aria-hidden="true">›</span>
            </a>
            <a href="<?php echo esc_url( $password_url ); ?>" class="cr-account-profile-home__row">
                <span class="cr-account-profile-home__icon" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg></span><span><?php esc_html_e( 'Cambiar contraseña', 'crios-rango-2026' ); ?></span><span class="cr-account-profile-home__chevron" aria-hidden="true">›</span>
            </a>
        </div>
        <a class="cr-account-profile-home__action cr-account-profile-home__action--delete" href="<?php echo esc_url( $delete_url ); ?>">
            <span class="cr-account-profile-home__action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"></path></svg></span><span><?php esc_html_e( 'Eliminar cuenta', 'crios-rango-2026' ); ?></span><span class="cr-account-profile-home__chevron" aria-hidden="true">›</span>
        </a>
        <a class="cr-account-profile-home__action cr-account-profile-home__action--logout" href="<?php echo esc_url( wc_logout_url() ); ?>">
            <span class="cr-account-profile-home__action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"></path><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"></path></svg></span><span><?php esc_html_e( 'Cerrar sesión', 'crios-rango-2026' ); ?></span><span class="cr-account-profile-home__chevron" aria-hidden="true">›</span>
        </a>
    </section>
    <?php
}

/** Canonical mobile heading for each profile subview. */
function cr2026_account_profile_endpoint_toolbar() {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page() ) { return; }
    $view = cr2026_account_profile_view();
    $title = 'personal' === $view ? __( 'Datos personales', 'crios-rango-2026' )
        : ( 'password' === $view ? __( 'Cambiar contraseña', 'crios-rango-2026' ) : __( 'Perfil', 'crios-rango-2026' ) );
    cr2026_account_render_endpoint_toolbar( $title, wc_get_account_endpoint_url( 'edit-account' ) );
}
add_action( 'woocommerce_account_edit-account_endpoint', 'cr2026_account_profile_endpoint_toolbar', 1 );

/** Suppress the previous extra heading; the canonical toolbar is the sole title. */
function cr2026_account_profile_personal_heading() {}
add_action( 'woocommerce_before_edit_account_form', 'cr2026_account_profile_personal_heading', 1 );

/** Delete account remains entirely owned by WP Frontend Delete Account. */
function cr2026_account_delete_endpoint_toolbar() {
    if ( function_exists( 'is_account_page' ) && is_account_page() ) {
        cr2026_account_render_endpoint_toolbar( __( 'Eliminar cuenta', 'crios-rango-2026' ), wc_get_account_endpoint_url( 'edit-account' ) );
    }
}
add_action( 'woocommerce_account_wpf-delete-account_endpoint', 'cr2026_account_delete_endpoint_toolbar', 1 );

/** Native address editing stays on WooCommerce's edit-address endpoint. */
function cr2026_account_address_endpoint_toolbar() {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page() ) {
        return;
    }

    $address_type = (string) get_query_var( 'edit-address' );
    if ( '' === $address_type && isset( $_SERVER['REQUEST_URI'] ) ) {
        $request_path = (string) wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH );
        if ( preg_match( '#/edit-address/(shipping|billing)/?$#', $request_path, $matches ) ) {
            $address_type = $matches[1];
        }
    }
    $title = 'shipping' === $address_type
        ? __( 'Dirección de entrega', 'crios-rango-2026' )
        : ( 'billing' === $address_type ? __( 'Dirección de facturación', 'crios-rango-2026' ) : __( 'Direcciones', 'crios-rango-2026' ) );

    cr2026_account_render_endpoint_toolbar( $title, wc_get_account_endpoint_url( 'edit-account' ) );
}
add_action( 'woocommerce_account_edit-address_endpoint', 'cr2026_account_address_endpoint_toolbar', 1 );


function cr2026_account_profile_body_class( $classes ) {
    if ( function_exists( 'is_account_page' ) && is_account_page()
        && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'edit-account' )
        && function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) {
        $classes[] = 'cr-account-profile-view-' . cr2026_account_profile_view();
    }
    return $classes;
}
add_filter( 'body_class', 'cr2026_account_profile_body_class' );

/** Identify the existing Help/FAQ/Contact page selected by the Account home. */
function cr2026_account_is_help_page() {
    return function_exists( 'is_page' ) && is_page( array( 'ayuda', 'preguntas-frecuentes', 'contacto' ) );
}

function cr2026_account_help_body_class( $classes ) {
    if ( cr2026_account_is_help_page() ) {
        $classes[] = 'cr-account-help-page';
    }
    return $classes;
}
add_filter( 'body_class', 'cr2026_account_help_body_class' );

/**
 * One source of truth for Help contact channels and weekly opening hours.
 * No matching WordPress option/theme setting exists in the theme implementation.
 */
function cr2026_account_help_config() {
    return array(
        'whatsapp' => array(
            'label' => __( 'WhatsApp', 'crios-rango-2026' ),
            'display' => '633 246 788',
            'number' => '34633246788',
        ),
        'phone' => array(
            'label' => __( 'Llamar', 'crios-rango-2026' ),
            'display' => '969 091 236',
            'number' => '+34969091236',
        ),
        'email' => array(
            'label' => __( 'Correo electrónico', 'crios-rango-2026' ),
            'address' => 'criosrango@criosrango.es',
        ),
        'hours' => array(
            array( 'day' => __( 'Lunes', 'crios-rango-2026' ), 'time' => '10:00–13:30 · 17:30–21:00' ),
            array( 'day' => __( 'Martes', 'crios-rango-2026' ), 'time' => '10:00–13:30 · 17:30–21:00' ),
            array( 'day' => __( 'Miércoles', 'crios-rango-2026' ), 'time' => '10:00–13:30 · 17:30–21:00' ),
            array( 'day' => __( 'Jueves', 'crios-rango-2026' ), 'time' => '10:00–13:30 · 17:30–21:00' ),
            array( 'day' => __( 'Viernes', 'crios-rango-2026' ), 'time' => '10:00–13:30 · 17:30–21:00' ),
            array( 'day' => __( 'Sábado', 'crios-rango-2026' ), 'time' => '10:00–13:30' ),
            array( 'day' => __( 'Domingo', 'crios-rango-2026' ), 'time' => __( 'Cerrado', 'crios-rango-2026' ) ),
        ),
    );
}

/** Render mobile Help from controlled theme markup, never from page-builder content. */
function cr2026_account_help_content( $content ) {
    if ( is_admin() || ! is_main_query() || ! in_the_loop() || ! cr2026_account_is_help_page()
        || ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile() ) {
        return $content;
    }

    $config = cr2026_account_help_config();
    $whatsapp = $config['whatsapp'];
    $phone = $config['phone'];
    $email = $config['email'];

    ob_start();
    cr2026_account_render_endpoint_toolbar( __( 'Ayuda', 'crios-rango-2026' ) );
    ?>
    <section class="cr-account-help" aria-label="<?php esc_attr_e( 'Contacto y ayuda', 'crios-rango-2026' ); ?>">
        <h2 class="cr-account-help__heading"><?php esc_html_e( 'Contacta con nosotros', 'crios-rango-2026' ); ?></h2>
        <div class="cr-account-help__grid">
            <a class="cr-account-help__card cr-account-help__card--whatsapp" href="<?php echo esc_url( 'https://wa.me/' . $whatsapp['number'] ); ?>">
                <span class="cr-account-help__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"/><path d="M8.8 8.4c.3-.5.6-.5.9-.5h.5l.8 1.9-.8.9c.6 1.2 1.5 2.1 2.7 2.7l.9-.8 1.9.8v.5c0 .3 0 .6-.5.9-.5.3-1.1.4-1.7.2-2.8-.8-5.1-3.1-5.9-5.9-.2-.6-.1-1.2.2-1.7Z"/></svg>
                </span>
                <span class="cr-account-help__copy"><strong><?php echo esc_html( $whatsapp['label'] ); ?></strong><small><?php echo esc_html( $whatsapp['display'] ); ?></small></span>
                <span class="cr-account-help__chevron" aria-hidden="true">›</span>
            </a>
            <a class="cr-account-help__card cr-account-help__card--phone" href="<?php echo esc_url( 'tel:' . $phone['number'] ); ?>">
                <span class="cr-account-help__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h3l1.5 4.5-2 1.7a15 15 0 0 0 5.3 5.3l1.7-2L21 14v3c0 1.1-.9 2-2 2C10 19 5 14 5 5c0-1.1.9-2 2-2Z"/></svg>
                </span>
                <span class="cr-account-help__copy"><strong><?php echo esc_html( $phone['label'] ); ?></strong><small><?php echo esc_html( $phone['display'] ); ?></small></span>
                <span class="cr-account-help__chevron" aria-hidden="true">›</span>
            </a>
            <a class="cr-account-help__card cr-account-help__card--email" href="<?php echo esc_url( 'mailto:' . $email['address'] ); ?>">
                <span class="cr-account-help__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
                </span>
                <span class="cr-account-help__copy"><strong><?php echo esc_html( $email['label'] ); ?></strong><small><?php echo esc_html( $email['address'] ); ?></small></span>
                <span class="cr-account-help__chevron" aria-hidden="true">›</span>
            </a>
        </div>
        <section class="cr-account-help__hours" aria-labelledby="cr-account-help-hours-title">
            <h2 id="cr-account-help-hours-title"><?php esc_html_e( 'Horario de atención', 'crios-rango-2026' ); ?></h2>
            <div class="cr-account-help__hours-table">
                <?php foreach ( $config['hours'] as $row ) : ?>
                    <div class="cr-account-help__hours-row"><span><?php echo esc_html( $row['day'] ); ?></span><span><?php echo esc_html( $row['time'] ); ?></span></div>
                <?php endforeach; ?>
            </div>
        </section>
    </section>
    <?php
    return ob_get_clean();
}
add_filter( 'the_content', 'cr2026_account_help_content', 20 );


/**
 * WPLoyalty 1.4.9 birthday integration for the mobile Personal Data view.
 * WooCommerce keeps ownership of the account form and its native POST.
 */
function cr2026_account_wlr_user( $email ) {
    if ( ! class_exists( '\Wlr\App\Helpers\EarnCampaign' ) || ! is_email( $email ) ) {
        return false;
    }
    try {
        $campaign = \Wlr\App\Helpers\EarnCampaign::getInstance();
        return is_object( $campaign ) && method_exists( $campaign, 'getPointUserByEmail' )
            ? $campaign->getPointUserByEmail( $email ) : false;
    } catch ( \Throwable $error ) {
        return false;
    }
}

/** Return WPLoyalty's canonical Y-m-d value, with its legacy timestamp fallback. */
function cr2026_account_wlr_birth_date( $wlr_user ) {
    if ( ! is_object( $wlr_user ) ) {
        return '';
    }
    if ( isset( $wlr_user->birthday_date ) && '' !== $wlr_user->birthday_date
        && '0000-00-00' !== $wlr_user->birthday_date ) {
        $date = \DateTimeImmutable::createFromFormat( '!Y-m-d', (string) $wlr_user->birthday_date );
        return $date && $date->format( 'Y-m-d' ) === $wlr_user->birthday_date ? $date->format( 'Y-m-d' ) : '';
    }
    if ( ! empty( $wlr_user->birth_date ) && class_exists( '\Wlr\App\Helpers\Woocommerce' ) ) {
        try {
            $helper = \Wlr\App\Helpers\Woocommerce::getInstance();
            $date = $helper->beforeDisplayDate( $wlr_user->birth_date, 'Y-m-d' );
            if ( is_string( $date ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
                $parsed = \DateTimeImmutable::createFromFormat( '!Y-m-d', $date );
                return $parsed && $parsed->format( 'Y-m-d' ) === $date ? $date : '';
            }
        } catch ( \Throwable $error ) {
            return '';
        }
    }
    return '';
}

/** Delegate birthday editability to WPLoyalty's own helper and public filter. */
function cr2026_account_wlr_can_edit_birth_date( $wlr_user ) {
    if ( ! class_exists( '\Wlr\App\Helpers\Woocommerce' ) ) {
        return false;
    }
    try {
        $helper = \Wlr\App\Helpers\Woocommerce::getInstance();
        if ( ! is_object( $helper ) || ! method_exists( $helper, 'canShowBirthdateField' )
            || ! $helper->canShowBirthdateField() ) {
            $allowed = false;
        } else {
            $allowed = true;
        }
        return (bool) apply_filters( 'wlr_allow_my_account_edit_birth_date', $allowed, is_user_logged_in(), is_object( $wlr_user ) ? $wlr_user : new \stdClass() );
    } catch ( \Throwable $error ) {
        return false;
    }
}

function cr2026_account_is_mobile_personal_post() {
    return is_user_logged_in()
        && function_exists( 'wp_is_mobile' ) && wp_is_mobile()
        && 'personal' === cr2026_account_profile_view()
        && isset( $_SERVER['REQUEST_METHOD'] ) && 'POST' === strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) )
        && isset( $_POST['save_account_details'] );
}

/** Add the WPLoyalty-owned birthday value inside WooCommerce's native account form. */
function cr2026_account_render_birth_date_field() {
    if ( ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile()
        || ! function_exists( 'is_account_page' ) || ! is_account_page()
        || ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'edit-account' )
        || 'personal' !== cr2026_account_profile_view() || ! is_user_logged_in() ) {
        return;
    }
    $current_user = wp_get_current_user();
    $wlr_user = cr2026_account_wlr_user( $current_user->user_email );
    $birth_date = cr2026_account_wlr_birth_date( $wlr_user );
    $editable = cr2026_account_wlr_can_edit_birth_date( $wlr_user );
    wp_nonce_field( 'cr2026_update_birth_date', 'cr2026_birth_date_nonce' );
    ?>
    <p class="form-row form-row-wide cr-account-birth-date">
        <label for="cr2026_birth_date"><?php esc_html_e( 'Fecha de nacimiento', 'crios-rango-2026' ); ?></label>
        <?php if ( $editable ) : ?>
            <input type="date" id="cr2026_birth_date" name="cr2026_birth_date" value="<?php echo esc_attr( $birth_date ); ?>" max="<?php echo esc_attr( wp_date( 'Y-m-d' ) ); ?>" />
        <?php else : ?>
            <input type="date" id="cr2026_birth_date" value="<?php echo esc_attr( $birth_date ); ?>" readonly aria-readonly="true" />
            <span class="cr-account-birth-date__status"><?php esc_html_e( 'No editable', 'crios-rango-2026' ); ?></span>
        <?php endif; ?>
    </p>
    <?php
}
add_action( 'woocommerce_edit_account_form', 'cr2026_account_render_birth_date_field', 1 );

/** Validate the theme nonce, WPLoyalty policy and strict calendar date before WooCommerce saves. */
function cr2026_account_validate_birth_date( $errors, $user ) {
    if ( ! cr2026_account_is_mobile_personal_post() ) {
        return;
    }
    $nonce = isset( $_POST['cr2026_birth_date_nonce'] )
        ? sanitize_text_field( wp_unslash( $_POST['cr2026_birth_date_nonce'] ) ) : '';
    if ( ! wp_verify_nonce( $nonce, 'cr2026_update_birth_date' ) ) {
        $errors->add( 'cr2026_birth_date_nonce', __( 'No se pudo validar la seguridad de la fecha de nacimiento. Recarga la página e inténtalo de nuevo.', 'crios-rango-2026' ) );
        return;
    }
    if ( ! isset( $_POST['cr2026_birth_date'] ) ) {
        return; // Read-only WPLoyalty birthdays are intentionally not submitted.
    }
    $current_user = wp_get_current_user();
    $wlr_user = cr2026_account_wlr_user( $current_user->user_email );
    if ( ! cr2026_account_wlr_can_edit_birth_date( $wlr_user ) ) {
        $errors->add( 'cr2026_birth_date_locked', __( 'WPLoyalty no permite modificar esta fecha de nacimiento.', 'crios-rango-2026' ) );
        return;
    }
    $value = sanitize_text_field( wp_unslash( $_POST['cr2026_birth_date'] ) );
    $date = \DateTimeImmutable::createFromFormat( '!Y-m-d', $value );
    $date_errors = \DateTimeImmutable::getLastErrors();
    $valid_date = $date && $date->format( 'Y-m-d' ) === $value
        && ( false === $date_errors || ( 0 === $date_errors['warning_count'] && 0 === $date_errors['error_count'] ) );
    if ( ! $valid_date || $value > wp_date( 'Y-m-d' ) ) {
        $errors->add( 'cr2026_birth_date_invalid', __( 'Introduce una fecha de nacimiento válida y que no sea futura.', 'crios-rango-2026' ) );
        return;
    }
    $GLOBALS['cr2026_account_pending_birth_date'] = $value;
}
add_action( 'woocommerce_save_account_details_errors', 'cr2026_account_validate_birth_date', 20, 2 );

/** Persist through WPLoyalty's supported extra-action model after WooCommerce's native save. */
function cr2026_account_save_birth_date( $user_id ) {
    if ( ! isset( $GLOBALS['cr2026_account_pending_birth_date'] ) ) {
        return;
    }
    $birth_date = (string) $GLOBALS['cr2026_account_pending_birth_date'];
    unset( $GLOBALS['cr2026_account_pending_birth_date'] );

    $current_user = wp_get_current_user();
    if ( ! is_user_logged_in() || ! $current_user || (int) $current_user->ID !== (int) $user_id ) {
        cr2026_account_birth_date_save_error();
        return;
    }
    $wlr_user = cr2026_account_wlr_user( $current_user->user_email );
    if ( ! cr2026_account_wlr_can_edit_birth_date( $wlr_user )
        || ! class_exists( '\Wlr\App\Helpers\Base' ) ) {
        cr2026_account_birth_date_save_error();
        return;
    }

    try {
        $base = \Wlr\App\Helpers\Base::getInstance();
        if ( ! is_object( $base ) || ! method_exists( $base, 'addExtraPointAction' ) ) {
            cr2026_account_birth_date_save_error();
            return;
        }
        $action_data = array(
            'user_email'          => $current_user->user_email,
            'birthday_date'       => $birth_date,
            'action_type'          => 'birthday_change',
            'action_process_type'  => 'customer_change',
            'customer_note'       => 'Customer updated birthday from mobile account personal data.',
            'note'                => 'Customer birthday update',
            'points'              => '0',
        );
        $result = $base->addExtraPointAction( $action_data, 'credit' );
        $updated_user = cr2026_account_wlr_user( $current_user->user_email );
        $updated_date = cr2026_account_wlr_birth_date( $updated_user );
        if ( false === $result || null === $result || $updated_date !== $birth_date ) {
            cr2026_account_birth_date_save_error();
        }
    } catch ( \Throwable $error ) {
        cr2026_account_birth_date_save_error();
    }
}
add_action( 'woocommerce_save_account_details', 'cr2026_account_save_birth_date', 20, 1 );

/** Suppress WooCommerce's generic success notice if the independent loyalty save failed. */
function cr2026_account_birth_date_save_error() {
    add_filter( 'woocommerce_add_success', '__return_empty_string', 99 );
    if ( function_exists( 'wc_add_notice' ) ) {
        wc_add_notice( __( 'Tus datos de WooCommerce se han guardado, pero no se pudo guardar la fecha de nacimiento en WPLoyalty. No se ha confirmado el guardado completo; vuelve a intentarlo o contacta con soporte.', 'crios-rango-2026' ), 'error' );
    }
}
