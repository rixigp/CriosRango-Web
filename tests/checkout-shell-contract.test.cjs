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
const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
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

test('checkout Phase 1 shell does not style or replace native transactional controls', () => {
  const phase1Css = checkoutCss.split('/* Checkout Phase 2.2:')[0];
  for (const forbidden of ['#payment', '#order_review', 'payment_method_', 'place_order', 'checkout_coupon', 'woocommerce-checkout-review-order-table']) {
    assert.equal(phase1Css.includes(forbidden), false, forbidden + ' must remain outside Phase 1 CSS');
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

function cssLastRuleBody(css, selector) {
  const marker = selector + ' {';
  const start = css.lastIndexOf(marker);
  assert.notEqual(start, -1, 'Missing final CSS rule for ' + selector);
  const bodyStart = start + marker.length;
  const bodyEnd = css.indexOf('}', bodyStart);
  assert.notEqual(bodyEnd, -1, 'Unclosed final CSS rule for ' + selector);
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
const templatePhp = fs.readFileSync(path.join(theme, 'woocommerce/checkout/review-order.php'), 'utf8');
const cartPhp = fs.readFileSync(path.join(theme, 'inc/cart.php'), 'utf8');
const helpersPhp = fs.readFileSync(path.join(theme, 'inc/helpers.php'), 'utf8');

test('billing-field filter runs after locale defaults and before WooCommerce priority sorting', () => {
  assert.match(woocommercePhp, /function cr2026_checkout_delivery_fields\( \$fields, \$country = '' \)/);
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  assert.match(fn, /if \( ! is_array\( \$fields \) \)/);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_billing_fields', 'cr2026_checkout_delivery_fields', 9999, 2 \)/);
  assert.deepEqual([...woocommercePhp.matchAll(/add_filter\( 'woocommerce_checkout_fields', '([^']+)'/g)].map(match => match[1]), ['cr2026_checkout_stabilize_phone_field_order']);
  assert.doesNotMatch(woocommercePhp, /add_filter\( 'woocommerce_default_address_fields'/);
  const allowlist = [...fn.matchAll(/^\s*'(billing_[a-z0-9_]+)'\s*=>/gm)].map(match => match[1]);
  assert.deepEqual(allowlist, [
    'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
    'billing_address_1', 'billing_state', 'billing_city', 'billing_postcode', 'billing_country'
  ]);
});

test('final checkout_fields filter reasserts phone position after later billing pipeline changes without altering field semantics', () => {
  assert.match(woocommercePhp, /function cr2026_checkout_stabilize_phone_field_order\( \$fields \)/);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_checkout_fields', 'cr2026_checkout_stabilize_phone_field_order', PHP_INT_MAX \)/);
  const start = woocommercePhp.indexOf('function cr2026_checkout_stabilize_phone_field_order(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_checkout_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  const expectedOrder = [
    'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
    'billing_address_1', 'billing_state', 'billing_city', 'billing_postcode', 'billing_country'
  ];
  const orderBlock = fn.match(/\$billing_order = array\(([\s\S]*?)\);/);
  assert.ok(orderBlock, 'final checkout filter must explicitly reconstruct the existing billing array');
  assert.deepEqual([...orderBlock[1].matchAll(/'([^']+)'/g)].map(match => match[1]), expectedOrder);
  assert.match(fn, /\$ordered_billing\[ \$key \] = \$fields\['billing'\]\[ \$key \];/);
  assert.match(fn, /\$fields\['billing'\] = \$ordered_billing;/);
  assert.match(fn, /'billing_phone'\s*=>\s*40/);
  for (const forbidden of ['type', 'required', 'validate', 'autocomplete', 'class', 'label', 'unset(']) {
    assert.equal(fn.includes(forbidden), false, 'must not alter ' + forbidden);
  }
  assert.match(fn, /return \$fields;/);
});

test('billing presentation filter changes only label, priority and wrapper classes', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  for (const property of ['label', 'priority', 'class']) assert.ok(fn.includes("['" + property + "']"));
  for (const forbidden of ['required', 'validate', 'autocomplete', 'options', 'default', 'custom_attributes', "['type']", "['name']", "['id']"]) {
    assert.equal(fn.includes(forbidden), false, 'must not modify ' + forbidden);
  }
  assert.match(fn, /return \$fields;/);
});

test('unknown billing fields remain untouched and address line 2 is not targeted', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  assert.doesNotMatch(fn, /unset\s*\(/);
  assert.doesNotMatch(fn, /billing_address_2|shipping_/);
  assert.match(fn, /foreach \( \$delivery_fields as \$key => \$presentation \)/);
  assert.match(fn, /if \( ! isset\( \$fields\[ \$key \] \) \|\| ! is_array\( \$fields\[ \$key \] \) \)/);
});

test('each known billing field has its exact deterministic priority and label', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  const expected = [
    ['billing_first_name', 10, 'Nombre'],
    ['billing_last_name', 20, 'Apellidos'],
    ['billing_email', 30, 'Email'],
    ['billing_phone', 40, 'Teléfono'],
    ['billing_address_1', 50, 'Dirección'],
    ['billing_state', 60, 'Provincia'],
    ['billing_city', 70, 'Localidad'],
    ['billing_postcode', 80, 'Código postal'],
    ['billing_country', 90, 'País']
  ];
  for (const [key, priority, label] of expected) {
    assert.match(fn, new RegExp("'" + key + "'\\s*=>[^\\n]*'priority' => " + priority));
    assert.ok(fn.includes("__( '" + label + "'"), 'missing exact label for ' + key);
  }
});

test('delivery section heading is appended through the native billing hook', () => {
  assert.match(woocommercePhp, /function cr2026_checkout_render_delivery_heading\( \$checkout \)/);
  assert.match(woocommercePhp, /woocommerce_before_checkout_billing_form', 'cr2026_checkout_render_delivery_heading', 5, 1/);
  assert.match(woocommercePhp, /cr-checkout-delivery-heading__step/);
  assert.match(woocommercePhp, /esc_html__\( 'Entrega'/);
  assert.match(checkoutCss, /\.woocommerce-billing-fields > h3\s*\{\s*display:\s*none;/);
});

test('delivery field semantics define five full-width fields and two half-width rows', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  const full = ['billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone', 'billing_address_1'];
  const half = ['billing_state', 'billing_city', 'billing_postcode', 'billing_country'];
  for (const key of full) assert.match(fn, new RegExp("'" + key + "'\\s*=>[^\\n]*'layout' => 'full'"));
  for (const key of half) assert.match(fn, new RegExp("'" + key + "'\\s*=>[^\\n]*'layout' => 'half'"));
  assert.ok(fn.includes("'cr-delivery-field--' . $presentation['layout']"));
  assert.ok(fn.includes("'form-row-first', 'form-row-last', 'form-row-wide'"));
  assert.ok(checkoutCss.includes(".woocommerce-billing-fields__field-wrapper {"));
  assert.ok(checkoutCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr));"));
  assert.ok(checkoutCss.includes(".form-row.cr-delivery-field--full"));
  assert.ok(checkoutCss.includes(".form-row.cr-delivery-field--half"));
  assert.doesNotMatch(checkoutCss, /max-width:\s*340px/);
  const billingGrid = cssRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .woocommerce-billing-fields__field-wrapper');
  assert.doesNotMatch(billingGrid, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  const orderDeclarationPattern = new RegExp("^[ \\t]*order[ \\t]*:", "m");
  assert.doesNotMatch(checkoutCss, orderDeclarationPattern);
});

test('delivery labels float over native controls and retain the real WooCommerce label element', () => {
  assert.ok(checkoutCss.includes(".woocommerce-billing-fields__field-wrapper > .form-row > label {"));
  assert.ok(checkoutCss.includes("position: absolute;"));
  assert.ok(checkoutCss.includes("transform: translateY(-50%);"));
  assert.ok(checkoutCss.includes("background: var(--cr-app-canvas);"));
  assert.ok(checkoutCss.includes("pointer-events: none;"));
  assert.ok(checkoutCss.includes(".form-row input.input-text"));
  assert.ok(woocommercePhp.includes("$fields[ $key ]['label'] = $presentation['label'];"));
});

test('native delivery controls and Select2 remain presentation-only with no DOM replacement', () => {
  assert.doesNotMatch(woocommercePhp, /woocommerce_form_field|select2|wp_dequeue_script/);
  assert.ok(checkoutCss.includes(".select2-selection--single"));
  assert.ok(checkoutCss.includes("height: var(--cr-checkout-field-height);"));
  const orderDeclarationPattern = new RegExp("^[ \\t]*order[ \\t]*:", "m");
  assert.doesNotMatch(checkoutCss, orderDeclarationPattern);
  assert.doesNotMatch(woocommercePhp, /appendChild|insertBefore|insertAdjacentElement/);
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
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", start);
  assert.doesNotMatch(woocommercePhp.slice(start, end), /ship_to_different_address|shipping_/);
});

test('delivery styling is scoped to checkout and excludes notes and transactional sections', () => {
  for (const selector of [
    'body.woocommerce-checkout:not(.woocommerce-order-received) .woocommerce-billing-fields__field-wrapper',
    'body.woocommerce-checkout:not(.woocommerce-order-received) .woocommerce-shipping-fields'
  ]) assert.ok(checkoutCss.includes(selector), 'missing scoped selector ' + selector);
  for (const forbidden of [
    '.woocommerce-additional-fields', '#payment', 'payment_method_',
    'checkout_coupon', 'place_order', 'wployalty', 'wc-ajax'
  ]) assert.equal(checkoutCss.includes(forbidden), false, forbidden + ' must remain outside delivery styling');
});



test('WooCommerce default, base and ES address locales normalize only native field priorities', () => {
  const localeFnStart = woocommercePhp.indexOf('function cr2026_checkout_normalize_address_locale_priorities(');
  const localeFnEnd = woocommercePhp.indexOf("add_filter( 'woocommerce_get_country_locale_default'", localeFnStart);
  const localeFn = woocommercePhp.slice(localeFnStart, localeFnEnd);
  const countryLocaleStart = woocommercePhp.indexOf('function cr2026_checkout_country_address_locale(');
  const countryLocaleEnd = woocommercePhp.indexOf("add_filter( 'woocommerce_get_country_locale'", countryLocaleStart);
  const countryLocaleFn = woocommercePhp.slice(countryLocaleStart, countryLocaleEnd);

  assert.ok(localeFnStart >= 0 && localeFnEnd > localeFnStart);
  assert.ok(countryLocaleStart >= 0 && countryLocaleEnd > countryLocaleStart);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_get_country_locale_default', 'cr2026_checkout_normalize_address_locale_priorities', 9999 \)/);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_get_country_locale_base', 'cr2026_checkout_normalize_address_locale_priorities', 9999 \)/);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_get_country_locale', 'cr2026_checkout_country_address_locale', 9999 \)/);

  for (const [key, priority] of [
    ['phone', 40], ['address_1', 50], ['state', 60],
    ['city', 70], ['postcode', 80], ['country', 90]
  ]) {
    assert.ok(localeFn.includes("'" + key + "'"), 'missing default/base locale key ' + key);
    assert.match(localeFn, new RegExp("'" + key + "'\\s*=>\\s*" + priority), 'missing locale priority ' + priority + ' for ' + key);
    assert.ok(countryLocaleFn.includes('cr2026_checkout_normalize_address_locale_priorities'), 'ES locale must reuse priority-only normalizer');
  }
  assert.doesNotMatch(localeFn, /\['(?:label|required|hidden|type|validate|autocomplete|states|value)'\]\s*=/);
  assert.doesNotMatch(countryLocaleFn, /\['(?:label|required|hidden|type|validate|autocomplete|states|value)'\]\s*=/);
  assert.deepEqual([...woocommercePhp.matchAll(/add_filter\( 'woocommerce_checkout_fields', '([^']+)'/g)].map(match => match[1]), ['cr2026_checkout_stabilize_phone_field_order']);
});
test('runtime pipeline simulation preserves final billing DOM order after ES locale and native JS sorting', () => {
  const expected = [
    ['billing_first_name', 10, 'Nombre'],
    ['billing_last_name', 20, 'Apellidos'],
    ['billing_email', 30, 'Email'],
    ['billing_phone', 40, 'Teléfono'],
    ['billing_address_1', 50, 'Dirección'],
    ['billing_state', 60, 'Provincia'],
    ['billing_city', 70, 'Localidad'],
    ['billing_postcode', 80, 'Código postal'],
    ['billing_country', 90, 'País']
  ];

  // WooCommerce core definitions before theme filters (simplified to the
  // native fields involved in the delivery section).
  const defaults = {
    first_name: { label: 'First name', priority: 10 },
    last_name: { label: 'Last name', priority: 20 },
    country: { label: 'Country / Region', priority: 40 },
    address_1: { label: 'Street address', priority: 50 },
    address_2: { label: 'Apartment, suite, unit, etc.', priority: 60 },
    city: { label: 'Town / City', priority: 70 },
    state: { label: 'State / County', priority: 80 },
    postcode: { label: 'Postcode / ZIP', priority: 90 },
    phone: { label: 'Phone', priority: 100 }
  };
  // Core ES overlay before theme filters.
  const esBefore = {
    postcode: { priority: 65 },
    state: { label: 'Province' }
  };
  const normalizedDefault = structuredClone(defaults);
  const normalizedEs = structuredClone(esBefore);
  const localePriorities = {
    phone: 40, address_1: 50, state: 60, city: 70, postcode: 80, country: 90
  };
  for (const [key, priority] of Object.entries(localePriorities)) {
    normalizedDefault[key] = { ...(normalizedDefault[key] || {}), priority };
    normalizedEs[key] = { ...(normalizedEs[key] || {}), priority };
  }

  const billing = {};
  for (const [key, value] of Object.entries(normalizedDefault)) {
    billing['billing_' + key] = { ...value };
  }
  billing.billing_email = { label: 'Email address', priority: 110, type: 'email' };
  billing.billing_phone = { label: 'Phone', priority: 100, type: 'tel' };
  for (const [key, value] of Object.entries(normalizedEs)) {
    if (billing['billing_' + key]) billing['billing_' + key] = { ...billing['billing_' + key], ...value };
  }

  // Theme's billing filter (the actual PHP map is asserted above and below).
  for (const [key, priority, label] of expected) {
    if (billing[key]) {
      billing[key].priority = priority;
      billing[key].label = label;
    }
  }
  const phpSorted = Object.entries(billing).sort((a, b) => a[1].priority - b[1].priority);

  // Native address-i18n.js merges default+country locale, rewrites locale
  // labels/priorities, then sorts wrapper rows. Contact fields are not locale
  // address keys and retain their billing-filter priorities.
  const localeKeys = ['phone', 'first_name', 'last_name', 'country', 'address_1', 'city', 'state', 'postcode'];
  const runtime = phpSorted.map(([key, field]) => [key, { ...field }]);
  for (const key of localeKeys) {
    const fieldKey = 'billing_' + key;
    const row = runtime.find(([name]) => name === fieldKey);
    if (!row) continue;
    const merged = { ...(normalizedDefault[key] || {}), ...(normalizedEs[key] || {}) };
    if (merged.priority !== undefined) row[1].priority = merged.priority;
  }
  runtime.sort((a, b) => a[1].priority - b[1].priority);

  const knownOrder = runtime.map(([key]) => key).filter(key => expected.some(([known]) => known === key));
  assert.deepEqual(knownOrder, expected.map(([key]) => key));
  const labels = Object.fromEntries(runtime.map(([key, field]) => [key, field.label]));
  assert.equal(labels.billing_country, 'País');
  assert.equal(labels.billing_city, 'Localidad');
  assert.equal(labels.billing_postcode, 'Código postal');
  assert.equal(labels.billing_state, 'Provincia');
  assert.equal(labels.billing_phone, 'Teléfono');
  assert.equal(labels.billing_email, 'Email');

  // The checkout CSS makes unknown rows full width by default; native company
  // and address_2 rows are not removed or rewritten by the theme callback.
  assert.ok(checkoutCss.includes('grid-column: 1 / -1;'));
  const deliveryStart = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const deliveryEnd = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", deliveryStart);
  const deliveryFn = woocommercePhp.slice(deliveryStart, deliveryEnd);
  assert.equal(deliveryFn.includes('billing_company'), false);
  assert.equal(deliveryFn.includes('billing_address_2'), false);
  assert.equal(deliveryFn.includes('unset('), false);
});

test('delivery layout keeps semantic full/half rows independent of WooCommerce legacy floats', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  assert.ok(fn.includes("'cr-delivery-field--' . $presentation['layout']"));
  assert.ok(checkoutCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'));
  assert.ok(checkoutCss.includes('grid-column: 1 / -1;'));
  assert.ok(checkoutCss.includes('grid-column: auto;'));
  assert.doesNotMatch(checkoutCss, /^[ \t]*order[ \t]*:/m);
  assert.doesNotMatch(woocommercePhp, /appendChild|insertBefore|insertAdjacentElement/);
});

test('shipping and summary headings are shared, numbered, and the old heading callback is removed', () => {
  assert.doesNotMatch(woocommercePhp, /function cr2026_checkout_render_shipping_heading/);
  assert.doesNotMatch(woocommercePhp, /add_action\( 'woocommerce_review_order_before_shipping', 'cr2026_checkout_render_shipping_heading'/);
  assert.match(templatePhp, /cr-checkout-delivery-heading cr-checkout-shipping-heading/);
  assert.match(templatePhp, /aria-hidden="true">2<\/span><h2><\?php esc_html_e\( 'Envío'/);
  assert.match(templatePhp, /cr-checkout-delivery-heading cr-checkout-summary-heading/);
  assert.match(templatePhp, /aria-hidden="true">3<\/span><h2><\?php esc_html_e\( 'Resumen'/);
  assert.match(templatePhp, /do_action\( 'woocommerce_review_order_before_shipping' \)/);
  assert.match(templatePhp, /do_action\( 'woocommerce_review_order_after_shipping' \)/);
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\) \.cr-checkout-delivery-heading\s*\{/);
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\) \.cr-checkout-delivery-heading h2\s*\{/);
});

test('official override template version and native shipping render are exactly preserved once', () => {
  assert.match(templatePhp, /@version 11\.2\.0/);
  assert.match(templatePhp, /WC\(\)->cart->needs_shipping\(\) && WC\(\)->cart->show_shipping\(\)/);
  assert.equal([...templatePhp.matchAll(/wc_cart_totals_shipping_html\(\)/g)].length, 1);
  const before = templatePhp.indexOf("do_action( 'woocommerce_review_order_before_shipping' )");
  const nativeRender = templatePhp.indexOf('wc_cart_totals_shipping_html()');
  const after = templatePhp.indexOf("do_action( 'woocommerce_review_order_after_shipping' )");
  assert.ok(before >= 0 && nativeRender > before && after > nativeRender);
  assert.match(templatePhp, /<table class="cr-checkout-shipping-table">\s*<tbody>/);
  assert.doesNotMatch(templatePhp, /<input[^>]+type=["']radio|shipping_method\[[^]]+\]\s*=/i);
});

test('shipping row precedes the summary heading row and native products remain within the single root table', () => {
  const rootStart = templatePhp.indexOf('<table class="shop_table woocommerce-checkout-review-order-table">');
  const shippingStart = templatePhp.indexOf('class="cr-checkout-shipping-section-row"');
  const summaryStart = templatePhp.indexOf('class="cr-checkout-summary-heading-row"');
  const productsStart = templatePhp.indexOf("do_action( 'woocommerce_review_order_before_cart_contents' )");
  const rootEnd = templatePhp.lastIndexOf('</table>');
  assert.ok(rootStart >= 0 && shippingStart > rootStart && summaryStart > shippingStart && productsStart > summaryStart && rootEnd > productsStart);
  assert.match(templatePhp, /woocommerce-checkout-review-order-table/);
  assert.match(templatePhp, /do_action\( 'woocommerce_review_order_before_cart_contents' \)/);
  assert.match(templatePhp, /foreach \( WC\(\)->cart->get_cart\(\) as \$cart_item_key => \$cart_item \)/);
  assert.match(templatePhp, /do_action\( 'woocommerce_review_order_after_cart_contents' \)/);
  for (const filter of [
    'woocommerce_cart_item_product', 'woocommerce_checkout_cart_item_visible',
    'woocommerce_cart_item_class', 'woocommerce_cart_item_name',
    'woocommerce_checkout_cart_item_quantity', 'woocommerce_cart_item_subtotal'
  ]) assert.ok(templatePhp.includes("apply_filters( '" + filter + "'"), 'preserve ' + filter);
});

test('summary preserves coupons, fees, taxes, totals and before/after total hooks without shipping duplication', () => {
  assert.match(templatePhp, /WC\(\)->cart->get_coupons\(\)/);
  assert.match(templatePhp, /wc_cart_totals_coupon_label\( \$coupon \)/);
  assert.match(templatePhp, /wc_cart_totals_coupon_html\( \$coupon \)/);
  assert.match(templatePhp, /WC\(\)->cart->get_fees\(\)/);
  assert.match(templatePhp, /wc_cart_totals_fee_html\( \$fee \)/);
  assert.match(templatePhp, /wc_tax_enabled\(\)/);
  assert.match(templatePhp, /WC\(\)->cart->get_tax_totals\(\)/);
  assert.match(templatePhp, /wc_cart_totals_taxes_total_html\(\)/);
  assert.match(templatePhp, /wc_cart_totals_order_total_html\(\)/);
  assert.match(templatePhp, /do_action\( 'woocommerce_review_order_before_order_total' \)/);
  assert.match(templatePhp, /do_action\( 'woocommerce_review_order_after_order_total' \)/);
  assert.equal([...templatePhp.matchAll(/wc_cart_totals_shipping_html\(\)/g)].length, 1);
});

test('shipping methods share one bordered container and native list items are rows, not cards', () => {
  const listSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods';
  const list = cssRuleBody(checkoutCss, listSelector);
  for (const required of ['width: 100%;', 'box-sizing: border-box;', 'border: var(--cr-card-border-width) solid var(--cr-border);', 'border-radius: var(--cr-card-radius);', 'overflow: hidden;', 'margin: 0;', 'padding: 0;', 'background: var(--cr-white);']) {
    assert.ok(list.includes(required), 'missing single-container property: ' + required);
  }
  const itemSelector = listSelector + ' > li';
  const item = cssRuleBody(checkoutCss, itemSelector);
  assert.ok(item.includes('border: 0;'));
  assert.ok(item.includes('border-radius: 0;'));
  assert.doesNotMatch(item, /border:\\s*1(?:\\.5)?px solid/);
  const dividerSelector = listSelector + ' > li + li';
  assert.match(cssRuleBody(checkoutCss, dividerSelector), /border-top:\s*1px solid/);
  const selectedSelector = listSelector + ' > li:has(> input.shipping_method[type="radio"]:checked)';
  const selected = cssRuleBody(checkoutCss, selectedSelector);
  assert.match(selected, /background:\s*color-mix/);
  assert.doesNotMatch(selected, /border/);
  const outerSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-section';
  const outerRules = checkoutCss.split(outerSelector + ' {').slice(1).map(rule => rule.slice(0, rule.indexOf('}')));
  assert.ok(outerRules.some(rule => ['border: 0;', 'border-radius: 0;', 'padding: 0;', 'background: transparent;', 'box-shadow: none;'].every(neutral => rule.includes(neutral))), 'a checkout-scoped later rule must neutralize the outer shipping surface');
});

test('native WooCommerce shipping radios and rate labels remain scoped to checkout', () => {
  assert.match(checkoutCss, /\.cr-checkout-shipping-table #shipping_method\.woocommerce-shipping-methods/);
  assert.match(checkoutCss, /input\.shipping_method\[type="radio"\]/);
  assert.match(checkoutCss, /#shipping_method\.woocommerce-shipping-methods > li > label/);
  assert.match(checkoutCss, /:has\(> input\.shipping_method\[type="radio"\]:checked\)/);
  assert.match(checkoutCss, /\.cr-checkout-shipping-table tr\.woocommerce-shipping-totals\.shipping > th\s*\{\s*display:\s*none;/);
  assert.match(checkoutCss, /\.cr-checkout-shipping-table tr\.woocommerce-shipping-totals\.shipping > td\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;/s);
  assert.doesNotMatch(checkoutCss, /\.woocommerce-checkout-review-order-table[^\n]*shipping_method/);
});

test('classic checkout update_order_review regenerates the full single-root shipping-before-summary fragment without DOM moves', () => {
  assert.match(templatePhp, /<table class="shop_table woocommerce-checkout-review-order-table">/);
  assert.match(templatePhp, /cr-checkout-shipping-section-row/);
  assert.match(templatePhp, /cr-checkout-summary-heading-row/);
  assert.doesNotMatch(woocommercePhp, /appendChild|insertBefore|insertAdjacentElement|update_checkout|updated_checkout/);
  assert.doesNotMatch(woocommercePhp, /wp_enqueue_script|wp_add_inline_script/);
});

test('shipping native hook remains core while only the former theme heading callback is removed', () => {
  assert.match(templatePhp, /do_action\( 'woocommerce_review_order_before_shipping' \)/);
  assert.match(templatePhp, /do_action\( 'woocommerce_review_order_after_shipping' \)/);
  assert.doesNotMatch(woocommercePhp, /cr2026_checkout_render_shipping_heading/);
  assert.doesNotMatch(templatePhp, /woocommerce_package_rates|woocommerce_shipping_rate_cost|woocommerce_shipping_methods/);
});

test('free-shipping progress is deferred because the cart has no shared threshold/subtotal progress source', () => {
  assert.doesNotMatch(cartPhp, /free.?shipping|env[ií]o gratis|shipping.?threshold|amount_for_free/i);
  assert.doesNotMatch(helpersPhp, /free.?shipping|env[ií]o gratis|shipping.?threshold|amount_for_free/i);
  assert.doesNotMatch(woocommercePhp, /free.?shipping|env[ií]o gratis|shipping.?threshold|amount_for_free/i);
});


test('shipping checkout layout changes are isolated from cart shipping presentation', () => {
  assert.doesNotMatch(checkoutCss, /\.woocommerce-cart\s+\.woocommerce-checkout-review-order-table/);
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\)/);
});


test('checkout review fragment has one table root and no template siblings outside it', () => {
  const rootOpen = templatePhp.indexOf('<table class="shop_table woocommerce-checkout-review-order-table">');
  const rootClose = templatePhp.lastIndexOf('</table>');
  assert.ok(rootOpen >= 0 && rootClose > rootOpen);
  assert.equal([...templatePhp.matchAll(/<table class="shop_table woocommerce-checkout-review-order-table">/g)].length, 1);
  assert.equal([...templatePhp.matchAll(/<table class="shop_table woocommerce-checkout-review-order-table">/g)].length, 1, 'single fragment root');
  assert.equal(templatePhp.slice(0, rootOpen).replace(/<\?php[\s\S]*?\?>|\s|<!--[^]*?-->/g, ''), '');
  assert.equal(templatePhp.slice(rootClose + '</table>'.length).replace(/<\?php[\s\S]*?\?>|\s|<!--[^]*?-->/g, ''), '');
  assert.match(templatePhp, /<tr class="cr-checkout-shipping-section-row">\s*<td colspan="2">/);
  assert.match(templatePhp, /<tr class="cr-checkout-summary-heading-row">\s*<td colspan="2">[\s\S]*?3[\s\S]*?Resumen/);
  assert.ok(templatePhp.indexOf('cr-checkout-shipping-section-row') < templatePhp.indexOf('cr-checkout-summary-heading-row'));
  assert.ok(templatePhp.indexOf('cr-checkout-summary-heading-row') < templatePhp.indexOf('woocommerce_review_order_before_cart_contents'));
  assert.equal([...templatePhp.matchAll(/wc_cart_totals_shipping_html\(\)/g)].length, 1);
  assert.match(templatePhp, /if \( WC\(\)->cart->needs_shipping\(\) && WC\(\)->cart->show_shipping\(\) \)/);
  assert.match(templatePhp, /woocommerce_review_order_before_shipping[\s\S]*?wc_cart_totals_shipping_html\(\)[\s\S]*?woocommerce_review_order_after_shipping/);
  assert.doesNotMatch(templatePhp, /<tfoot>[\s\S]*?wc_cart_totals_shipping_html\(\)/);
});

test('checkout review preserves native product filters, hooks, and numeric total rendering contracts', () => {
  for (const required of [
    'woocommerce_review_order_before_cart_contents', 'woocommerce_review_order_after_cart_contents',
    'woocommerce_cart_item_product', 'woocommerce_checkout_cart_item_visible', 'woocommerce_cart_item_class',
    'woocommerce_cart_item_name', 'woocommerce_checkout_cart_item_quantity', 'woocommerce_cart_item_subtotal',
    'woocommerce_review_order_before_order_total', 'woocommerce_review_order_after_order_total',
    'wc_cart_totals_subtotal_html()', 'get_discount_total()', 'get_discount_tax()',
    'get_fees()', '$fee->total', '$fee->tax', 'wc_cart_totals_fee_html(',
    'wc_cart_totals_taxes_total_html()', 'wc_cart_totals_order_total_html()'
  ]) assert.ok(templatePhp.includes(required), 'native contract missing: ' + required);
  assert.ok(!templatePhp.includes('wc_cart_totals_coupon_html('));
  assert.ok(!templatePhp.includes('class="cart-discount'));
  assert.match(templatePhp, /<tfoot(?:\\s+class="[^"]+")?>[\\s\\S]*?woocommerce_review_order_before_order_total[\\s\\S]*?order-total[\\s\\S]*?woocommerce_review_order_after_order_total[\\s\\S]*?<\\/tfoot>/);
});
test('checkout native order-review heading is hidden narrowly and summary step heading remains', () => {
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\) #order_review_heading\s*\{\s*display:\s*none;/);
  assert.match(templatePhp, /cr-checkout-summary-heading-row[\s\S]*?cr-checkout-summary-heading[\s\S]*?3[\s\S]*?Resumen/);
  assert.doesNotMatch(checkoutCss, /(^|\n)\s*#order_review\s*\{/);
});

test('shipping presentation is adapted to the table-row fragment without changing methods or values', () => {
  for (const required of [
    '.cr-checkout-shipping-section-row > td', '.cr-checkout-shipping-table',
    'width: 100%', 'table-layout: auto', 'tr.woocommerce-shipping-totals.shipping > th',
    'tr.woocommerce-shipping-totals.shipping > td'
  ]) assert.ok(checkoutCss.includes(required), 'missing shipping row presentation rule: ' + required);
  assert.match(checkoutCss, /#shipping_method\.woocommerce-shipping-methods\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(checkoutCss, /word-break:\s*normal;\s*overflow-wrap:\s*normal;/);
});


test('checkout review THEAD markup remains native but is hidden only on checkout', () => {
  assert.ok(templatePhp.includes('<thead>'));
  assert.ok(templatePhp.includes('<th class="product-name">'));
  assert.ok(templatePhp.includes('<th class="product-total">'));
  const selector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .woocommerce-checkout-review-order-table > thead';
  const rule = cssRuleBody(checkoutCss, selector);
  assert.ok(rule.includes('display: none;'));
  assert.equal(checkoutCss.includes('body.woocommerce-cart ' + selector), false);
});

test('shipping native TD padding is the actual width inset and method cards fill available rail', () => {
  const td = cssRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table tr.woocommerce-shipping-totals.shipping > td');
  assert.ok(td.includes('display: block;'));
  assert.ok(td.includes('width: 100%;'));
  assert.ok(td.includes('padding: 0;'));
  const list = cssRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods');
  assert.ok(list.includes('width: 100%;'));
  assert.ok(list.includes('min-width: 0;'));
  assert.ok(list.includes('border: var(--cr-card-border-width) solid var(--cr-border);'));
  assert.ok(list.includes('border-radius: var(--cr-card-radius);'));
  assert.ok(list.includes('overflow: hidden;'));
  assert.ok(list.includes('padding: 0;'));
  const li = cssRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods > li');
  assert.ok(li.includes('width: 100%;'));
  assert.ok(li.includes('min-width: 0;'));
  assert.ok(li.includes('box-sizing: border-box;'));
  assert.equal(li.includes('width: 320px;'), false);
  const label = cssRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods > li > label');
  assert.ok(label.includes('width: auto;'));
  assert.ok(label.includes('margin-inline-start: 10px;'));
  assert.ok(label.includes('min-width: 0;'));
  assert.ok(label.includes('word-break: normal;'));
  assert.ok(label.includes('overflow-wrap: normal;'));
});


test('checkout review wrapper and root table lose only their inherited outer card surfaces', () => {
  const wrapperSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) #order_review';
  const tableSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) #order_review > .woocommerce-checkout-review-order-table';
  const wrapper = cssRuleBody(checkoutCss, wrapperSelector);
  const table = cssRuleBody(checkoutCss, tableSelector);
  for (const [name, rule] of [['wrapper', wrapper], ['root table', table]]) {
    for (const neutral of ['border: 0;', 'border-radius: 0;', 'background: transparent;', 'box-shadow: none;', 'overflow: visible;']) {
      assert.ok(rule.includes(neutral), name + ' must neutralize ' + neutral);
    }
  }
  assert.ok(wrapper.includes('padding: 0;'), 'remove only the exterior review card padding');
  assert.ok(table.includes('margin: 0;'), 'remove outer table margin without changing inner summary cells');
  assert.match(templatePhp, /<table class="shop_table woocommerce-checkout-review-order-table">/);
  assert.equal([...templatePhp.matchAll(/<table class="shop_table woocommerce-checkout-review-order-table">/g)].length, 1);
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\) #order_review/);
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\) #order_review > \.woocommerce-checkout-review-order-table/);
});



test('checkout assigns the shared Cart gutter only to inner visual surfaces', () => {
  assert.ok(cartCss.includes('body.woocommerce-cart { --cr-cart-card-inline-gutter:16px; }'));
  assert.ok(cartCss.includes('@media(max-width:767px){body.woocommerce-cart{--cr-cart-card-inline-gutter:11px}}'));
  assert.ok(cartCss.includes('@media(max-width:360px){body.woocommerce-cart{--cr-cart-card-inline-gutter:9px}}'));
  assert.ok(cartCss.includes('margin-inline:var(--cr-cart-card-inline-gutter)'));

  assert.ok(checkoutCss.includes('--cr-cart-card-inline-gutter: 16px;'));
  assert.ok(checkoutCss.includes('--cr-cart-card-inline-gutter: 11px;'));
  assert.ok(checkoutCss.includes('--cr-cart-card-inline-gutter: 9px;'));

  const shell = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-main > .cr-shell.cr-page-shell');
  assert.doesNotMatch(shell, /(^|\s)width\s*:/, 'Checkout shell must inherit width from the global .cr-shell rule');
  assert.ok(shell.includes('max-width: 1360px;'));
  assert.ok(shell.includes('margin-inline: auto;'));
  assert.ok(shell.includes('padding-inline: 0;'));
  assert.ok(shell.includes('box-sizing: border-box;'));
  assert.equal(shell.includes('cr-cart-card-inline-gutter'), false);

  const form = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) form.checkout.woocommerce-checkout');
  assert.ok(form.includes('width: 100%;'));
  assert.ok(form.includes('max-width: none;'));
  assert.ok(form.includes('margin: 0;'));
  assert.ok(form.includes('padding-inline: 0;'));
  assert.equal(form.includes('cr-cart-card-inline-gutter'), false);

  const deliveryHeading = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-delivery-heading');
  const deliveryFields = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .woocommerce-billing-fields__field-wrapper');
  assert.ok(deliveryHeading.includes('margin-inline: var(--cr-cart-card-inline-gutter);'));
  assert.ok(deliveryFields.includes('margin-inline: var(--cr-cart-card-inline-gutter);'));

  const shippingHeading = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-heading');
  const summaryHeading = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-summary-heading');
  assert.ok(shippingHeading.includes('margin-inline: var(--cr-card-inline-inset);'));
  assert.ok(summaryHeading.includes('margin-inline: var(--cr-cart-card-inline-gutter);'));

  const methods = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods');
  assert.ok(methods.includes('width: auto;'));
  assert.ok(methods.includes('margin-inline: var(--cr-card-inline-inset);'));
  assert.equal(methods.includes('width: 100%;'), false);
});

test('checkout has exactly one gutter layer and no structural gutter owners', () => {
  const shell = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-main > .cr-shell.cr-page-shell');
  const form = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) form.checkout.woocommerce-checkout');
  const root = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) #order_review > .woocommerce-checkout-review-order-table');
  assert.equal(shell.includes('margin-inline: var(--cr-cart-card-inline-gutter)'), false);
  assert.equal(form.includes('margin-inline: var(--cr-cart-card-inline-gutter)'), false);
  assert.equal(root.includes('margin-inline: var(--cr-cart-card-inline-gutter)'), false);
  assert.ok(root.includes('width: 100%;'));
  assert.ok(root.includes('max-width: 100%;'));
  assert.ok(root.includes('table-layout: auto;'));

  const section = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-section');
  const table = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table');
  const row = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table > tbody > tr.woocommerce-shipping-totals.shipping');
  const cell = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table > tbody > tr.woocommerce-shipping-totals.shipping > td');
  for (const [name, body] of [['section',section],['table',table],['row',row],['cell',cell]]) {
    assert.equal(body.includes('cr-cart-card-inline-gutter'), false, name + ' must not own the gutter');
    assert.ok(body.includes('margin: 0;') || body.includes('margin: 0 0 24px;'), name + ' must remain neutral');
    assert.ok(body.includes('padding: 0;'), name + ' must remain neutral');
    assert.ok(body.includes('border: 0;'), name + ' must remain neutral');
    assert.ok(body.includes('background: transparent;'), name + ' must remain neutral');
    assert.ok(body.includes('box-shadow: none;'), name + ' must remain neutral');
  }
});

test('shipping remains the only visible method card and native AJAX root is preserved', () => {
  const rail = checkoutCss.slice(checkoutCss.lastIndexOf('/* Checkout rail: reuse Cart'));
  const listSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods';
  const list = cssRuleBody(checkoutCss, listSelector);
  for (const property of ['width: 100%;', 'box-sizing: border-box;', 'border: var(--cr-card-border-width) solid var(--cr-border);', 'border-radius: var(--cr-card-radius);', 'overflow: hidden;', 'margin: 0;', 'padding: 0;']) {
    assert.ok(list.includes(property), 'shipping_method must retain its single container property: ' + property);
  }
  assert.ok(checkoutCss.includes('#shipping_method.woocommerce-shipping-methods > li + li'));
  const methodLabel = cssRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods > li > label');
  assert.ok(methodLabel.includes('margin-inline-start: 10px;'), 'Shipping labels must have a generic gap after the radio');
  assert.ok(methodLabel.includes('width: auto;'), 'Shipping label auto sizing must preserve the radio-to-label gap');
  assert.ok(checkoutCss.includes('border-top: 1px solid var(--cr-checkout-field-border);'));
  assert.ok(checkoutCss.includes('background: color-mix(in srgb, var(--cr-green) 5%, var(--cr-app-canvas));'));
  assert.match(templatePhp, /<table class="shop_table woocommerce-checkout-review-order-table">/);
  assert.equal([...templatePhp.matchAll(/<table class="shop_table woocommerce-checkout-review-order-table">/g)].length, 1);
  assert.equal(rail.includes('billing_phone'), false);
});


test('checkout shipping mini-table is flattened to block sizing without changing its gutter or AJAX root', () => {
  const tableSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table';
  const tbodySelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table > tbody';
  const rowSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table > tbody > tr.woocommerce-shipping-totals.shipping';
  const thSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table > tbody > tr.woocommerce-shipping-totals.shipping > th';
  const tdSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table > tbody > tr.woocommerce-shipping-totals.shipping > td';
  const sectionSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-section';

  const table = cssLastRuleBody(checkoutCss, tableSelector);
  const tbody = cssLastRuleBody(checkoutCss, tbodySelector);
  const row = cssLastRuleBody(checkoutCss, rowSelector);
  const th = cssLastRuleBody(checkoutCss, thSelector);
  const td = cssLastRuleBody(checkoutCss, tdSelector);
  const section = cssLastRuleBody(checkoutCss, sectionSelector);

  assert.match(table, /display:\s*block/);
  assert.match(table, /width:\s*100%/);
  assert.match(table, /max-width:\s*none/);
  assert.doesNotMatch(table, /table-layout\s*:/);
  assert.match(tbody, /display:\s*block/);
  assert.match(tbody, /width:\s*100%/);
  assert.match(tbody, /max-width:\s*none/);
  assert.match(tbody, /min-width:\s*0/);
  assert.match(row, /display:\s*block/);
  assert.match(row, /width:\s*100%/);
  assert.match(row, /max-width:\s*none/);
  assert.match(row, /min-width:\s*0/);
  assert.match(th, /display:\s*none/);
  assert.match(td, /display:\s*block/);
  assert.match(td, /width:\s*100%/);
  assert.match(td, /max-width:\s*none/);
  assert.match(td, /min-width:\s*0/);
  assert.match(td, /padding:\s*0/);
  assert.match(td, /margin:\s*0/);
  assert.match(section, /width:\s*100%/);
  assert.match(section, /max-width:\s*none/);
  assert.match(section, /min-width:\s*0/);

  const methods = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods');
  assert.match(methods, /max-width:\s*none/);
  assert.match(methods, /margin-inline:\s*var\(--cr-card-inline-inset\)/);
  assert.equal(methods.includes('padding-inline'), false);
  assert.equal(methods.includes('margin-left'), false);
  assert.equal(methods.includes('margin-right'), false);

  const reviewRoot = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) #order_review > .woocommerce-checkout-review-order-table');
  assert.match(reviewRoot, /display:\s*table/);
  assert.match(reviewRoot, /width:\s*100%/);
  assert.match(checkoutCss, /#order_review > \.woocommerce-checkout-review-order-table/);
});

test('checkout additional information uses the Product Detail accordion pattern and preserves native order notes', () => {
  const checkoutJs = fs.readFileSync(path.join(theme, 'assets/js/checkout-additional-info.js'), 'utf8');
  assert.match(assets, /cr2026-checkout-additional-info/);
  assert.match(checkoutJs, /\.woocommerce-additional-fields/);
  assert.match(checkoutJs, /cr-checkout-additional-info__toggle/);
  assert.match(checkoutJs, /aria-expanded', 'false'/);
  assert.match(checkoutJs, /aria-controls/);
  assert.match(checkoutJs, /panel\.hidden = true/);
  assert.match(checkoutJs, /panel\.hidden = expanded/);
  assert.match(checkoutJs, /heading\.remove\(\)/);
  assert.match(checkoutJs, /nativeContent\.forEach/);
  assert.match(checkoutJs, /updated_checkout\.crAdditionalInfo/);
  assert.match(checkoutJs, /crAdditionalInfoInitialized/);
  assert.match(checkoutJs, /document\.createElement\('button'\)/);
  assert.match(checkoutJs, /order_comments/);
  assert.match(checkoutCss, /\.cr-checkout-additional-info__panel textarea#order_comments[\s\S]*?width:\s*100%[\s\S]*?max-width:\s*none[\s\S]*?box-sizing:\s*border-box/);
  assert.match(checkoutCss, /\.cr-checkout-additional-info__toggle:focus-visible/);
  assert.match(checkoutCss, /\.cr-checkout-additional-info__panel\[hidden\][\s\S]*?display:\s*none\s*!important/);
});

test('Cart and Checkout cards consume one global responsive rail while delivery fields retain their own gutter', () => {
  assert.match(mainCss, /--cr-card-inline-inset:\s*16px/);
  assert.match(mainCss, /@media\s*\(max-width:\s*767px\)[\s\S]*?--cr-card-inline-inset:\s*11px/);
  assert.match(mainCss, /@media\s*\(max-width:\s*360px\)[\s\S]*?--cr-card-inline-inset:\s*9px/);
  assert.equal((cartCss.match(/padding-inline:var\(--cr-card-inline-inset\);/g) || []).length, 3);
  assert.doesNotMatch(checkoutCss, /--cr-checkout-visible-field-inset/);
  for (const selector of [
    'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-additional-info',
    'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-heading',
    'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods'
  ]) {
    const rule = cssLastRuleBody(checkoutCss, selector);
    assert.match(rule, /margin-inline:\s*var\(--cr-card-inline-inset\)/, selector);
  }
  const deliveryHeading = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-delivery-heading');
  const deliveryFields = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .woocommerce-billing-fields__field-wrapper');
  assert.ok(deliveryHeading.includes('margin-inline: var(--cr-cart-card-inline-gutter);'));
  assert.ok(deliveryFields.includes('margin-inline: var(--cr-cart-card-inline-gutter);'));
});


test('checkout app cards consume the global surface contract without changing their rails', () => {
  const shippingSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-shipping-table #shipping_method.woocommerce-shipping-methods';
  const infoSelector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-additional-info';
  const shipping = cssLastRuleBody(checkoutCss, shippingSelector);
  const info = cssLastRuleBody(checkoutCss, infoSelector);
  for (const rule of [shipping, info]) {
    assert.ok(rule.includes('border: var(--cr-card-border-width) solid var(--cr-border);'));
    assert.ok(rule.includes('border-radius: var(--cr-card-radius);'));
    assert.ok(rule.includes('margin-inline: var(--cr-card-inline-inset);'));
  }
  assert.ok(shipping.includes('background: var(--cr-white);'));
  assert.ok(info.includes('background: var(--cr-app-canvas);'));
  const toggle = cssLastRuleBody(checkoutCss, 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-additional-info__toggle');
  assert.ok(toggle.includes('background: var(--cr-app-canvas);'), 'The visible toggle surface must match the Checkout canvas');
  assert.ok(mainCss.includes('--cr-app-canvas: #FCFAF7;'));
  assert.ok(mainCss.includes('--cr-card-border-width: 1px;'));
  assert.ok(mainCss.includes('--cr-card-radius: 18px;'));
  assert.ok(mainCss.includes('--cr-border: rgba(32, 36, 31, .1);'));
  assert.ok(mainCss.includes('--cr-white: #fff;'));
  assert.ok(mainCss.includes('--cr-card-inline-inset: 16px;'));
  assert.ok(cartCss.includes('padding-inline:var(--cr-card-inline-inset);'));
});



test('Checkout shell inherits the global responsive shell width instead of forcing width: 100%', () => {
  const selector = 'body.woocommerce-checkout:not(.woocommerce-order-received) .cr-main > .cr-shell.cr-page-shell';
  const checkoutShell = cssLastRuleBody(checkoutCss, selector);
  assert.doesNotMatch(checkoutShell, /(^|\s)width\s*:/, 'Checkout must not override the global shell width');

  const globalShell = cssRuleBody(mainCss, '.cr-shell');
  assert.match(globalShell, /width:\s*min\(calc\(100%\s*-\s*40px\),\s*var\(--cr-shell\)\)/,
    'The global shell rule remains the canonical width source');
  const mobileShellRule = mainCss.match(/@media\s*\(max-width:\s*767px\)[\s\S]*?\.cr-shell\s*\{([^}]*)\}/);
  assert.ok(mobileShellRule, 'The existing responsive global shell rule must remain present');
  assert.match(mobileShellRule[1], /width:\s*min\(calc\(100%\s*-\s*24px\),\s*var\(--cr-shell\)\)/);
});
