'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, 'theme/crios-rango-2026', file), 'utf8');

test('authenticated and guest Account share the canonical two-column mobile grid', () => {
  const css = read('assets/css/account.css');
  const visual = read('assets/css/visual-system.css');
  assert.doesNotMatch(css, /body\.woocommerce-account\.logged-in \.cr-account-home__grid\s*\{\s*grid-template-columns:\s*repeat\(4/);
  assert.match(visual, /\.cr-account-home__grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /@media\s*\(min-width:\s*980px\)[\s\S]*?body\.woocommerce-account \.cr-account-home__grid\s*\{\s*grid-template-columns:\s*repeat\(4/);
});

test('Orders filter track is a single native horizontal swipe row on mobile', () => {
  const orders = read('woocommerce/myaccount/orders.php');
  const css = read('assets/css/account.css');
  assert.match(orders, /class="cr-account-orders__filters"/);
  assert.doesNotMatch(orders, /class="cr-account-orders__filters cr-account-content"/);
  assert.match(css, /body\.woocommerce-account \.cr-account-orders__filters\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto;/s);
  assert.match(css, /body\.woocommerce-account \.cr-account-orders__filter-scroll\s*\{\s*display:\s*none !important;/);
});

test('Login page uses the toolbar as its only visible page title', () => {
  const login = read('woocommerce/myaccount/form-login.php');
  assert.doesNotMatch(login, /<h2>\s*<\?php esc_html_e\( 'Login'/);
  assert.match(login, /class="woocommerce-form woocommerce-form-login login" method="post" aria-label=/);
  assert.match(login, /woocommerce_before_customer_login_form/);
  assert.match(login, /woocommerce_after_customer_login_form/);
  assert.match(login, /woocommerce-login-nonce/);
});

test('Downloads are absent from Account UI while WooCommerce endpoint remains redirect-compatible', () => {
  const account = read('inc/account-presentation.php');
  const downloads = read('woocommerce/myaccount/downloads.php');
  assert.doesNotMatch(account, /\$downloads_url|>Descargas</);
  assert.match(account, /woocommerce_account_menu_items/);
  assert.match(account, /is_wc_endpoint_url\( 'downloads' \)/);
  assert.match(account, /wp_safe_redirect\( wc_get_page_permalink\( 'myaccount' \) \)/);
  assert.doesNotMatch(account, /woocommerce_account_downloads_endpoint/);
  assert.doesNotMatch(downloads, /<section|<article|Descargas|download_url/);
});

test('Account address overview uses shipping as the canonical Account presentation', () => {
  const address = read('woocommerce/myaccount/my-address.php');
  assert.match(address, /wc_get_account_formatted_address\( 'shipping', \$customer_id \)/);
  assert.match(address, /wc_get_endpoint_url\( 'edit-address', 'envio'/);
  assert.doesNotMatch(address, /billing|woocommerce_my_account_get_addresses/);
});

test('mobile page top gap has one canonical zero token; desktop toolbar separation stays scoped', () => {
  const visual = read('assets/css/visual-system.css');
  assert.match(visual, /@media\s*\(max-width:\s*767px\)[\s\S]*?--cr-page-top-gap:\s*0px/);
  assert.match(visual, /\.cr-page-shell\s*\{\s*padding-top:\s*var\(--cr-page-top-gap\)/);
  assert.match(visual, /\.cr-main--woocommerce:not\(\.cr-main--product-detail\)\s*\{\s*padding-top:\s*var\(--cr-page-top-gap\)/);
  assert.match(visual, /@media\s*\(min-width:\s*1280px\)[\s\S]*?\.cr-page-toolbar\s*\{\s*margin:\s*30px 0 18px;/);
});
