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


/** Mobile page title for the native WooCommerce order-detail endpoint. */
function cr2026_account_view_order_endpoint_toolbar( $order_id = 0 ) {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page()
        || ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile() ) {
        return;
    }
    $order = function_exists( 'wc_get_order' ) ? wc_get_order( absint( $order_id ) ) : false;
    if ( $order instanceof WC_Order && (int) $order->get_customer_id() === (int) get_current_user_id() ) {
        $title = __( 'Detalle de pedido', 'crios-rango-2026' );
    } else {
        $title = __( 'Detalle del pedido', 'crios-rango-2026' );
    }
    cr2026_account_render_endpoint_toolbar( $title, wc_get_account_endpoint_url( 'orders' ) );
}
add_action( 'woocommerce_account_view-order_endpoint', 'cr2026_account_view_order_endpoint_toolbar', 1 );

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
function cr2026_account_address_endpoint_toolbar( $endpoint_value = '' ) {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page() ) {
        return;
    }

    // WooCommerce passes the selected address type to this endpoint action.
    $address_type = in_array( $endpoint_value, array( 'shipping', 'billing' ), true )
        ? (string) $endpoint_value
        : (string) get_query_var( 'edit-address' );
    if ( '' === $address_type && isset( $_SERVER['REQUEST_URI'] ) ) {
        $request_path = (string) wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH );
        if ( preg_match( '#/edit-address/(shipping|billing)/?$#', $request_path, $matches ) ) {
            $address_type = $matches[1];
        }
    }
    // The mobile editor is the shipping address screen; WooCommerce can omit
    // the endpoint subtype from the action argument on some permalink setups.
    $title = 'billing' === $address_type
        ? __( 'Dirección de facturación', 'crios-rango-2026' )
        : __( 'Dirección de entrega', 'crios-rango-2026' );

    cr2026_account_render_endpoint_toolbar( $title, wc_get_account_endpoint_url( 'edit-account' ) );
}
add_action( 'woocommerce_account_edit-address_endpoint', 'cr2026_account_address_endpoint_toolbar', 1 );

/** The toolbar is the only mobile title; suppress WooCommerce's secondary H2 in markup. */
function cr2026_account_edit_address_title( $page_title, $load_address ) {
    if ( 'shipping' === $load_address
        && function_exists( 'is_account_page' ) && is_account_page()
        && function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) {
        return '';
    }
    return $page_title;
}
add_filter( 'woocommerce_my_account_edit_address_title', 'cr2026_account_edit_address_title', 10, 2 );

/** Keep WooCommerce's native shipping_address_2 field visible and use the app copy. */
function cr2026_account_shipping_address_fields( $fields, $country = '' ) {
    if ( ! is_array( $fields ) ) {
        return $fields;
    }

    $address_2 = isset( $fields['shipping_address_2'] ) && is_array( $fields['shipping_address_2'] )
        ? $fields['shipping_address_2'] : array();
    $address_2 = wp_parse_args( $address_2, array(
        'type'        => 'text',
        'required'    => false,
        'class'       => array( 'form-row-wide' ),
        'priority'    => 60,
        'autocomplete'=> 'address-line2',
    ) );
    $address_2['label'] = __( 'Dirección adicional / Piso, puerta, etc.', 'crios-rango-2026' );
    // WooCommerce appends its single localized optional marker to the label.
    // Keep the field itself empty unless the customer has a saved value.
    $address_2['placeholder'] = '';
    $address_2['required'] = false;
    $address_2['hidden'] = false;
    $address_2['class'] = array_values( array_unique( array_merge( (array) $address_2['class'], array( 'form-row-wide' ) ) ) );
    $fields['shipping_address_2'] = $address_2;

    return $fields;
}
add_filter( 'woocommerce_shipping_fields', 'cr2026_account_shipping_address_fields', 9999, 2 );


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
                    <!-- App equivalent: Icons.AutoMirrored.Outlined.Chat -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/><path d="M7 9h10M7 13h7"/></svg>
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
        <h2 class="cr-account-help__heading cr-account-help__hours-heading"><?php esc_html_e( 'Horario de atención', 'crios-rango-2026' ); ?></h2>
        <section class="cr-account-help__hours" aria-label="<?php esc_attr_e( 'Horario de atención', 'crios-rango-2026' ); ?>">
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



/** Preserve the existing mobile Account/Address required-marker presentation. */
function cr2026_account_mobile_field_marker_styles() {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page()
        || ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile() ) {
        return;
    }
    echo '<style id="cr2026-account-mobile-field-markers">'
        . '.woocommerce-EditAccountForm label .required{display:none!important;}'
        . 'body.woocommerce-account .woocommerce-address-fields label :is(abbr.required,span.required){display:none!important;}'
        . '</style>';
}
add_action( 'wp_head', 'cr2026_account_mobile_field_marker_styles', 99 );

