<?php
/**
 * Theme account authentication view.
 *
 * Keep authentication processing, nonce verification, customer creation and
 * login redirects in WooCommerce. This template only selects the guest view.
 *
 * @package WooCommerce\\Templates
 * @version 9.2.0
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

do_action( 'woocommerce_before_customer_login_form' );

$is_register_view = function_exists( 'cr2026_account_guest_register_view' )
    && cr2026_account_guest_register_view();
?>

<?php if ( $is_register_view ) : ?>

    <?php if ( 'yes' === get_option( 'woocommerce_enable_myaccount_registration' ) ) : ?>
        <form method="post" class="woocommerce-form woocommerce-form-register register cr-account-register" <?php do_action( 'woocommerce_register_form_tag' ); ?> aria-label="<?php esc_attr_e( 'Crear cuenta', 'crios-rango-2026' ); ?>">
            <?php do_action( 'woocommerce_register_form_start' ); ?>

            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide cr-account-register__row">
                <label for="reg_first_name"><?php esc_html_e( 'Nombre', 'crios-rango-2026' ); ?> <span class="required" aria-hidden="true">*</span></label>
                <input type="text" class="woocommerce-Input woocommerce-Input--text input-text" name="first_name" id="reg_first_name" autocomplete="given-name" value="<?php echo isset( $_POST['first_name'] ) ? esc_attr( wp_unslash( $_POST['first_name'] ) ) : ''; ?>" required aria-required="true" />
            </p>
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide cr-account-register__row">
                <label for="reg_last_name"><?php esc_html_e( 'Apellidos', 'crios-rango-2026' ); ?> <span class="required" aria-hidden="true">*</span></label>
                <input type="text" class="woocommerce-Input woocommerce-Input--text input-text" name="last_name" id="reg_last_name" autocomplete="family-name" value="<?php echo isset( $_POST['last_name'] ) ? esc_attr( wp_unslash( $_POST['last_name'] ) ) : ''; ?>" required aria-required="true" />
            </p>
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide cr-account-register__row">
                <label for="reg_email"><?php esc_html_e( 'Correo electrónico', 'crios-rango-2026' ); ?> <span class="required" aria-hidden="true">*</span></label>
                <input type="email" class="woocommerce-Input woocommerce-Input--text input-text" name="email" id="reg_email" autocomplete="email" value="<?php echo isset( $_POST['email'] ) ? esc_attr( wp_unslash( $_POST['email'] ) ) : ''; ?>" required aria-required="true" />
            </p>
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide cr-account-register__row">
                <label for="reg_phone"><?php esc_html_e( 'Teléfono', 'crios-rango-2026' ); ?></label>
                <input type="tel" class="woocommerce-Input woocommerce-Input--text input-text" name="phone" id="reg_phone" autocomplete="tel" value="<?php echo isset( $_POST['phone'] ) ? esc_attr( wp_unslash( $_POST['phone'] ) ) : ''; ?>" />
            </p>
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide cr-account-register__row">
                <label for="reg_birthday"><?php esc_html_e( 'Fecha de nacimiento', 'crios-rango-2026' ); ?> <span class="required" aria-hidden="true">*</span></label>
                <input type="date" class="woocommerce-Input woocommerce-Input--text input-text" name="birthday" id="reg_birthday" autocomplete="bday" value="<?php echo isset( $_POST['birthday'] ) ? esc_attr( wp_unslash( $_POST['birthday'] ) ) : ''; ?>" required aria-required="true" />
            </p>
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide cr-account-register__row">
                <label for="reg_password"><?php esc_html_e( 'Contraseña', 'crios-rango-2026' ); ?> <span class="required" aria-hidden="true">*</span></label>
                <input type="password" class="woocommerce-Input woocommerce-Input--text input-text" name="password" id="reg_password" autocomplete="new-password" required aria-required="true" />
            </p>
            <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide cr-account-register__row">
                <label for="reg_password_confirmation"><?php esc_html_e( 'Repetir contraseña', 'crios-rango-2026' ); ?> <span class="required" aria-hidden="true">*</span></label>
                <input type="password" class="woocommerce-Input woocommerce-Input--text input-text" name="password_confirmation" id="reg_password_confirmation" autocomplete="new-password" required aria-required="true" />
            </p>

            <?php do_action( 'woocommerce_register_form' ); ?>

            <p class="woocommerce-form-row form-row cr-account-register__actions">
                <?php wp_nonce_field( 'woocommerce-register', 'woocommerce-register-nonce' ); ?>
                <button type="submit" class="woocommerce-Button woocommerce-button button woocommerce-form-register__submit" name="register" value="<?php esc_attr_e( 'Crear cuenta', 'crios-rango-2026' ); ?>"><?php esc_html_e( 'Crear cuenta', 'crios-rango-2026' ); ?></button>
            </p>

            <?php do_action( 'woocommerce_register_form_end' ); ?>
        </form>
        <p class="cr-account-register__login"><?php esc_html_e( '¿Ya tienes cuenta?', 'crios-rango-2026' ); ?> <a href="<?php echo esc_url( cr2026_account_guest_login_url() ); ?>"><?php esc_html_e( 'Acceder', 'crios-rango-2026' ); ?></a></p>
    <?php else : ?>
        <p class="woocommerce-info"><?php esc_html_e( 'El registro de clientes no está disponible en este momento.', 'crios-rango-2026' ); ?></p>
    <?php endif; ?>

<?php else : ?>

    <form class="woocommerce-form woocommerce-form-login login" method="post" aria-label="<?php esc_attr_e( 'Acceder', 'crios-rango-2026' ); ?>">
        <?php do_action( 'woocommerce_login_form_start' ); ?>

        <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
            <label for="username"><?php esc_html_e( 'Usuario/correo', 'crios-rango-2026' ); ?>&nbsp;<span class="required" aria-hidden="true">*</span><span class="screen-reader-text"><?php esc_html_e( 'Required', 'woocommerce' ); ?></span></label>
            <input type="text" class="woocommerce-Input woocommerce-Input--text input-text" name="username" id="username" autocomplete="username" value="<?php echo ( ! empty( $_POST['username'] ) ) ? esc_attr( wp_unslash( $_POST['username'] ) ) : ''; ?>" required aria-required="true" />
        </p>
        <p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
            <label for="password"><?php esc_html_e( 'Contraseña', 'crios-rango-2026' ); ?>&nbsp;<span class="required" aria-hidden="true">*</span><span class="screen-reader-text"><?php esc_html_e( 'Required', 'woocommerce' ); ?></span></label>
            <input class="woocommerce-Input woocommerce-Input--text input-text" type="password" name="password" id="password" autocomplete="current-password" required aria-required="true" />
        </p>

        <?php do_action( 'woocommerce_login_form' ); ?>

        <p class="form-row">
            <label class="woocommerce-form__label woocommerce-form__label-for-checkbox woocommerce-form-login__rememberme">
                <input class="woocommerce-form__input woocommerce-form__input-checkbox" name="rememberme" type="checkbox" id="rememberme" value="forever" /> <span><?php esc_html_e( 'Recuérdame', 'crios-rango-2026' ); ?></span>
            </label>
            <?php wp_nonce_field( 'woocommerce-login', 'woocommerce-login-nonce' ); ?>
            <button type="submit" class="woocommerce-button button woocommerce-form-login__submit<?php echo esc_attr( wc_wp_theme_get_element_class_name( 'button' ) ? ' ' . wc_wp_theme_get_element_class_name( 'button' ) : '' ); ?>" name="login" value="<?php esc_attr_e( 'Acceder', 'crios-rango-2026' ); ?>"><?php esc_html_e( 'Acceder', 'crios-rango-2026' ); ?></button>
        </p>
        <p class="woocommerce-LostPassword lost_password">
            <a href="<?php echo esc_url( wp_lostpassword_url() ); ?>"><?php esc_html_e( '¿Olvidaste la contraseña?', 'crios-rango-2026' ); ?></a>
        </p>
        <div class="cr-account-register-cta">
            <p><?php esc_html_e( '¿Aún no tienes cuenta?', 'crios-rango-2026' ); ?></p>
            <a class="woocommerce-button button cr-account-register-cta__button" href="<?php echo esc_url( add_query_arg( 'cr-account-view', 'register', wc_get_page_permalink( 'myaccount' ) ) ); ?>"><?php esc_html_e( 'Crear cuenta', 'crios-rango-2026' ); ?></a>
        </div>

        <?php do_action( 'woocommerce_login_form_end' ); ?>
    </form>

<?php endif; ?>

<?php do_action( 'woocommerce_after_customer_login_form' ); ?>
