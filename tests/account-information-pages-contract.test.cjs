const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '../theme/crios-rango-2026');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const helpers = read('inc/helpers.php');
const presentation = read('inc/account-presentation.php');
const page = read('page.php');
const dashboard = read('woocommerce/myaccount/dashboard.php');
const accountCss = read('assets/css/account.css');
const mainCss = read('assets/css/main.css');
const mainJs = read('assets/js/main.js');
const footer = read('footer.php');

const slugs = [
  'cambios-y-devoluciones',
  'condiciones-generales-de-contratacion',
  'politica-de-privacidad',
  'aviso-legal',
  'politica-de-cookies',
];

test('INFORMATION_PAGES_COUNT_IS_FIVE_AND_MATCHES_ACCOUNT_DESTINATIONS', () => {
  assert.equal((dashboard.match(/'label' => __\( '(?:Cambios y devoluciones|Condiciones de contratación|Política de privacidad|Aviso legal|Política de cookies)'/g) || []).length, 5);
  for (const slug of slugs) {
    assert.ok(dashboard.includes("'slugs' => array( '" + slug + "' )"), 'Account links ' + slug);
    assert.ok(helpers.includes("'" + slug + "'"), 'mobile Account route ' + slug);
  }
  assert.match(presentation, /function cr2026_account_information_page_content\(/);
});

test('ALL_FIVE_PAGES_USE_ONE_WORDPRESS_CONTENT_RENDERER_AND_CANONICAL_TOOLBAR', () => {
  assert.match(page, /cr2026_is_account_information_page\(\)/);
  assert.match(page, /cr-information-toolbar-shell/);
  assert.match(helpers, /cr-account-information-page/);
  assert.equal(accountCss.includes('body.cr-account-information-page .cr-main'),false);
  assert.equal(accountCss.includes('body.cr-account-information-page .cr-parent-category__toolbar'),false);
  assert.match(page, /the_content\(\)/);
  assert.match(presentation, /function cr2026_account_information_page_content\( \$content \)/);
  assert.match(presentation, /get_the_title\( \$page \)/);
  assert.match(page, /cr2026_render_category_toolbar\( get_the_title\(\), \$account_back_url, 'parent', false \)/);
  assert.match(page, /wc_get_page_permalink\( 'myaccount' \)/);
  assert.match(presentation, /add_filter\( 'the_content', 'cr2026_account_information_page_content', 30 \)/);
  for (const className of ['cr-parent-category__toolbar','cr-parent-category__back','cr-parent-category__title']) {
    assert.ok(mainCss.includes('.' + className), 'canonical toolbar class ' + className);
  }
});

test('WORDPRESS_CONTENT_IS_PRESERVED_AND_LEGAL_COPY_IS_NOT_HARDCODED', () => {
  assert.match(page, /the_content\(\)/);
  assert.match(presentation, /return '<section class="cr-account-content cr-account-information"/);
  assert.match(presentation, /<div class="cr-account-information__content">' \. \$content/);
  assert.match(presentation, /get_the_title\( \$page \)/);
  assert.doesNotMatch(presentation, /De conformidad con|Responsable del tratamiento|Condiciones generales de venta/);
});

test('UNREGISTERED_WPBAKERY_SHORTCODES_ARE_SAFELY_UNWRAPPED_NOT_PRINTED', () => {
  assert.match(presentation, /shortcode_exists\( strtolower\( \$matches\[2\] \) \)/);
  assert.match(presentation, /cr2026_account_information_vc_fallback/);
  assert.match(presentation, /add_filter\( 'the_content', 'cr2026_account_information_vc_fallback', 12 \)/);
  assert.match(presentation, /shortcode_exists\( strtolower\( \$matches\[2\] \) \) \? \$matches\[0\] : ''/);
  assert.match(presentation, /vc_custom_heading/);
  assert.match(presentation, /vc_single_image/);
  assert.doesNotMatch(presentation, /str_replace\([^\n]*vc_/);
});

test('COMMON_EDITORIAL_RAIL_NORMALIZES_CONTENT_WITHOUT_TOUCHING_GLOBAL_NAV_CLEARANCE', () => {
  assert.match(presentation, /cr-account-information-page/);
  assert.match(helpers, /cr-account-content-page/);
  assert.match(page, /cr2026_is_account_information_page\(\)/);
  assert.match(helpers, /cr2026_is_account_information_page\(\)/);
  assert.match(accountCss, /\.cr-account-content,\s*body\.woocommerce-account\.cr-account-loyalty-reward \.cr-account-loyalty\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;[^}]*margin-inline:\s*0;/s);
  assert.doesNotMatch(accountCss, /body\.cr-account-content-page[^{}]*\.cr-parent-category__toolbar/);
  for (const selector of ['h1','h2','h3','h4','h5','h6','p','ul','ol','li','strong','a','blockquote','table','th','td']) {
    assert.ok(accountCss.includes('.cr-account-information__content ' + selector), 'editorial style ' + selector);
  }
  assert.match(presentation, /function cr2026_account_information_remove_duplicate_title\( \$content, \$page_title \)/);
  assert.match(presentation, /cr2026_account_information_remove_duplicate_title\( \$content, \$title \)/);
  assert.match(presentation, /preg_match\( '\/<\(h\[1-6\]\|p\|strong\)/);
  assert.ok(accountCss.includes('.cr-account-information__content h1,'));
  assert.ok(accountCss.includes('font: 400 18px/25px "Roboto", Arial, sans-serif;'));
  assert.ok(accountCss.includes('font: 300 13px/21px "Roboto", Arial, sans-serif !important;'));
  assert.match(helpers, /function cr2026_is_account_context\(\)[\s\S]*?cr2026_is_account_information_page\(\)/);
  assert.match(helpers, /function cr2026_is_app_nav_shell\(\)[\s\S]*?cr2026_is_account_information_page\(\)/);
  assert.doesNotMatch(accountCss.slice(accountCss.indexOf('/* Canonical Account content rail shared by Help, Loyalty, Orders, Profile and Information. */')), /padding-bottom|100vh|height:\s*100vh/);
});

test('ONE_CANONICAL_ACCOUNT_CONTENT_RAIL_IS_REUSED_BY_HELP_LOYALTY_ORDERS_PROFILE_AND_INFORMATION', () => {
  assert.match(presentation, /<section class="cr-account-content cr-account-help"/);
  assert.match(presentation, /<section class="cr-account-content cr-account-profile-home"/);
  assert.match(presentation, /<section class="cr-account-content cr-account-information"/);
  const orders = read('woocommerce/myaccount/orders.php');
  assert.match(orders, /class="cr-account-orders__filters cr-account-content"/);
  assert.match(orders, /class="cr-account-orders__list cr-account-content"/);
  assert.match(accountCss, /\.cr-account-content,\s*body\.woocommerce-account\.cr-account-loyalty-reward \.cr-account-loyalty\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;[^}]*margin-inline:\s*0;/s);
  assert.equal((accountCss.match(/\.cr-account-content,/g) || []).length, 1, 'one canonical content rail rule');
});

test('LOGIN_USES_CANONICAL_SHELL=YES; LOGIN_EXTRA_OUTER_GUTTERS=0; LOGIN_LEGACY_WOO_VISUAL_CARD=0',()=>{
  const page = read('page.php');
  assert.match(page, /\$is_mobile_account && function_exists\( 'is_account_page' \) && is_account_page\(\) && ! is_user_logged_in\(\)[\s\S]*?cr2026_render_category_toolbar\( __\( 'Acceder'/,'logged-out toolbar is rendered by the page shell before WooCommerce content');
  assert.doesNotMatch(presentation, /woocommerce_before_customer_login_form/,'toolbar is not nested in WooCommerce login markup');
  assert.match(accountCss,/body\.woocommerce-account:not\(\.logged-in\) \.cr-page,[\s\S]*?body\.woocommerce-account:not\(\.logged-in\) \.u-column1\s*\{[^}]*width:100%!important;[^}]*max-width:none!important;[^}]*margin-inline:0!important;[^}]*padding-inline:0!important;/s,'logged-out outer wrappers inherit the shell without an additional rail');
  assert.match(accountCss,/body\.woocommerce-account:not\(\.logged-in\) \.woocommerce-form-login\.login\s*\{[^}]*padding:0!important;[^}]*border:0!important;[^}]*border-radius:0!important;[^}]*background:transparent!important;[^}]*box-shadow:none!important;/s,'legacy login visual card is removed');
  assert.match(accountCss,/body\.woocommerce-account:not\(\.logged-in\) \.woocommerce-form-login\.login \.woocommerce-form-login__submit\s*\{[^}]*width:100%!important;[^}]*border-radius:999px!important;[^}]*background:#183b35!important;/s,'canonical full-width green pill CTA is reused');
  assert.match(accountCss,/body\.woocommerce-account:not\(\.logged-in\) \.woocommerce-form-login\.login input\.input-text\s*\{[^}]*width:100%;[^}]*border:1px solid #d8d9d5;[^}]*border-radius:9px;/s,'login fields use Account field contract styles');
  assert.match(accountCss,/woocommerce-form-login__rememberme/,'Remember me remains styled but functional');
  assert.match(accountCss,/lost_password a/,'lost password destination remains styled and functional');
});

