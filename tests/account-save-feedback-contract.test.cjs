const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const php = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/account-presentation.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/account.css'), 'utf8');
const controlsCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/controls.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/js/account-save-feedback.js'), 'utf8');
const assets = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/assets.php'), 'utf8');

function extractPhpFunction(name) {
  const start = php.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const open = php.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < php.length; i += 1) {
    if (php[i] === '{') depth += 1;
    if (php[i] === '}') {
      depth -= 1;
      if (depth === 0) return php.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

test('ACCOUNT_SAVE_FEEDBACK_USES_PRIVATE_USER_META_AND_INLINE_COMPONENT', () => {
  const feedback = php.slice(php.indexOf('Shared mobile Account save-feedback contract'));
  assert.match(feedback, /update_user_meta\(\s*\$user_id,\s*'_cr2026_account_save_feedback',\s*\$feedback\s*\)/);
  assert.match(feedback, /get_user_meta\(\s*\$user_id,\s*'_cr2026_account_save_feedback',\s*true\s*\)/);
  assert.match(feedback, /delete_user_meta\(\s*\$user_id,\s*'_cr2026_account_save_feedback'\s*\)/);
  assert.doesNotMatch(feedback, /cr2026_account_save_feedback_session|WC\(\)->session|session->(?:get|set)/);
  assert.match(feedback, /class="cr-account-save-feedback"/);
  assert.match(feedback, /'personal'\s*=>\s*__\(\s*'Datos actualizados'/);
  assert.match(feedback, /'address'\s*=>\s*__\(\s*'Dirección actualizada'/);
  assert.match(feedback, /'password'\s*=>\s*__\(\s*'Contraseña actualizada'/);
});

test('NATIVE_WOOCOMMERCE_SAVE_ACTIONS_REMAIN_THE_ONLY_PERSISTENCE_PATH', () => {
  assert.match(php, /add_action\(\s*'woocommerce_save_account_details',\s*'cr2026_account_store_profile_save_feedback'/);
  assert.match(php, /add_action\(\s*'woocommerce_customer_save_address',\s*'cr2026_account_store_address_save_feedback'/);
  assert.match(php, /add_action\(\s*'woocommerce_after_edit_address_form_shipping',\s*'cr2026_account_address_save_form_feedback',\s*99\s*\)/);
  assert.doesNotMatch(php, /add_action\(\s*'woocommerce_after_edit_address_form',\s*'cr2026_account_address_save_form_feedback'/);
  assert.match(php, /wp_safe_redirect\( add_query_arg\( 'profile_view', \$view, \$url \) \)/);
  assert.match(php, /wp_safe_redirect\( \$url \)/);
  assert.doesNotMatch(php.slice(php.indexOf('Shared mobile Account save-feedback contract')), /wp_update_user\s*\(|\$wpdb->/);
});

test('USER_META_STORE_TAKE_AND_ONE_SHOT_CONSUMPTION_EXECUTE_WITH_WORDPRESS_STUBS', () => {
  const extractFunction = (name) => {
    const start = php.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} exists`);
    const open = php.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < php.length; i += 1) {
      if (php[i] === '{') depth += 1;
      if (php[i] === '}') {
        depth -= 1;
        if (depth === 0) return php.slice(start, i + 1);
      }
    }
    throw new Error(`Unclosed function ${name}`);
  };
  const store = extractFunction('cr2026_account_store_save_feedback');
  const take = extractFunction('cr2026_account_take_save_feedback');
  const harness = `$GLOBALS['uid'] = 41;
$GLOBALS['meta'] = [];
function get_current_user_id() { return $GLOBALS['uid']; }
function update_user_meta($id, $key, $value) { $GLOBALS['meta'][$id][$key] = $value; return true; }
function get_user_meta($id, $key, $single = false) { return $GLOBALS['meta'][$id][$key] ?? ''; }
function delete_user_meta($id, $key) { unset($GLOBALS['meta'][$id][$key]); return true; }
${store}
${take}
cr2026_account_store_save_feedback('address');
$stored = $GLOBALS['meta'][41]['_cr2026_account_save_feedback'] ?? null;
$first = cr2026_account_take_save_feedback('address');
$exists_after_take = array_key_exists('_cr2026_account_save_feedback', $GLOBALS['meta'][41] ?? []);
$refresh = cr2026_account_take_save_feedback('address');
cr2026_account_store_save_feedback('personal');
$mismatch = cr2026_account_take_save_feedback('password');
$mismatch_consumed = !array_key_exists('_cr2026_account_save_feedback', $GLOBALS['meta'][41] ?? []);
cr2026_account_store_save_feedback('invalid');
$invalid_stored = $GLOBALS['meta'][41]['_cr2026_account_save_feedback'] ?? null;
$GLOBALS['uid'] = 0;
cr2026_account_store_save_feedback('password');
$anonymous_take = cr2026_account_take_save_feedback('password');
echo json_encode(compact('stored', 'first', 'exists_after_take', 'refresh', 'mismatch', 'mismatch_consumed', 'invalid_stored', 'anonymous_take'));
`;
  const { execFileSync } = require('node:child_process');
  const output = execFileSync('php', ['-r', harness], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.deepEqual(result, {
    stored: 'address',
    first: true,
    exists_after_take: false,
    refresh: false,
    mismatch: false,
    mismatch_consumed: true,
    invalid_stored: null,
    anonymous_take: false,
  });
});

test('WOOCOMMERCE_VALIDATION_ERRORS_BLOCK_SUCCESS_MARKER_CREATION', () => {
  for (const name of ['cr2026_account_store_profile_save_feedback', 'cr2026_account_store_address_save_feedback']) {
    const start = php.indexOf(`function ${name}(`);
    const open = php.indexOf('{', start);
    let depth = 0, end = -1;
    for (let i = open; i < php.length; i += 1) {
      if (php[i] === '{') depth += 1;
      if (php[i] === '}' && --depth === 0) { end = i + 1; break; }
    }
    const body = php.slice(start, end);
    const guard = body.indexOf("wc_get_notices( 'error' )");
    const store = body.indexOf('cr2026_account_store_save_feedback(');
    assert.ok(guard !== -1 && store !== -1 && guard < store, `${name} checks WooCommerce errors before storing`);
  }
});

test('ADDRESS_SUCCESS_RETURNS_TO_THE_SHIPPING_EDITOR', () => {
  assert.match(php, /wc_get_endpoint_url\(\s*'edit-address',\s*'shipping',\s*wc_get_page_permalink\(\s*'myaccount'\s*\)\s*\)/);
  assert.match(php, /'shipping' !== \$load_address/);
});

test('LEGACY_ADDRESS_SUCCESS_IS_SUPPRESSED_ONLY_ON_MOBILE_SHIPPING_SAVE', () => {
  assert.match(php, /add_filter\(\s*'woocommerce_add_success',\s*'cr2026_account_filter_legacy_save_success'/);
  const filter = extractPhpFunction('cr2026_account_filter_legacy_save_success');
  assert.match(filter, /cr2026_account_mobile_save_context\( 'edit-address' \)/);
  assert.match(filter, /isset\( \$_POST\['save_address'\] \)/);
  assert.ok(filter.includes("Address changed successfully."));
  assert.match(filter, /return \$message;/);
  assert.doesNotMatch(filter, /woocommerce_add_error/);
});

test('LOADING_BLOCKS_DOUBLE_SUBMIT_AND_PRESERVES_NATIVE_SUBMITTER', () => {
  assert.match(js, /form\.dataset\.crAccountSubmitting === '1'/);
  assert.match(js, /event\.preventDefault\(\)/);
  assert.match(js, /cr-account-submit--loading/);
  assert.match(js, /button\.disabled = true/);
  assert.match(js, /window\.setTimeout/);
  assert.match(js, /captured/);
  assert.match(js, /clicked submitter/);
  assert.match(js, /cr-account-submit__spinner/);
  assert.match(css, /\.cr-account-submit__spinner/);
  assert.match(css, /\.cr-account-submit__label\s*\{\s*visibility:\s*hidden/);
});

test('ADDRESS_LOADING_VISUALLY_DISABLES_FORM_AND_REUSES_INLINE_FEEDBACK_ABOVE_CTA', () => {
  assert.match(js, /form\.classList\.add\('cr-account-form--loading'\)/);
  assert.match(js, /form\.classList\.remove\('cr-account-form--loading'\)/);
  assert.match(js, /positionSuccessFeedback/);
  assert.match(js, /insertBefore\(feedback, buttonRow\)/);
  assert.match(css, /\.cr-account-form--loading\s*\{\s*pointer-events:\s*none/);
  assert.match(css, /\.cr-account-form--loading[\s\S]*?opacity:\s*\.48/);
});

test('ADDRESS_LEGACY_SUCCESS_FILTER_IS_EXACT_AND_MOBILE_SHIPPING_SAVE_ONLY', () => {
  const start = php.indexOf('function cr2026_account_filter_legacy_save_success');
  const end = php.indexOf("\nadd_filter( 'woocommerce_add_success'", start);
  const filter = php.slice(start, end);
  assert.match(filter, /cr2026_account_mobile_save_context\( 'edit-address' \)/);
  assert.match(filter, /isset\( \$_POST\['save_address'\] \)/);
  assert.match(filter, /Address changed successfully\./);
  assert.match(filter, /return \$message;/);
});

test('ERROR_CONTENT_IS_MOVED_INLINE_WITHOUT_REWRITING_THE_MESSAGE', () => {
  assert.match(js, /\.woocommerce-error/);
  assert.match(js, /buttonRow\.parentNode\.insertBefore\(notice, buttonRow\)/);
  assert.match(css, /\.cr-account-save-feedback--error/);
});

test('ACCOUNT_LOADING_SCRIPT_IS_ENQUEUED_ONLY_FOR_MOBILE_ACCOUNT', () => {
  assert.match(assets, /\$uses_account_app_skin && function_exists\( 'wp_is_mobile' \) && wp_is_mobile\(\)/);
  assert.match(assets, /assets\/js\/account-save-feedback\.js/);
});


test('SHIPPING_ADDRESS_FORM_BINDING_AND_LOADING_PAINT_PRECEDE_NATIVE_SUBMIT', () => {
  assert.match(js, /form:has\(\.woocommerce-address-fields\)/);
  assert.match(js, /form\.addEventListener\(\s*'submit'/);
  assert.match(js, /window\.requestAnimationFrame\(\(\) => \{/);
  assert.match(js, /form\.requestSubmit\(button\)/);
  assert.match(js, /cr-account-submit--loading/);
  assert.match(js, /cr-account-submit__spinner/);
  assert.match(css, /\.cr-account-submit__spinner/);
  assert.doesNotMatch(js, /form\.querySelectorAll\([^)]*input[^)]*\)\.forEach\([^)]*disabled/);
});

test('SHARED_ACCOUNT_LOADING_SPINNER_IS_A_REAL_DOM_ELEMENT_VISIBLE_CENTERED_AND_ANIMATED', () => {
  assert.match(js, /createElement\('span'\)/);
  assert.match(js, /spinner\.className = 'cr-account-submit__spinner'/);
  assert.match(js, /spinner\.setAttribute\('aria-hidden', 'true'\)/);
  const spinnerRule = css.match(/body\.woocommerce-account button\.cr-account-submit--loading \.cr-account-submit__spinner\s*\{([^}]*)\}/);
  assert.ok(spinnerRule, 'Shared spinner rule exists');
  const spinner = spinnerRule[1];
  assert.match(spinner, /display:\s*block\s*!important/);
  assert.match(spinner, /position:\s*absolute\s*!important/);
  assert.match(spinner, /top:\s*50%\s*!important/);
  assert.match(spinner, /left:\s*50%\s*!important/);
  assert.match(spinner, /width:\s*19px\s*!important/);
  assert.match(spinner, /height:\s*19px\s*!important/);
  assert.match(spinner, /top:\s*50%\s*!important/);
  assert.match(spinner, /left:\s*50%\s*!important/);
  assert.match(spinner, /margin-top:\s*-9\.5px\s*!important/);
  assert.match(spinner, /margin-left:\s*-9\.5px\s*!important/);
  assert.doesNotMatch(spinner, /transform\s*:[^;]*!important/i);
  assert.match(spinner, /border-top-color:\s*#183b35\s*!important/);
  assert.match(spinner, /animation:\s*cr-account-submit-spin\s*\.7s\s*linear\s*infinite\s*!important/);
  assert.match(css, /@keyframes cr-account-submit-spin\s*\{\s*0%\s*\{\s*transform:\s*rotate\(0deg\)/);
  assert.match(css, /100%\s*\{\s*transform:\s*rotate\(360deg\)/);
  assert.match(css, /button\.cr-account-submit--loading\s*\{[\s\S]*?background:\s*#e1e5e1\s*!important/);
  assert.doesNotMatch(css, /\.cr-account-submit--loading::(?:before|after)/);
});


test('ACCOUNT_SUBMIT_LOADING_BACKGROUND_CONTRAST_OVERRIDES_ENDPOINT_RULES_WITHOUT_CHANGING_SPINNER_OR_JS', () => {
  const addressNormal = css.match(/body\.woocommerce-account\.woocommerce-edit-address \.woocommerce-address-fields button\[type="submit"\]\s*\{([^}]+)\}/);
  assert.ok(addressNormal, 'Address normal button background rule exists');
  assert.match(addressNormal[1], /background:\s*#183b35\s*!important/);
  const addressLoading = css.match(/body\.woocommerce-account\.woocommerce-edit-address \.woocommerce-address-fields button\[type="submit"\]\.cr-account-submit--loading\s*\{([^}]+)\}/);
  assert.ok(addressLoading, 'Address loading override has sufficient selector specificity');
  assert.match(addressLoading[1], /background:\s*#e1e5e1\s*!important/);
  assert.match(css, /body\.woocommerce-account button\.cr-account-submit--loading\s*\{[^}]*background:\s*#e1e5e1\s*!important/);
  assert.match(css, /body\.woocommerce-account button\.cr-account-submit--loading \.cr-account-submit__spinner\s*\{[^}]*border-top-color:\s*#183b35\s*!important/);
  assert.match(js, /createElement\('span'\)/);
  assert.match(js, /spinner\.className = 'cr-account-submit__spinner'/);
  assert.match(js, /form\.addEventListener\(\s*'submit'/);
  assert.match(css, /body\.woocommerce-account\.cr-account-profile-view-personal \.woocommerce-EditAccountForm button\[type="submit"\]\.cr-account-submit--loading,\s*body\.woocommerce-account\.cr-account-profile-view-password \.woocommerce-EditAccountForm button\[type="submit"\]\.cr-account-submit--loading\s*\{[^}]*background:\s*#e1e5e1\s*!important/);

});

// Keep the loading-contrast contract on the staging deploy validation path.


test('ADDRESS_RENDER_HOOK_PROVIDES_SHIPPING_TYPE_WITHOUT_REDETECTION', () => {
  const start = php.indexOf('function cr2026_account_address_save_form_feedback');
  const end = php.indexOf("\nadd_action( 'woocommerce_after_edit_address_form_shipping'", start);
  const renderer = php.slice(start, end);
  assert.match(php, /add_action\(\s*'woocommerce_after_edit_address_form_shipping',\s*'cr2026_account_address_save_form_feedback'/);
  assert.doesNotMatch(renderer, /get_query_var|\$_SERVER\['REQUEST_URI'\]|preg_match|address_type/);
  assert.match(renderer, /cr2026_account_mobile_save_context\(\s*'edit-address'\s*\)/);
  assert.match(renderer, /cr2026_account_render_save_feedback\(\s*'address'\s*\)/);
});


test('PASSWORD_SUCCESS_FEEDBACK_USES_NATIVE_FIELD_PRESENCE_AND_WOOCOMMERCE_VALIDATION', () => {
  assert.match(php, /add_action\(\s*'woocommerce_save_account_details',\s*'cr2026_account_store_profile_save_feedback'/);
  assert.doesNotMatch(php, /woocommerce_save_account_details_errors|cr2026_account_capture_password_before_save|password_before_save_hash|wp_check_password|cr2026_account_password_change_intent/);
  const store = extractPhpFunction('cr2026_account_store_profile_save_feedback');
  for (const field of ['password_current', 'password_1', 'password_2']) {
    assert.match(store, new RegExp("isset\\( \\$_POST\\['" + field + "'\\] \\)"));
    assert.match(store, new RegExp("is_string\\( \\$_POST\\['" + field + "'\\] \\)"));
    assert.match(store, new RegExp("'' !== \\$_POST\\['" + field + "'\\]"));
  }
  assert.match(store, /wc_notice_count\( 'error' \) === 0/);
  assert.match(store, /cr2026_account_store_save_feedback\( 'password' \)/);
  const zeroErrorGuard = store.indexOf("wc_notice_count( 'error' ) === 0");
  const passwordSuccessMarker = store.indexOf("cr2026_account_store_save_feedback( 'password' )");
  assert.ok(zeroErrorGuard !== -1 && passwordSuccessMarker !== -1 && zeroErrorGuard < passwordSuccessMarker, 'zero WooCommerce errors are required before password success feedback');
  assert.match(store, /delete_user_meta\( \(int\) \$user_id, '_cr2026_account_save_feedback' \)/);
  assert.match(store, /sanitize_key\( wp_unslash\( \$_POST\['cr2026_account_profile_view'\] \) \)/);
  for (const field of ['password_current', 'password_1', 'password_2']) {
    const postField = "\\$_POST['" + field + "']";
    assert.doesNotMatch(store, new RegExp("(?:sanitize_[a-z0-9_]+|wp_unslash)\\s*\\(\\s*" + postField), `password field ${field} is never manually sanitized or unslashed`);
    assert.doesNotMatch(store, new RegExp("(?:update_user_meta|add_user_meta|wp_update_user|set_user_meta|\\$wpdb->\\w+)\\s*\\([^;]*" + postField, 's'), `password field ${field} is never manually persisted`);
  }
});

test('EMPTY_REAL_AND_INVALID_PASSWORD_SUBMITS_GATE_ONLY_THE_ONE_SHOT_FEEDBACK', () => {
  const extractFunction = (name) => {
    const start = php.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} exists`);
    const open = php.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < php.length; i += 1) {
      if (php[i] === '{') depth += 1;
      if (php[i] === '}') {
        depth -= 1;
        if (depth === 0) return php.slice(start, i + 1);
      }
    }
    throw new Error(`Unclosed function ${name}`);
  };
  const storeFeedback = extractFunction('cr2026_account_store_save_feedback');
  const handler = extractFunction('cr2026_account_store_profile_save_feedback').replace(/\bexit\s*;/, 'return;');
  const harness = `$GLOBALS['uid'] = 41;
$GLOBALS['meta'] = [];
$GLOBALS['errors'] = 0;
function cr2026_account_mobile_save_context($endpoint) { return 'edit-account' === $endpoint; }
function sanitize_key($value) { return preg_replace('/[^a-z0-9_\\-]/', '', strtolower((string) $value)); }
function wp_unslash($value) { return $value; }
function wc_notice_count($type) { return $GLOBALS['errors']; }
function wc_get_notices($type) { return $GLOBALS['errors'] ? array('error') : array(); }
function get_current_user_id() { return $GLOBALS['uid']; }
function get_user_meta($id, $key, $single = false) { return $GLOBALS['meta'][$id][$key] ?? ''; }
function update_user_meta($id, $key, $value) { $GLOBALS['meta'][$id][$key] = $value; return true; }
function delete_user_meta($id, $key) { unset($GLOBALS['meta'][$id][$key]); return true; }
function wc_get_endpoint_url(...$args) { return '/mi-cuenta/edit-account/'; }
function wc_get_page_permalink($page) { return '/mi-cuenta/'; }
function add_query_arg($key, $value, $url) { return $url . '?profile_view=' . $value; }
function wp_safe_redirect($url) {}
${storeFeedback}
${handler}
function run_case($post, $errors) {
  $GLOBALS['meta'][41]['_cr2026_account_save_feedback'] = 'password';
  $_POST = $post;
  $GLOBALS['errors'] = $errors;
  cr2026_account_store_profile_save_feedback(41);
  return $GLOBALS['meta'][41]['_cr2026_account_save_feedback'] ?? null;
}
$empty = run_case(array('cr2026_account_profile_view'=>'password','password_current'=>'','password_1'=>'','password_2'=>''), 0);
$real = run_case(array('cr2026_account_profile_view'=>'password','password_current'=>'opaque-current','password_1'=>'opaque-new','password_2'=>'opaque-new'), 0);
$invalid = run_case(array('cr2026_account_profile_view'=>'password','password_current'=>'opaque-current','password_1'=>'opaque-new','password_2'=>'opaque-new'), 1);
$partial = run_case(array('cr2026_account_profile_view'=>'password','password_current'=>'opaque-current','password_1'=>'opaque-new','password_2'=>''), 0);
echo json_encode(compact('empty','real','invalid','partial'));
`;
  const { execFileSync } = require('node:child_process');
  const result = JSON.parse(execFileSync('php', ['-r', harness], { encoding: 'utf8' }));
  assert.equal(result.empty, null, 'empty password fields create no success marker');
  assert.equal(result.real, 'password', 'native save action with all fields and zero WooCommerce errors creates one-shot success');
  assert.equal(result.invalid, null, 'WooCommerce validation errors create no success marker');
  assert.equal(result.partial, null, 'missing native password field creates no success marker');
});

test('PASSWORD_LABELS_ARE_SHORT_AND_FIELDS_TRANSPARENT_WITHOUT_GEOMETRY_OVERRIDES', () => {
  assert.match(php, /'Current password \(leave blank to leave unchanged\)'\s*=>\s*'Contraseña actual'/);
  assert.match(php, /'New password \(leave blank to leave unchanged\)'\s*=>\s*'Nueva contraseña'/);
  assert.match(php, /'Confirm new password'\s*=>\s*'Confirmar nueva contraseña'/);
  const controlBox = controlsCss.match(/\.cr-control__box\s*\{([^}]*)\}/);
  assert.ok(controlBox, 'canonical control box rule exists');
  assert.match(controlBox[1], /background\s*:\s*var\(--cr-control-background\)/i, 'control box consumes the canonical background token');
  assert.match(controlsCss, /:root\s*\{[^}]*--cr-control-background:\s*#fff/s, 'canonical control background token resolves to white');
  assert.match(controlsCss, /\.cr-control__label\s*\{[^}]*background:\s*var\(--cr-app-canvas(?:,\s*#FCFAF7)?\)/s, 'label uses the page canvas to cut the border');
  const passwordFieldRules = [...css.matchAll(/([^{}]*?(?:#password_current|#password_1|#password_2)[^{}]*)\{([^}]*)\}/g)];
  assert.ok(passwordFieldRules.length > 0, 'password field-specific rules exist');
  for (const rule of passwordFieldRules) {
    assert.doesNotMatch(rule[2], /(?:^|;)\s*(?:height|min-height|max-height|border(?:-width|-style|-color|-radius)?)\s*:/i, 'Password fields must not introduce their own height or border geometry');
    assert.match(rule[2], /background(?:-color)?\s*:\s*transparent/i, 'password inputs retain a transparent surface inside the white canonical control box');
  }
  assert.match(css, /\.cr-account-submit__spinner/);
  assert.match(js, /cr-account-submit--loading/);
});

 
test('PASSWORD_CLIENT_VALIDATION_BLOCKS_EMPTY_PARTIAL_AND_MISMATCH_BEFORE_LOADING', () => {
  const validationStart = js.indexOf('const current = form.querySelector');
  const validationEnd = js.indexOf('// Intercept once, activate loading', validationStart);
  const passwordSubmit = js.slice(validationStart, validationEnd);
  assert.ok(validationStart !== -1 && validationEnd > validationStart);
  for (const field of ['password_current', 'password_1', 'password_2']) {
    assert.ok(passwordSubmit.includes('input[name="' + field + '"]'), field + ' is checked client-side');
  }
  assert.ok(passwordSubmit.includes('current.value.length > 0'));
  assert.ok(passwordSubmit.includes('newPassword.value.length > 0'));
  assert.ok(passwordSubmit.includes('confirmation.value.length > 0'));
  assert.ok(passwordSubmit.includes('Por favor, rellena todos los campos de contraseña.'));
  assert.ok(passwordSubmit.includes('newPassword.value !== confirmation.value'));
  assert.ok(passwordSubmit.includes('Las nuevas contraseñas no coinciden.'));
  assert.ok(passwordSubmit.includes('showPasswordError(form, button,'));
  assert.ok(passwordSubmit.includes('return;'));
  assert.ok(!passwordSubmit.includes('cr-account-form--loading'));
  assert.ok(!passwordSubmit.includes('cr-account-submit--loading'));
  assert.ok(!passwordSubmit.includes('requestSubmit'));
  assert.ok(js.indexOf('showPasswordError(form, button') < js.indexOf("form.classList.add('cr-account-form--loading')"), 'invalid password submissions exit before loading begins');
});

test('PASSWORD_ERRORS_USE_ONE_FLEX_ALERT_LAYOUT_WITH_ICON_IN_FLOW', () => {
  const ruleBody = (selector) => {
    const index = css.indexOf(selector);
    assert.notEqual(index, -1, 'CSS selector exists: ' + selector);
    const open = css.indexOf('{', index);
    const close = css.indexOf('}', open);
    assert.ok(open !== -1 && close > open, 'CSS rule is complete: ' + selector);
    return css.slice(open + 1, close);
  };
  assert.ok(js.includes('cr-password-inline-error__icon'));
  assert.ok(js.includes('cr-password-inline-error__text'));
  assert.ok(js.includes("notice.setAttribute('role', 'alert')"));
  const custom = ruleBody('.cr-password-inline-error {');
  assert.ok(custom.includes('display: flex !important'));
  assert.ok(custom.includes('align-items: flex-start !important'));
  assert.ok(custom.includes('gap: 9px !important'));
  const icon = ruleBody('.cr-password-inline-error__icon {');
  assert.ok(icon.includes('flex: 0 0 18px !important'));
  const text = ruleBody('.cr-password-inline-error__text {');
  assert.ok(text.includes('flex: 1 1 auto !important'));
  const passwordNoticeSelector = 'body.woocommerce-account.cr-account-profile-view-password .woocommerce-EditAccountForm .woocommerce-error.cr-account-save-feedback--error';
  const passwordIconSelector = passwordNoticeSelector + '::before';
  const wooNotice = ruleBody(passwordNoticeSelector + ' {');
  assert.ok(wooNotice.includes('display: flex !important'));
  assert.ok(wooNotice.includes('align-items: flex-start !important'));
  assert.ok(wooNotice.includes('gap: 9px !important'));
  assert.ok(wooNotice.includes('position: static !important'));
  assert.ok(wooNotice.includes('border: 1px solid #efc5c1 !important'));
  assert.ok(wooNotice.includes('background: #fdf0ef !important'));
  const wooIcon = ruleBody(passwordIconSelector + ' {');
  assert.ok(wooIcon.includes('display: inline-flex !important'));
  assert.ok(wooIcon.includes('position: static !important'));
});

test('PASSWORD_FIELDS_TRANSPARENT_HINT_NEUTRAL_AND_STRENGTH_METER_LOGIC_UNCHANGED', () => {
  const whiteFields = css.slice(css.indexOf('#password_current,'), css.indexOf('/* Unified password notices'));
  for (const id of ['#password_current', '#password_1', '#password_2']) {
    assert.ok(whiteFields.includes(id), id + ' has a dedicated white background rule');
  }
  assert.ok(whiteFields.includes('background: transparent !important'));
  assert.ok(whiteFields.includes('background-color: transparent !important'));
  assert.ok(whiteFields.includes('background-image: none !important'));
  assert.ok(js.includes('Usa una contraseña segura combinando letras, números y símbolos.'));
  assert.ok(js.includes('.woocommerce-password-hint'));
  const ruleBody = (selector) => {
    const index = css.indexOf(selector);
    assert.notEqual(index, -1, 'CSS selector exists: ' + selector);
    const open = css.indexOf('{', index);
    const close = css.indexOf('}', open);
    return css.slice(open + 1, close);
  };
  assert.ok(ruleBody('.woocommerce-password-strength {').includes('display: inline-flex !important'));
  for (const state of ['.short', '.bad', '.good', '.strong']) {
    assert.ok(css.includes('.woocommerce-password-strength' + state), 'native meter state remains styled: ' + state);
  }
  assert.ok(!js.includes('current.value ='));
  assert.ok(!js.includes('newPassword.value ='));
  assert.ok(!js.includes('confirmation.value ='));
  assert.ok(!js.includes('localStorage'));
  assert.ok(!js.includes('console.log'));
  assert.ok(!php.includes('wp_check_password'));
  assert.ok(!php.includes('cr2026_account_capture_password_before_save'));
  assert.ok(!php.includes('password_before_save_hash'));
  assert.ok(!php.includes('woocommerce_save_account_details_errors'));
});


test('DELETE_ACCOUNT_NATIVE_REACT_FORM_IS_DISCOVERED_AFTER_DOM_READY_AND_ADAPTED', () => {
  // Upstream plugin renders this structure inside its initially-empty div:
  // <form><div class="wpfda-password-confirm"><label>...</label>
  // <input type="password" name="wpfda-password"/></div>
  // <div class="wpfda-submit"><button type="submit">Confirm</button></div></form>
  const pluginMarkup = '<div class="wpfda-delete-account-container"><form><div class="wpfda-password-confirm"><label>Introduce la contraseña para confirmar:</label><input type="password" name="wpfda-password"></div><div class="wpfda-submit"><button type="submit">Confirm</button></div></form></div>';
  assert.match(pluginMarkup, /class="wpfda-delete-account-container"[^>]*>\s*<form>/, 'plugin form nested in container');
  assert.match(pluginMarkup, /class="wpfda-password-confirm"[^>]*>\s*<label>[\s\S]*?<input type="password" name="wpfda-password"/, 'label is sibling of named password input');
  assert.match(pluginMarkup, /class="wpfda-submit"[^>]*>\s*<button type="submit">Confirm<\/button>/, 'Confirm is native submit button');

  assert.match(php, /wc_get_account_endpoint_url\(\s*'wpf-delete-account'\s*\)/);
  assert.match(php, /add_action\(\s*'woocommerce_account_wpf-delete-account_endpoint',\s*'cr2026_account_delete_endpoint_toolbar',\s*1\s*\)/);
  assert.match(js, /body\.woocommerce-account \.wpfda-delete-account-container form/, 'form selector matches plugin nesting');
  assert.match(js, /form\.querySelector\('input\[name="wpfda-password"\]\[type="password"\]'\)/, 'password selector matches actual plugin input');
  assert.match(js, /form\.querySelector\('button\[type="submit"\]'\)/, 'submit selector matches Confirm button');
  assert.match(js, /form\.querySelector\('\.wpfda-password-confirm label'\)/, 'label selector matches sibling label');

  assert.match(js, /const initForms = \(\) =>/);
  assert.match(js, /initForms\(\);/);
  assert.match(js, /new MutationObserver\(\(\) => \{[\s\S]*?initForms\(\);[\s\S]*?observer\.disconnect\(\);/, 'late React insertion invokes init');
  assert.match(js, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(js, /form\.dataset\.crAccountSaveFeedbackInitialized === '1'/, 'initialization is idempotent');

  assert.ok(js.includes("textContent = 'Eliminar cuenta'"));
  assert.ok(js.includes('cr-account-delete-password-toggle'));
  assert.ok(js.includes('Esta acción es permanente y no se puede deshacer.'));
  assert.ok(js.includes('Introduce tu contraseña para confirmar la eliminación de tu cuenta.'));
  assert.ok(js.includes('cr-account-submit__spinner'));
  assert.ok(js.includes("form.classList.add('cr-account-form--loading')"));
  assert.match(css, /\.wpfda-delete-account-container\s*\{[^}]*background:\s*transparent!important/i);
  assert.match(css, /\.wpfda-delete-account-container\s*\{[^}]*border:\s*0!important/i);
  assert.match(css, /\.wpfda-delete-account-container\s*\{[^}]*box-shadow:\s*none!important/i);
  assert.match(css, /\.wpfda-delete-account-container :is\(form,fieldset\)\s*\{[^}]*background:\s*transparent!important/i);
  assert.doesNotMatch(php, /function\s+cr2026_account_render_delete_account_form\s*\(/);
  assert.ok(js.includes('form.requestSubmit(button)'), 'native submit continues through original plugin handler');
});


test('ACCOUNT_SUBVIEW_TOOLBARS_AND_FORMS_INHERIT_FULL_WIDTH_SHELL_WITHOUT_EXTRA_GUTTERS', () => {
  const mobileShell = css.slice(css.indexOf('/* Account app shell: reuse the canonical app canvas and shared mobile rail. */'), css.indexOf('/* Native WooCommerce orders, presented as app-skin cards. */'));
  assert.match(mobileShell, /body\.woocommerce-account \.woocommerce-MyAccount-content\s*\{[^}]*width:\s*100%\s*!important;[^}]*max-width:\s*none\s*!important;[^}]*margin:\s*0\s*!important;[^}]*padding:\s*0\s*!important/s);
  assert.match(mobileShell, /body\.woocommerce-account :is\(\.woocommerce-EditAccountForm, \.woocommerce-address-fields, \.woocommerce-Addresses\)\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;[^}]*margin-inline:\s*0;/s);
  assert.doesNotMatch(mobileShell, /(?:width:\s*calc\(100%\s*-\s*40px\)|margin-inline:\s*auto|padding-inline:\s*20px)/i, 'ACCOUNT_EXTRA_OUTER_GUTTERS=0');
  assert.match(mobileShell, /body\.woocommerce-account:has\(\.cr-account-home\) \.woocommerce-MyAccount-content\s*\{[^}]*width:\s*100%\s*!important;/s);
  assert.doesNotMatch(mobileShell, /cr-account-profile-view-delete[^}]*?(?:margin-left|translate|left|padding-left)\s*:/i);
});
