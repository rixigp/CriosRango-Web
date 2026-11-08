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
  for (const forbidden of ['#payment', '#order_review', 'payment_method_', 'place_order', 'checkout_coupon', 'woocommerce-checkout-review-order-table']) {
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
const cartPhp = fs.readFileSync(path.join(theme, 'inc/cart.php'), 'utf8');
const helpersPhp = fs.readFileSync(path.join(theme, 'inc/helpers.php'), 'utf8');

test('billing-field filter runs after locale defaults and before WooCommerce priority sorting', () => {
  assert.match(woocommercePhp, /function cr2026_checkout_delivery_fields\( \$fields, \$country = '' \)/);
  const start = woocommercePhp.indexOf('function cr2026_checkout_delivery_fields(');
  const end = woocommercePhp.indexOf("add_filter( 'woocommerce_billing_fields'", start);
  const fn = woocommercePhp.slice(start, end);
  assert.match(fn, /if \( ! is_array\( \$fields \) \)/);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_billing_fields', 'cr2026_checkout_delivery_fields', 9999, 2 \)/);
  assert.doesNotMatch(woocommercePhp, /add_filter\( 'woocommerce_checkout_fields'/);
  assert.doesNotMatch(woocommercePhp, /add_filter\( 'woocommerce_default_address_fields'/);
  const allowlist = [...fn.matchAll(/^\s*'(billing_[a-z0-9_]+)'\s*=>/gm)].map(match => match[1]);
  assert.deepEqual(allowlist, [
    'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
    'billing_address_1', 'billing_state', 'billing_city', 'billing_postcode', 'billing_country'
  ]);
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
  assert.doesNotMatch(checkoutCss, /grid-template-columns:\s*minmax\(0, 1fr\)/);
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
    '.woocommerce-additional-fields', 'order_review', '#payment', 'payment_method_',
    'checkout_coupon', 'place_order', 'wployalty', 'wc-ajax'
  ]) assert.equal(checkoutCss.includes(forbidden), false, forbidden + ' must remain outside delivery styling');
});



test('WooCommerce address locale overrides are normalized before native address-i18n runs', () => {
  const localeDefaultStart = woocommercePhp.indexOf('function cr2026_checkout_default_address_locale(');
  const localeDefaultEnd = woocommercePhp.indexOf("add_filter( 'woocommerce_get_country_locale_default'", localeDefaultStart);
  const localeDefaultFn = woocommercePhp.slice(localeDefaultStart, localeDefaultEnd);
  const countryLocaleStart = woocommercePhp.indexOf('function cr2026_checkout_country_address_locale(');
  const countryLocaleEnd = woocommercePhp.indexOf("add_filter( 'woocommerce_get_country_locale'", countryLocaleStart);
  const countryLocaleFn = woocommercePhp.slice(countryLocaleStart, countryLocaleEnd);

  assert.ok(localeDefaultStart >= 0 && localeDefaultEnd > localeDefaultStart);
  assert.ok(countryLocaleStart >= 0 && countryLocaleEnd > countryLocaleStart);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_get_country_locale_default', 'cr2026_checkout_default_address_locale', 9999 \)/);
  assert.match(woocommercePhp, /add_filter\( 'woocommerce_get_country_locale', 'cr2026_checkout_country_address_locale', 9999 \)/);
  assert.doesNotMatch(woocommercePhp, /add_filter\( 'woocommerce_default_address_fields'/);
  assert.doesNotMatch(woocommercePhp, /add_filter\( 'woocommerce_checkout_fields'/);

  for (const [key, priority, label] of [
    ['first_name', 10, 'Nombre'], ['last_name', 20, 'Apellidos'],
    ['address_1', 50, 'Dirección'], ['state', 60, 'Provincia'],
    ['city', 70, 'Localidad'], ['postcode', 80, 'Código postal'],
    ['country', 90, 'País']
  ]) {
    assert.ok(localeDefaultFn.includes("'" + key + "'"), 'missing default locale key ' + key);
    assert.ok(localeDefaultFn.includes("'priority' => " + priority), 'missing default locale priority ' + priority);
    assert.ok(localeDefaultFn.includes("__( '" + label + "'"), 'missing default locale label ' + label);
  }
  for (const [key, priority, label] of [
    ['state', 60, 'Provincia'], ['city', 70, 'Localidad'],
    ['postcode', 80, 'Código postal'], ['country', 90, 'País']
  ]) {
    assert.ok(countryLocaleFn.includes("'" + key + "'"), 'missing ES locale key ' + key);
    assert.ok(countryLocaleFn.includes("'priority' => " + priority), 'missing ES locale priority ' + priority);
    assert.ok(countryLocaleFn.includes("__( '" + label + "'"), 'missing ES locale label ' + label);
  }
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
    postcode: { label: 'Postcode / ZIP', priority: 90 }
  };
  // Core ES overlay before theme locale filters.
  const esBefore = {
    postcode: { priority: 65 },
    state: { label: 'Province' }
  };
  const normalizedDefault = structuredClone(defaults);
  const normalizedEs = structuredClone(esBefore);
  const localeValues = {
    first_name: ['Nombre', 10], last_name: ['Apellidos', 20],
    address_1: ['Dirección', 50], state: ['Provincia', 60],
    city: ['Localidad', 70], postcode: ['Código postal', 80],
    country: ['País', 90]
  };
  for (const [key, [label, priority]] of Object.entries(localeValues)) {
    normalizedDefault[key] = { ...normalizedDefault[key], label, priority };
  }
  for (const [key, [label, priority]] of Object.entries({
    state: ['Provincia', 60], city: ['Localidad', 70],
    postcode: ['Código postal', 80], country: ['País', 90]
  })) {
    normalizedEs[key] = { ...normalizedEs[key], label, priority };
  }

  // get_address_fields overlays ES on defaults, adds email/phone, applies
  // woocommerce_billing_fields, then PHP uasort runs.
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
  const localeKeys = ['first_name', 'last_name', 'country', 'address_1', 'city', 'state', 'postcode'];
  const runtime = phpSorted.map(([key, field]) => [key, { ...field }]);
  for (const key of localeKeys) {
    const fieldKey = 'billing_' + key;
    const row = runtime.find(([name]) => name === fieldKey);
    if (!row) continue;
    const merged = { ...(normalizedDefault[key] || {}), ...(normalizedEs[key] || {}) };
    if (merged.label !== undefined) row[1].label = merged.label;
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

test('shipping step heading is inserted through the classic order-review hook and reuses Delivery heading styles', () => {
  assert.match(woocommercePhp, /function cr2026_checkout_render_shipping_heading\(\)/);
  assert.match(woocommercePhp, /woocommerce_review_order_before_shipping', 'cr2026_checkout_render_shipping_heading', 5/);
  assert.match(woocommercePhp, /cr-checkout-delivery-heading cr-checkout-shipping-heading/);
  assert.match(woocommercePhp, /esc_html__\( 'Envío'/);
  assert.match(woocommercePhp, /colspan="2"/);
  assert.match(checkoutCss, /\.cr-checkout-shipping-heading-row > th/);
});

test('shipping presentation targets only the native WooCommerce rate list and radio inputs', () => {
  assert.match(checkoutCss, /#shipping_method\.woocommerce-shipping-methods/);
  assert.match(checkoutCss, /input\.shipping_method\[type="radio"\]/);
  assert.match(checkoutCss, /#shipping_method\.woocommerce-shipping-methods > li > label/);
  assert.match(checkoutCss, /label \.woocommerce-Price-amount/);
  assert.match(checkoutCss, /:has\(> input\.shipping_method\[type="radio"\]:checked\)/);
  assert.match(checkoutCss, /input\.shipping_method\[type="radio"\]:focus-visible/);
  assert.doesNotMatch(woocommercePhp, /<input[^>]+type=["']radio|shipping_method\[[^]]+\]\s*=/i);
  assert.doesNotMatch(woocommercePhp, /woocommerce_package_rates|woocommerce_shipping_rate_cost|woocommerce_shipping_methods/);
});

test('shipping heading and styles do not alter WooCommerce rate identity, selection, or availability', () => {
  const start = woocommercePhp.indexOf('function cr2026_checkout_render_shipping_heading(');
  const end = woocommercePhp.indexOf("add_action( 'woocommerce_review_order_before_shipping'", start);
  const fn = woocommercePhp.slice(start, end);
  assert.match(fn, /needs_shipping\(\)/);
  assert.match(fn, /show_shipping\(\)/);
  for (const forbidden of ['shipping_method[', 'instance_id', 'flat_rate', 'local_pickup', 'free_shipping', 'set_chosen_shipping_method', 'calculate_shipping']) {
    assert.equal(fn.includes(forbidden), false, 'shipping heading must not change ' + forbidden);
  }
  assert.doesNotMatch(checkoutCss, /shipping_method\[[0-9]+\]|instance_id|flat_rate|local_pickup|free_shipping/);
  assert.doesNotMatch(woocommercePhp, /appendChild|insertBefore|insertAdjacentElement|update_checkout|updated_checkout/);
});

test('shipping methods remain CSS-only across WooCommerce update_checkout fragment replacement', () => {
  assert.match(checkoutCss, /#shipping_method\.woocommerce-shipping-methods > li/);
  assert.match(checkoutCss, /\.woocommerce-Price-amount/);
  assert.match(woocommercePhp, /woocommerce_review_order_before_shipping/);
  assert.doesNotMatch(woocommercePhp, /wp_enqueue_script|wp_add_inline_script|update_checkout|updated_checkout/);
});

test('free-shipping progress is deferred because the cart has no shared threshold/subtotal progress source', () => {
  assert.doesNotMatch(cartPhp, /free.?shipping|env[ií]o gratis|shipping.?threshold|amount_for_free/i);
  assert.doesNotMatch(helpersPhp, /free.?shipping|env[ií]o gratis|shipping.?threshold|amount_for_free/i);
  assert.doesNotMatch(woocommercePhp, /free.?shipping|env[ií]o gratis|shipping.?threshold|amount_for_free/i);
});


test('shipping native review row becomes a full-width checkout-only block without removing WooCommerce nodes', () => {
  const row = 'tr.woocommerce-shipping-totals.shipping';
  const table = '.woocommerce-checkout-review-order-table';
  assert.match(checkoutCss, new RegExp(table.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + ' ' + row.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '\\s*\\{[^}]*display:\\s*block;[^}]*width:\\s*100%;', 's'));
  assert.match(checkoutCss, /\.woocommerce-checkout-review-order-table tr\.woocommerce-shipping-totals\.shipping > th\s*\{\s*display:\s*none;/);
  assert.match(checkoutCss, /\.woocommerce-checkout-review-order-table tr\.woocommerce-shipping-totals\.shipping > td\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;/s);
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\)/);
  assert.doesNotMatch(checkoutCss, /\.woocommerce-cart[^\n]*woocommerce-shipping-totals/);
});

test('shipping native list and each method card use the complete review rail width', () => {
  assert.match(checkoutCss, /\.woocommerce-checkout-review-order-table #shipping_method\.woocommerce-shipping-methods\s*\{[^}]*display:\s*grid;[^}]*width:\s*100%;/s);
  assert.match(checkoutCss, /#shipping_method\.woocommerce-shipping-methods > li\s*\{[^}]*display:\s*grid;[^}]*width:\s*100%;[^}]*min-width:\s*0;/s);
  assert.match(checkoutCss, /grid-template-columns:\s*18px\s+minmax\(0, 1fr\)\s+auto/);
  assert.match(checkoutCss, /li > label\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s+auto/);
});

test('shipping labels never use forced mid-word wrapping or narrow fixed widths', () => {
  assert.match(checkoutCss, /word-break:\s*normal/);
  assert.match(checkoutCss, /overflow-wrap:\s*normal/);
  assert.doesNotMatch(checkoutCss, /overflow-wrap:\s*anywhere|word-break:\s*break-all/);
  assert.doesNotMatch(checkoutCss, /#shipping_method[^}]*max-width:\s*\d+px/);
});

test('shipping native th is visually suppressed but the native row, radios and labels are not replaced', () => {
  assert.match(checkoutCss, /tr\.woocommerce-shipping-totals\.shipping > th\s*\{\s*display:\s*none;/);
  assert.doesNotMatch(woocommercePhp, /<input[^>]+type=["']radio|shipping_method\[[^]]+\]\s*=/i);
  assert.doesNotMatch(woocommercePhp, /woocommerce_package_rates|woocommerce_shipping_rate_cost|woocommerce_shipping_methods/);
  assert.doesNotMatch(woocommercePhp, /appendChild|insertBefore|insertAdjacentElement|update_checkout|updated_checkout/);
});

test('shipping section remains in the native order-review hook position and is not DOM-reordered', () => {
  assert.match(woocommercePhp, /woocommerce_review_order_before_shipping', 'cr2026_checkout_render_shipping_heading'/);
  assert.doesNotMatch(woocommercePhp, /appendChild|insertBefore|insertAdjacentElement/);
  // WooCommerce prints the shipping row in the order-review table after subtotal;
  // moving it ahead of the summary would require replacing the core review template.
  assert.match(checkoutCss, /woocommerce-checkout-review-order-table/);
});

test('shipping checkout layout changes are isolated from cart shipping presentation', () => {
  assert.doesNotMatch(checkoutCss, /\.woocommerce-cart\s+\.woocommerce-checkout-review-order-table/);
  assert.match(checkoutCss, /body\.woocommerce-checkout:not\(\.woocommerce-order-received\)/);
});
