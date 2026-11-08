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
  for (const forbidden of ['#payment', '#order_review', 'payment_method_', 'shipping_method', 'place_order', 'checkout_coupon', 'woocommerce-checkout-review-order-table']) {
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

const woocommercePhp = fs.readFileSync(path.join(theme, 'inc/woocommerce.php'), 'utf8');

test('delivery filter is guarded and restricted to the nine approved native billing keys', () => {
  assert.match(woocommercePhp, /function cr2026_checkout_delivery_fields\( \$fields \)/);
  assert.match(woocommercePhp, /if \( ! is_array\( \$fields \) \|\| ! isset\( \$fields\['billing'\] \) \|\| ! is_array\( \$fields\['billing'\] \) \)/);
  const fn = woocommercePhp.slice(woocommercePhp.indexOf('function cr2026_checkout_delivery_fields('), woocommercePhp.indexOf("add_filter( 'woocommerce_checkout_fields'"));
  assert.match(fn, /if \( ! isset\( \$fields\['billing'\]\[ \$key \] \) \|\| ! is_array\( \$fields\['billing'\]\[ \$key \] \) \)/);
  const allowlist = [...fn.matchAll(/^\s*'(billing_[a-z0-9_]+)'\s*=>/gm)].map(match => match[1]);
  assert.deepEqual(allowlist, [
    'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
    'billing_address_1', 'billing_state', 'billing_city', 'billing_postcode', 'billing_country'
  ]);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_checkout_fields', 'cr2026_checkout_delivery_fields', 20 \)/);
});

test('delivery filter changes only label, priority and wrapper classes', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_checkout_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  for (const property of ['label', 'priority', 'class']) assert.match(fn, new RegExp("\\['" + property + "'\\]"));
  for (const forbidden of ['required', 'validate', 'autocomplete', 'options', 'default', 'custom_attributes', "['type']", "['name']", "['id']"]) {
    assert.equal(fn.includes(forbidden), false, 'must not modify ' + forbidden);
  }
  assert.match(fn, /return \$fields;/);
});

test('unknown billing fields and address line 2 are not named or removed by the delivery filter', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_checkout_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  assert.doesNotMatch(fn, /unset\s*\(/);
  assert.doesNotMatch(fn, /billing_address_2|shipping_/);
  assert.match(fn, /foreach \( \$delivery_fields as \$key => \$presentation \)/);
  assert.match(fn, /if \( ! isset\( \$fields\['billing'\]\[ \$key \] \)/);
});

test('delivery field order and Spanish labels are declared in the approved priority map', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_checkout_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  const keys = [...fn.matchAll(/^\s*'(billing_[a-z0-9_]+)'\s*=>/gm)].map(match => match[1]);
  assert.deepEqual(keys, [
    'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
    'billing_address_1', 'billing_state', 'billing_city', 'billing_postcode', 'billing_country'
  ]);
  for (const label of ['Nombre', 'Apellidos', 'Email', 'Teléfono', 'Dirección', 'Provincia', 'Localidad', 'Código postal', 'País']) {
    assert.ok(fn.includes("__('" + label) || fn.includes("__( '" + label), 'missing label ' + label);
  }
  assert.match(fn, /'priority' => 10/);
  assert.match(fn, /'priority' => 90/);
});

test('delivery section heading is appended through the native billing hook', () => {
  assert.match(woocommercePhp, /function cr2026_checkout_render_delivery_heading\( \$checkout \)/);
  assert.match(woocommercePhp, /woocommerce_before_checkout_billing_form', 'cr2026_checkout_render_delivery_heading', 5, 1/);
  assert.match(woocommercePhp, /cr-checkout-delivery-heading__step/);
  assert.match(woocommercePhp, /esc_html__\( 'Entrega'/);
  assert.match(checkoutCss, /\.woocommerce-billing-fields > h3\s*\{\s*display:\s*none;/);
});

test('delivery grid uses native wrapper classes and a narrow-screen single-column fallback', () => {
  assert.match(woocommercePhp, /'layout' => 'form-row-first'/);
  assert.match(woocommercePhp, /'layout' => 'form-row-last'/);
  assert.match(woocommercePhp, /'layout' => 'form-row-wide'/);
  assert.match(checkoutCss, /\.woocommerce-billing-fields__field-wrapper\s*\{[^}]*display:\s*grid/s);
  assert.match(checkoutCss, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(checkoutCss, /@media \(max-width:\s*360px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(checkoutCss, /^\s*order\s*:/m);
  assert.doesNotMatch(checkoutCss, /order\s*:/);
});

test('country and state remain native WooCommerce selects with Select2 presentation only', () => {
  assert.match(woocommercePhp, /billing_state/);
  assert.match(woocommercePhp, /billing_country/);
  assert.match(checkoutCss, /\.woocommerce-billing-fields__field-wrapper \.select2-container/);
  assert.match(checkoutCss, /\.select2-selection--single/);
  assert.match(checkoutCss, /\.select2-container--open\s*\{\s*z-index:/);
  assert.doesNotMatch(woocommercePhp, /select2|wp_dequeue_script|woocommerce_form_field/);
});

test('ship to different address native control remains present and receives superficial styling only', () => {
  assert.match(checkoutCss, /\.woocommerce-shipping-fields/);
  assert.match(checkoutCss, /\.woocommerce-form__label-for-checkbox/);
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_checkout_fields'", start);
  assert.doesNotMatch(woocommercePhp.slice(start, end), /ship_to_different_address|shipping_/);
});

test('delivery styling is scoped to checkout and excludes notes and transactional sections', () => {
  for (const selector of [
    'body.woocommerce-checkout:not(.woocommerce-order-received) .woocommerce-billing-fields__field-wrapper',
    'body.woocommerce-checkout:not(.woocommerce-order-received) .woocommerce-shipping-fields'
  ]) assert.ok(checkoutCss.includes(selector), 'missing scoped selector ' + selector);
  for (const forbidden of [
    '.woocommerce-additional-fields', 'order_review', '#payment', 'payment_method_',
    'shipping_method', 'checkout_coupon', 'place_order', 'wployalty', 'wc-ajax'
  ]) assert.equal(checkoutCss.includes(forbidden), false, forbidden + ' must remain outside delivery styling');
});