/** Display the canonical app-owned WordPress birth date as read-only text. */
function cr2026_account_render_birth_date_field() {
    if ( ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile()
        || ! function_exists( 'is_account_page' ) || ! is_account_page()
        || ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'edit-account' )
        || 'personal' !== cr2026_account_profile_view() || ! is_user_logged_in() ) {
        return;
    }

    $user_id = (int) get_current_user_id();
    if ( $user_id <= 0 ) {
        return;
    }

    $birth_date_raw = (string) get_user_meta( $user_id, 'criosrango_birth_date', true );
    $birth_date_display = '';

    if ( '' === $birth_date_raw ) {
        $birth_date_display = __( 'No registrada', 'crios-rango-2026' );
    } else {
        $date = \DateTimeImmutable::createFromFormat( '!Y-m-d', $birth_date_raw );
        $errors = \DateTimeImmutable::getLastErrors();
        if ( $date && $date->format( 'Y-m-d' ) === $birth_date_raw
            && ( false === $errors || ( 0 === $errors['warning_count'] && 0 === $errors['error_count'] ) ) ) {
            $birth_date_display = $date->format( 'd/m/Y' );
        } else {
            $birth_date_display = __( 'Fecha no válida', 'crios-rango-2026' );
        }
    }
    ?>
    <p class="form-row form-row-wide cr-account-birth-date" data-birth-date-source="wordpress-user-meta" data-birth-date-control-type="read-only-display">
        <label><?php esc_html_e( 'Fecha de nacimiento', 'crios-rango-2026' ); ?></label>
        <span class="cr-account-birth-date__value"><?php echo esc_html( $birth_date_display ); ?></span>
    </p>
    <?php
}

add_action( 'woocommerce_edit_account_form', 'cr2026_account_render_birth_date_field', 1 );


/**
 * Shared mobile Account save-feedback contract.
 * WooCommerce remains the sole owner of validation, sanitization and persistence.
 */
function cr2026_account_mobile_save_context( $endpoint = '' ) {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page()
        || ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile()
        || ! function_exists( 'is_wc_endpoint_url' ) ) {
        return false;
    }
    if ( 'edit-account' === $endpoint ) {
        return is_wc_endpoint_url( 'edit-account' );
    }
    if ( 'edit-address' === $endpoint ) {
        return is_wc_endpoint_url( 'edit-address' );
    }
    return is_wc_endpoint_url( 'edit-account' ) || is_wc_endpoint_url( 'edit-address' );
}

function cr2026_account_store_save_feedback( $feedback ) {
    $user_id = (int) get_current_user_id();
    $allowed = array( 'personal', 'address', 'password' );
    if ( $user_id <= 0 || ! in_array( $feedback, $allowed, true ) ) {
        return;
    }
    update_user_meta( $user_id, '_cr2026_account_save_feedback', $feedback );
}

function cr2026_account_take_save_feedback( $expected ) {
    $user_id = (int) get_current_user_id();
    if ( $user_id <= 0 ) {
        return false;
    }

    $feedback = get_user_meta( $user_id, '_cr2026_account_save_feedback', true );
    // Consume immediately so a refresh can never repeat the success message.
    delete_user_meta( $user_id, '_cr2026_account_save_feedback' );

    $allowed = array( 'personal', 'address', 'password' );
    return in_array( $feedback, $allowed, true ) && $feedback === $expected;
}

function cr2026_account_render_save_feedback( $feedback ) {
    $messages = array(
        'personal' => __( 'Datos actualizados', 'crios-rango-2026' ),
        'address'  => __( 'Dirección actualizada', 'crios-rango-2026' ),
        'password' => __( 'Contraseña actualizada', 'crios-rango-2026' ),
    );
    if ( ! isset( $messages[ $feedback ] ) || ! cr2026_account_take_save_feedback( $feedback ) ) {
        return;
    }
    echo '<p class="cr-account-save-feedback" role="status" aria-live="polite">' . esc_html( $messages[ $feedback ] ) . '</p>';
}

/** Preserve the selected mobile Profile subview across WooCommerce's native POST/redirect. */
function cr2026_account_profile_save_form_feedback() {
    if ( ! cr2026_account_mobile_save_context( 'edit-account' ) ) {
        return;
    }
    $view = cr2026_account_profile_view();
    if ( ! in_array( $view, array( 'personal', 'password' ), true ) ) {
        return;
    }
    echo '<input type="hidden" name="cr2026_account_profile_view" value="' . esc_attr( $view ) . '" />';
    cr2026_account_render_save_feedback( $view );
}
add_action( 'woocommerce_edit_account_form', 'cr2026_account_profile_save_form_feedback', 99 );