test('LOGOUT_LOADING_STATE=YES; LOGOUT_DOUBLE_CLICK_PROTECTED=YES; LOGOUT_NATIVE_URL_PRESERVED=YES',()=>{
  assert.match(presentation,/class="cr-account-profile-home__action cr-account-profile-home__action--logout" href="<\?php echo esc_url\( wc_logout_url\(\) \); \?>"/,'native Woo logout URL remains the link destination');
  assert.match(mainJs,/\.cr-account-profile-home__action--logout/,'logout loading behavior is restricted to the native Account logout link');
  assert.match(mainJs,/link\.dataset\.crLogoutLoading === 'true'[\s\S]*?event\.preventDefault\(\)/,'second logout click is prevented');
  assert.match(mainJs,/label\.textContent = 'Cerrando sesión…'/,'logout loading copy is shown');
  assert.match(mainJs,/link\.setAttribute\('aria-busy', 'true'\)[\s\S]*?link\.setAttribute\('aria-disabled', 'true'\)/,'logout announces and locks its loading state');
  assert.match(mainJs,/window\.addEventListener\('pageshow', resetLogoutStates\)/,'logout state resets after BFCache restore');
  assert.match(accountCss,/\.cr-account-profile-home__action--logout\.is-loading[\s\S]*?\.cr-account-logout-spinner[\s\S]*?animation:cr-shell-action-spin/s,'logout uses existing Account spinner animation utility');
});
