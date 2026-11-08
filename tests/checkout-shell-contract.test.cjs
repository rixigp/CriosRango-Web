const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const helpers = fs.readFileSync(path.join(theme, 'inc/helpers.php'), 'utf8');
const page = fs.readFileSync(path.join(theme, 'page.php'), 'utf8');
const footer = fs.readFileSync(path.join(theme, 'footer.php'), 'utf8');
const assets = fs.readFileSync(path.join(theme, 'inc/assets.php'), 'utf8');
const checkoutCss = fs.readFileSync(path.join(theme, 'assets/css/checkout.css'), 'utf8');
const mainCss = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');

test('classic checkout heading delegates to the existing shared toolbar component', () => {
  assert.match(helpers, /function cr2026_checkout_render_toolbar\(\)/);
  assert.match(helpers, /add_action\( 'woocommerce_before_checkout_form', 'cr2026_checkout_render_toolbar', 5 \)/);
  assert.match(helpers, /cr2026_render_category_toolbar\( __\( 'Finalizar compra'/);
  assert.match(helpers, /wc_get_cart_url\(\)/);
  assert.ok(helpers.includes("'parent', false );"));
  // The shared toolbar owns its own icon markup; checkout adds no parallel icon implementation.
});

test('native WordPress page H1 is omitted only on the checkout form page', () => {
  assert.match(page, /\$is_checkout_form = function_exists\( 'is_checkout' \) && is_checkout\(\)/);
  assert.match(page, /&& ! \$is_checkout_form/);
  assert.match(page, /the_content\(\)/);
});

test('informational footer is excluded on checkout form while shared navigation remains rendered', () => {
  assert.match(footer, /\$is_checkout_form = function_exists\( 'is_checkout' \) && is_checkout\(\)/);
  assert.match(footer, /&& ! \$is_checkout_form/);
  assert.match(footer, /class="cr-mobile-bottom-nav cr-app-bottom-nav"/);
  assert.match(footer, /if \( \$is_app_nav_shell \)/);
});

test('checkout stylesheet is enqueued only on checkout form, excluding order received', () => {
  assert.match(assets, /\$uses_checkout_shell = function_exists\( 'is_checkout' \) && is_checkout\(\)[\s\S]*?is_order_received_page\(\)/);
  assert.match(assets, /if \( \$uses_checkout_shell \) \{[\s\S]*?cr2026-checkout[\s\S]*?assets\/css\/checkout\.css/);
});

test('checkout shell uses the shared canvas token and existing toolbar geometry', () => {
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\)\s*\{[^}]*background:\s*var\(--cr-app-canvas\)/s);
  assert.match(checkoutCss, /\.cr-checkout-header-shell > \.cr-parent-category__toolbar/);
  assert.match(mainCss, /\.cr-parent-category__toolbar\s*\{\s*min-height:\s*64px;\s*margin:\s*0 20px 16px;/s);
  assert.match(checkoutCss, /margin: 0 20px 16px/);
  assert.match(checkoutCss, /margin: 0 20px 14px/);
  assert.match(checkoutCss, /margin: 0 32px 24px/);
  assert.match(checkoutCss, /--cr-app-topbar-height: 82px/);
  assert.match(checkoutCss, /--cr-app-topbar-height: 88px/);
});

test('checkout shell does not style or replace native transactional controls', () => {
  for (const forbidden of ['#payment', '#order_review', 'payment_method_', 'shipping_method', 'place_order', 'form-row', 'checkout_coupon', 'woocommerce-checkout-review-order-table']) {
    assert.equal(checkoutCss.includes(forbidden), false, forbidden + ' must remain outside Phase 1 CSS');
  }
  assert.match(checkoutCss, /\.cr-footer\s*\{\s*display:\s*none !important;/);
  assert.doesNotMatch(checkoutCss, /\.cr-mobile-bottom-nav|\.cr-app-bottom-nav/);
  assert.doesNotMatch(checkoutCss, /body\.woocommerce-cart/);
});


function cssRuleBody(css, selector) {
  const marker = selector + ' {';
  const start = css.indexOf(marker);
  assert.notEqual(start, -1, 'Missing CSS rule for ' + selector);
  const bodyStart = start + marker.length;
  const bodyEnd = css.indexOf('}', bodyStart);
  assert.notEqual(bodyEnd, -1, 'Unclosed CSS rule for ' + selector);
  return css.slice(bodyStart, bodyEnd);
}

test('checkout toolbar uses only the global header top reservation', () => {
  const globalHeader = cssRuleBody(mainCss, 'body.cr-global-app-header:not(.home)');
  assert.match(globalHeader, /padding-top:\s*var\(--cr-app-topbar-height\)/);

  const outletSelector = 'body.cr-parent-category-view .cr-parent-category__canvas,';
  const outletStart = mainCss.indexOf(outletSelector);
  assert.notEqual(outletStart, -1, 'Outlet/category reservation reset must remain present');
  const outletOpen = mainCss.indexOf('{', outletStart);
  const outletClose = mainCss.indexOf('}', outletOpen);
  assert.ok(outletOpen > outletStart && outletClose > outletOpen);
  assert.match(mainCss.slice(outletOpen + 1, outletClose), /padding-top:\s*0\s*!important/);

  const checkoutShell = cssRuleBody(
    checkoutCss,
    'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-main > .cr-shell.cr-page-shell'
  );
  assert.match(checkoutShell, /padding-block-start:\s*0\s*;/);
  assert.doesNotMatch(checkoutShell, /padding-block-start:\s*var\(--cr-app-topbar-height\)/);

  const checkoutTopReservations = [...checkoutCss.matchAll(/padding-block-start\s*:\s*([^;]+);/g)]
    .map(match => match[1].trim());
  assert.deepEqual(checkoutTopReservations, ['0'], 'Checkout must not add a second header-height reservation');
});

test('checkout toolbar horizontal geometry remains delegated to the shared toolbar styles', () => {
  const toolbarRule = cssRuleBody(
    checkoutCss,
    'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-header-shell > .cr-parent-category__toolbar'
  );
  assert.match(toolbarRule, /min-height:\s*64px/);
  assert.match(toolbarRule, /margin:\s*0 20px 16px/);
  assert.match(checkoutCss, /margin: 0 20px 14px/);
  assert.match(checkoutCss, /margin: 0 32px 24px/);
});