/** Render address feedback before WooCommerce's native Save address submit button. */
function cr2026_account_address_save_form_feedback() {
    if ( ! cr2026_account_mobile_save_context( 'edit-address' ) ) {
        return;
    }
    cr2026_account_render_save_feedback( 'address' );
}
add_action( 'woocommerce_after_edit_address_form_shipping', 'cr2026_account_address_save_form_feedback', 99 );

/** Shorten only WooCommerce's three native password labels on the mobile password subview. */
function cr2026_account_password_field_labels( $translated_text, $text, $domain ) {
    if ( 'woocommerce' !== $domain
        || ! cr2026_account_mobile_save_context( 'edit-account' )
        || 'password' !== cr2026_account_profile_view() ) {
        return $translated_text;
    }
    $labels = array(
        'Current password (leave blank to leave unchanged)' => 'Contraseña actual',
        'New password (leave blank to leave unchanged)' => 'Nueva contraseña',
        'Confirm new password' => 'Confirmar nueva contraseña',
        'Contraseña actual (déjalo en blanco para no cambiarla)' => 'Contraseña actual',
        'Nueva contraseña (déjalo en blanco para no cambiarla)' => 'Nueva contraseña',
        'Confirmar nueva contraseña (déjalo en blanco para no cambiarla)' => 'Confirmar nueva contraseña',
    );
    if ( isset( $labels[ $text ] ) ) {
        return $labels[ $text ];
    }
    return isset( $labels[ $translated_text ] ) ? $labels[ $translated_text ] : $translated_text;
}
add_filter( 'gettext', 'cr2026_account_password_field_labels', 20, 3 );

/** Store success only after WooCommerce's native account save action completed without errors. */
function cr2026_account_store_profile_save_feedback( $user_id ) {
    if ( ! cr2026_account_mobile_save_context( 'edit-account' ) ) {
        return;
    }
    $view = isset( $_POST['cr2026_account_profile_view'] )
        ? sanitize_key( wp_unslash( $_POST['cr2026_account_profile_view'] ) )
        : cr2026_account_profile_view();
    if ( ! in_array( $view, array( 'personal', 'password' ), true ) ) {
        return;
    }

    $has_errors = function_exists( 'wc_notice_count' )
        ? wc_notice_count( 'error' ) > 0
        : ( function_exists( 'wc_get_notices' ) && wc_get_notices( 'error' ) );
    if ( $has_errors ) {
        if ( 'password' === $view
            && 'password' === get_user_meta( (int) $user_id, '_cr2026_account_save_feedback', true ) ) {
            delete_user_meta( (int) $user_id, '_cr2026_account_save_feedback' );
        }
        return;
    }

    if ( 'password' === $view ) {
        // Inspect only whether WooCommerce's native POST fields are populated.
        // Their values are never transformed, stored, logged, or compared here.
        $has_current = isset( $_POST['password_current'] )
            && is_string( $_POST['password_current'] )
            && '' !== $_POST['password_current'];
        $has_new = isset( $_POST['password_1'] )
            && is_string( $_POST['password_1'] )
            && '' !== $_POST['password_1'];
        $has_confirm = isset( $_POST['password_2'] )
            && is_string( $_POST['password_2'] )
            && '' !== $_POST['password_2'];

        if ( $has_current && $has_new && $has_confirm
            && function_exists( 'wc_notice_count' )
            && wc_notice_count( 'error' ) === 0 ) {
            cr2026_account_store_save_feedback( 'password' );
        } elseif ( 'password' === get_user_meta( (int) $user_id, '_cr2026_account_save_feedback', true ) ) {
            delete_user_meta( (int) $user_id, '_cr2026_account_save_feedback' );
        }
    } else {
        cr2026_account_store_save_feedback( 'personal' );
    }

    // WooCommerce's core handler redirects immediately after this action; keep
    // the selected mobile subview and let the native save finish before returning.
    $url = wc_get_endpoint_url( 'edit-account', '', wc_get_page_permalink( 'myaccount' ) );
    wp_safe_redirect( add_query_arg( 'profile_view', $view, $url ) );
    exit;
}
add_action( 'woocommerce_save_account_details', 'cr2026_account_store_profile_save_feedback', 99, 1 );

