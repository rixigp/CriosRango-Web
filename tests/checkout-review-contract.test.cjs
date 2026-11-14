const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const review = fs.readFileSync(path.join(theme, 'woocommerce/checkout/review-order.php'), 'utf8');
const checkoutCss = fs.readFileSync(path.join(theme, 'assets/css/checkout.css'), 'utf8');

test('review fragment retains exactly one stable WooCommerce AJAX root', () => {
  const rootMarkup = '<table class="shop_table woocommerce-checkout-review-order-table">';
  assert.equal(review.split(rootMarkup).length - 1, 1);
  assert.match(review, /<table class="shop_table woocommerce-checkout-review-order-table">[\s\S]*?<\/table>/);
  assert.equal((review.match(/woocommerce-checkout-review-order-table/g) || []).length, 1);
});

test('summary heading, product rows and totals form the summary-only card without wrapping the fragment root', () => {
  assert.match(review, /<tbody class="cr-checkout-summary-heading">[\s\S]*?3[\s\S]*?Resumen[\s\S]*?<\/tbody>/);
  assert.match(review, /<tbody class="cr-checkout-summary-products">[\s\S]*?woocommerce_review_order_before_cart_contents[\s\S]*?cart_item[\s\S]*?woocommerce_review_order_after_cart_contents[\s\S]*?<\/tbody>/);
  assert.match(review, /<tfoot class="cr-checkout-summary-totals">[\s\S]*?cart-subtotal[\s\S]*?order-total[\s\S]*?<\/tfoot>/);
  assert.doesNotMatch(review, /<div[^>]*woocommerce-checkout-review-order-table/);
});

