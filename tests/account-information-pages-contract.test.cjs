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
  assert.match(presentation, /return '<section class="cr-account-information"/);
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
  assert.match(footer, /! \$is_mobile_account_context/);
  assert.match(helpers, /cr2026_is_account_information_page\(\)/);
  assert.match(accountCss, /\.cr-account-information \{[\s\S]*?width: min\(calc\(100% - 40px\), 720px\)/);
  assert.match(accountCss, /body\.cr-account-content-page \.cr-parent-category__toolbar \{ margin-bottom: 16px; \}/);
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
  assert.match(mainCss, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\{display:block;position:fixed/);
  assert.doesNotMatch(accountCss.slice(accountCss.indexOf('/* WordPress Account content pages')), /padding-bottom|100vh|height:\s*100vh/);
  assert.match(footer, /cr-mobile-bottom-nav cr-app-bottom-nav/);
});