/** WooCommerce calls this after its native shipping-address update has completed. */
function cr2026_account_store_address_save_feedback( $user_id, $load_address ) {
    if ( 'shipping' !== $load_address || ! cr2026_account_mobile_save_context( 'edit-address' ) ) {
        return;
    }
    if ( function_exists( 'wc_get_notices' ) && wc_get_notices( 'error' ) ) {
        return;
    }
    cr2026_account_store_save_feedback( 'address' );
    // Core otherwise redirects to edit-address/ (the address index).
    $url = wc_get_endpoint_url( 'edit-address', 'shipping', wc_get_page_permalink( 'myaccount' ) );
    wp_safe_redirect( $url );
    exit;
}
add_action( 'woocommerce_customer_save_address', 'cr2026_account_store_address_save_feedback', 99, 2 );

/** Hide only WooCommerce success notices on the mobile Account save endpoints; errors remain native. */
function cr2026_account_filter_legacy_save_success( $message ) {
    if ( ! cr2026_account_mobile_save_context( 'edit-address' )
        || ! isset( $_POST['save_address'] )
        || $message !== __( 'Address changed successfully.', 'woocommerce' ) ) {
        return $message;
    }
    return '';
}
add_filter( 'woocommerce_add_success', 'cr2026_account_filter_legacy_save_success', 99, 1 );


/** Scope the app-style wallet presentation to the mobile WPLoyalty account endpoint. */
function cr2026_account_loyalty_reward_body_class( $classes ) {
    if ( function_exists( 'is_account_page' ) && is_account_page()
        && function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'loyalty_reward' )
        && function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) {
        $classes[] = 'cr-account-loyalty-reward';
    }
    return $classes;
}
add_filter( 'body_class', 'cr2026_account_loyalty_reward_body_class' );

/** Replace only WPLoyalty's mobile endpoint output; plugin balances and rules remain untouched. */
function cr2026_account_route_mobile_loyalty_reward() {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page()
        || ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'loyalty_reward' )
        || ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile() ) {
        return;
    }

    $hook_name = 'woocommerce_account_loyalty_reward_endpoint';
    global $wp_filter;
    if ( isset( $wp_filter[ $hook_name ] ) && $wp_filter[ $hook_name ] instanceof WP_Hook ) {
        foreach ( $wp_filter[ $hook_name ]->callbacks as $priority => $callbacks ) {
            foreach ( $callbacks as $callback_data ) {
                if ( empty( $callback_data['function'] ) ) {
                    continue;
                }
                $callback = $callback_data['function'];
                $callback_name = '';
                $callback_file = '';
                if ( is_string( $callback ) ) {
                    $callback_name = $callback;
                    try {
                        $reflection = new ReflectionFunction( $callback );
                        $callback_file = (string) $reflection->getFileName();
                    } catch ( Throwable $error ) {}
                } elseif ( is_array( $callback ) && 2 === count( $callback ) ) {
                    $owner = is_object( $callback[0] ) ? get_class( $callback[0] ) : (string) $callback[0];
                    $callback_name = $owner . '::' . (string) $callback[1];
                    try {
                        $reflection = new ReflectionMethod( $callback[0], $callback[1] );
                        $callback_file = (string) $reflection->getFileName();
                    } catch ( Throwable $error ) {}
                } elseif ( is_object( $callback ) ) {
                    $callback_name = get_class( $callback );
                    try {
                        $reflection = new ReflectionMethod( $callback, '__invoke' );
                        $callback_file = (string) $reflection->getFileName();
                    } catch ( Throwable $error ) {}
                }
                $source_identity = strtolower( $callback_name . ' ' . $callback_file );
                if ( preg_match( '/wlr|wployalty|wp[-_]loyalty[-_]rules/', $source_identity ) ) {
                    remove_action( $hook_name, $callback, (int) $priority );
                }
            }
        }
    }

    add_action( $hook_name, 'cr2026_account_render_mobile_loyalty_reward', 10 );
}
add_action( 'wp', 'cr2026_account_route_mobile_loyalty_reward', 20 );

/** Theme-owned mobile shell; data and actions are read from the existing loyalty/Woo APIs. */
function cr2026_account_render_mobile_loyalty_reward() {
    if ( ! function_exists( 'wp_is_mobile' ) || ! wp_is_mobile()
        || ! function_exists( 'is_account_page' ) || ! is_account_page()
        || ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'loyalty_reward' ) ) {
        return;
    }
    ?>
    <section class="cr-account-loyalty" data-cr-account-loyalty aria-label="<?php esc_attr_e( 'Cupones y promociones', 'crios-rango-2026' ); ?>">
        <p class="cr-account-loyalty__loading" role="status" aria-live="polite"><?php esc_html_e( 'Cargando monedero y promociones…', 'crios-rango-2026' ); ?></p>
    </section>
    <?php
}
