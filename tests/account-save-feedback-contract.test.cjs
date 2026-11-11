const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const php = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/account-presentation.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/account.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/js/account-save-feedback.js'), 'utf8');
const assets = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/assets.php'), 'utf8');

test('ACCOUNT_SAVE_FEEDBACK_USES_ONE_SHARED_SESSION_AND_INLINE_COMPONENT', () => {
  assert.match(php, /function cr2026_account_store_save_feedback\(\s*\$feedback\s*\)/);
  assert.match(php, /function cr2026_account_take_save_feedback\(\s*\$expected\s*\)/);
  assert.match(php, /class="cr-account-save-feedback"/);
  assert.match(php, /'personal'\s*=>\s*__\(\s*'Datos actualizados'/);
  assert.match(php, /'address'\s*=>\s*__\(\s*'Dirección actualizada'/);
  assert.match(php, /'password'\s*=>\s*__\(\s*'Contraseña actualizada'/);
});

test('NATIVE_WOOCOMMERCE_SAVE_ACTIONS_REMAIN_THE_ONLY_PERSISTENCE_PATH', () => {
  assert.match(php, /add_action\(\s*'woocommerce_save_account_details',\s*'cr2026_account_store_profile_save_feedback'/);
  assert.match(php, /add_action\(\s*'woocommerce_customer_save_address',\s*'cr2026_account_store_address_save_feedback'/);
  assert.match(php, /wp_safe_redirect\( add_query_arg\( 'profile_view', \$view, \$url \) \)/);
  assert.match(php, /wp_safe_redirect\( \$url \)/);
  assert.doesNotMatch(php.slice(php.indexOf('Shared mobile Account save-feedback contract')), /update_user_meta\s*\(|wp_update_user\s*\(|\$wpdb->/);
});

test('ADDRESS_SUCCESS_RETURNS_TO_THE_SHIPPING_EDITOR', () => {
  assert.match(php, /wc_get_endpoint_url\(\s*'edit-address',\s*'shipping',\s*wc_get_page_permalink\(\s*'myaccount'\s*\)\s*\)/);
  assert.match(php, /'shipping' !== \$load_address/);
});

test('LEGACY_ADDRESS_SUCCESS_IS_SUPPRESSED_ONLY_ON_MOBILE_SHIPPING_SAVE', () => {
  assert.match(php, /add_filter\(\s*'woocommerce_add_success',\s*'cr2026_account_filter_legacy_save_success'/);
  const start = php.indexOf('function cr2026_account_filter_legacy_save_success');
  const end = php.indexOf("\\nadd_filter( 'woocommerce_add_success'", start);
  const filter = php.slice(start, end);
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
  const spinner = css.slice(css.indexOf('body.woocommerce-account button.cr-account-submit--loading .cr-account-submit__spinner'));
  assert.match(spinner, /display:\s*block\s*!important/);
  assert.match(spinner, /position:\s*absolute\s*!important/);
  assert.match(spinner, /top:\s*50%\s*!important/);
  assert.match(spinner, /left:\s*50%\s*!important/);
  assert.match(spinner, /width:\s*19px\s*!important/);
  assert.match(spinner, /height:\s*19px\s*!important/);
  assert.match(spinner, /transform:\s*translate\(-50%,\s*-50%\)\s*!important/);
  assert.match(spinner, /border-top-color:\s*#183b35\s*!important/);
  assert.match(spinner, /animation:\s*cr-account-submit-spin\s*\.7s\s*linear\s*infinite\s*!important/);
  assert.match(css, /@keyframes cr-account-submit-spin\s*\{\s*to\s*\{\s*transform:\s*translate\(-50%,\s*-50%\)\s*rotate\(360deg\)/);
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
});