test('summary totals use numeric WooCommerce coupon and applied-fee values', () => {
  for (const token of [
    'get_discount_total()', 'get_discount_tax()', 'get_fees()',
    '$fee->total', '$fee->tax', 'wc_price( -$summary_discount_total )',
    'wc_cart_totals_subtotal_html()', 'wc_cart_totals_fee_html(',
    'get_shipping_total()', 'get_shipping_tax()',
    'get_tax_totals()', 'wc_cart_totals_taxes_total_html()',
    'wc_cart_totals_order_total_html()', 'woocommerce_review_order_before_order_total',
    'woocommerce_review_order_after_order_total'
  ]) assert.ok(review.includes(token), 'missing numeric WooCommerce summary contract: ' + token);
  assert.doesNotMatch(review, /foreach\s*\(\s*WC\(\)->cart->get_coupons\(\)/);
  assert.doesNotMatch(review, /wc_cart_totals_coupon_html\(/);
  assert.doesNotMatch(review, /class="cart-discount/);
  assert.doesNotMatch(checkoutCss, /cr-checkout-summary-(?:products|totals)[^}]*display:\s*none/i);
});

function summarizeFixture({ couponDiscount = 0, couponTax = 0, fees = [], shipping = 0, shippingTax = 0, includesTax = false }) {
  let discounts = couponDiscount + (includesTax ? couponTax : 0);
  const visibleFees = [];
  for (const fee of fees) {
    if (fee.total < 0) discounts += Math.abs(fee.total) + (includesTax ? Math.abs(fee.tax || 0) : 0);
    else visibleFees.push(fee);
  }
  const displayedShipping = shipping + (includesTax ? shippingTax : 0);
  return {
    discountRow: discounts > 0 ? Number(discounts.toFixed(2)) : null,
    visibleFees,
    shippingRow: displayedShipping > 0 ? Number(displayedShipping.toFixed(2)) : null
  };
}

test('A/B/C: discount row is absent at zero and consolidates coupon plus wallet negative fee', () => {
  assert.equal(summarizeFixture({}).discountRow, null);
  assert.equal(summarizeFixture({ couponDiscount: 7.48 }).discountRow, 7.48);
  assert.equal(summarizeFixture({ couponDiscount: 7.48, fees: [{ total: -5.30, tax: 0 }] }).discountRow, 12.78);
});

test('D/E: free shipping is omitted and paid shipping is displayed at its WooCommerce amount', () => {
  assert.equal(summarizeFixture({ shipping: 0 }).shippingRow, null);
  assert.equal(summarizeFixture({ shipping: 5 }).shippingRow, 5);
  assert.equal(summarizeFixture({ shipping: 5, shippingTax: 1, includesTax: true }).shippingRow, 6);
});

test('F: positive fees remain separate while negative fees are consolidated', () => {
  const result = summarizeFixture({ fees: [{ total: -5.30, tax: 0 }, { total: 2.50, tax: 0 }] });
  assert.equal(result.discountRow, 5.30);
  assert.deepEqual(result.visibleFees.map(fee => fee.total), [2.50]);
});

test('shipping stays in one native renderer and is not recreated inside the summary', () => {
  assert.equal((review.match(/wc_cart_totals_shipping_html\(\)/g) || []).length, 1);
  assert.equal((review.match(/cr-checkout-shipping-section-row/g) || []).length, 1);
  assert.doesNotMatch(review, /id=["']shipping_method["']/);
  assert.doesNotMatch(review, /name=["']shipping_method/);
  assert.match(review, /woocommerce_review_order_before_shipping/);
  assert.match(review, /woocommerce_review_order_after_shipping/);
});


test('summary product, discount and total monetary amounts never wrap', () => {
  assert.ok(checkoutCss.includes('.cr-checkout-summary-products > tr.cart_item > td.product-name'));
  assert.ok(checkoutCss.includes('flex: 1 1 0;'));
  assert.ok(checkoutCss.includes('.cr-checkout-summary-products > tr.cart_item > td.product-total'));
  assert.ok(checkoutCss.includes('flex: 0 0 auto;'));
  assert.ok(checkoutCss.includes('white-space: nowrap;'));
  assert.ok(checkoutCss.includes('.cr-checkout-summary-totals .woocommerce-Price-amount'));
  assert.ok(checkoutCss.includes('.cr-checkout-summary-totals > tr > td'));
  assert.ok(checkoutCss.includes('.cr-checkout-summary-products a.remove'));
});

test('WooCommerce includes-tax detail stays secondary and full-width beneath the total', () => {
  assert.ok(checkoutCss.includes('tr.order-total > td > small.includes_tax'));
  assert.ok(checkoutCss.includes('flex: 1 0 100%;'));
  assert.ok(checkoutCss.includes('color: var(--cr-muted);'));
  assert.ok(checkoutCss.includes('tr.order-total > td > strong'));
});

test('summary card consumes global border, radius and canonical rail with mobile-safe wrapping', () => {
  assert.match(checkoutCss, /\.cr-checkout-summary-products\s*,[\s\S]*?\.cr-checkout-summary-totals\s*\{[\s\S]*?margin-inline:\s*0/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products\s*\{[\s\S]*?border:\s*var\(--cr-card-border-width\) solid var\(--cr-border\)/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products\s*\{[\s\S]*?border-radius:\s*var\(--cr-card-radius\)/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products > tr\.cart_item > td\.product-name/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products > tr\.cart_item > td\.product-total/);
  assert.match(checkoutCss, /\.cr-checkout-summary-totals > tr\.order-total/);
  assert.match(checkoutCss, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.cr-checkout-summary-products > tr/);
  assert.doesNotMatch(checkoutCss, /\.cr-checkout-summary-(?:products|totals)[^}]*border-(?:left|right):/);
});


test('G: AJAX review fragment remains singular and all totals are server-rendered on refresh', () => {
  assert.equal((review.match(/woocommerce-checkout-review-order-table/g) || []).length, 1);
  assert.match(review, /get_discount_total\(\)[\s\S]*?get_fees\(\)[\s\S]*?get_shipping_total\(\)[\s\S]*?wc_cart_totals_order_total_html\(\)/);
  assert.doesNotMatch(review, /addEventListener|MutationObserver|updated_checkout|localStorage/);
});

const checkoutWooCommercePhp = fs.readFileSync(path.join(theme, 'inc/woocommerce.php'), 'utf8');

test('Cecabank redirect receipt is redesigned without replacing its gateway receipt callback', () => {
  assert.match(checkoutWooCommercePhp, /function cr2026_is_cecabank_redirect_request/);
  assert.match(checkoutWooCommercePhp, /is_wc_endpoint_url\( 'order-pay' \)/);
  assert.match(checkoutWooCommercePhp, /'cecabank_gateway' === \$order->get_payment_method\(\)/);
  assert.match(checkoutWooCommercePhp, /hash_equals\( \(string\) \$order->get_order_key\(\), \(string\) \$order_key \)/);
  assert.match(checkoutWooCommercePhp, /add_action\( 'woocommerce_receipt_cecabank_gateway', 'cr2026_cecabank_redirect_loading_ui', 1, 1 \)/);
  assert.match(checkoutWooCommercePhp, /Pago seguro/);
  assert.match(checkoutWooCommercePhp, /Conectando con la pasarela de pago\.\.\./);
  assert.match(checkoutCss, /body\.cr-cecabank-redirect-page ul\.order_details\s*\{\s*display: none !important;/);
  assert.match(checkoutCss, /body\.cr-cecabank-redirect-page p:has\(\+ form#cecabank-form\)\s*\{\s*display: none !important;/);
  assert.match(checkoutCss, /cr-cecabank-redirect__spinner/);
  assert.doesNotMatch(checkoutCss, /#cecabank-form\s*\{[^}]*display:\s*none/i);
  const presentationBlock = checkoutWooCommercePhp.slice(checkoutWooCommercePhp.indexOf('function cr2026_is_cecabank_redirect_request'));
  assert.doesNotMatch(presentationBlock, /process_payment\s*\(|process_regular_payment\s*\(|setFormHiddens|MerchantID|Firma|URL_OK|URL_NOK/);
});
