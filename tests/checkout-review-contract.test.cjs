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

test('all native and extension-generated economic rows remain available', () => {
  for (const token of [
    'cart-subtotal', 'cart-discount', 'class="fee"', 'class="tax-rate',
    'class="tax-total"', 'class="order-total"',
    'foreach ( WC()->cart->get_coupons()', 'foreach ( WC()->cart->get_fees()',
    'get_tax_totals()', 'wc_cart_totals_subtotal_html()',
    'wc_cart_totals_coupon_html(', 'wc_cart_totals_fee_html(',
    'wc_cart_totals_taxes_total_html()', 'wc_cart_totals_order_total_html()',
    'woocommerce_review_order_before_order_total', 'woocommerce_review_order_after_order_total'
  ]) assert.ok(review.includes(token), 'missing dynamic WooCommerce summary contract: ' + token);
  assert.doesNotMatch(checkoutCss, /cr-checkout-summary-(?:products|totals)[^}]*display:\s*none/i);
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
  assert.match(checkoutCss, /\.cr-checkout-summary-products > tr\.cart_item > td\.product-name\s*\{[^}]*flex:\s*1 1 0;[^}]*min-width:\s*0;/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products > tr\.cart_item > td\.product-total\s*\{[^}]*flex:\s*0 0 auto;[^}]*white-space:\s*nowrap;/);
  assert.match(checkoutCss, /\.cr-checkout-summary-totals \.woocommerce-Price-amount\s*\{\s*white-space:\s*nowrap;/);
  assert.match(checkoutCss, /\.cr-checkout-summary-totals > tr > td\s*\{[^}]*white-space:\s*nowrap;/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products a\.remove[\s\S]*?text-decoration:\s*none/);
});

test('WooCommerce includes-tax detail stays secondary and full-width beneath the total', () => {
  assert.match(checkoutCss, /tr\.order-total > td > small\.includes_tax\s*\{[^}]*display:\s*block;[^}]*flex:\s*1 0 100%;[^}]*color:\s*var\(--cr-muted\)/);
  assert.match(checkoutCss, /tr\.order-total > td > strong[\s\S]*?white-space:\s*nowrap/);
});

test('summary card consumes global border, radius and canonical rail with mobile-safe wrapping', () => {
  assert.match(checkoutCss, /\.cr-checkout-summary-products\s*,[\s\S]*?\.cr-checkout-summary-totals\s*\{[\s\S]*?margin-inline:\s*var\(--cr-card-inline-inset\)/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products\s*\{[\s\S]*?border:\s*var\(--cr-card-border-width\) solid var\(--cr-border\)/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products\s*\{[\s\S]*?border-radius:\s*var\(--cr-card-radius\)/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products > tr\.cart_item > td\.product-name/);
  assert.match(checkoutCss, /\.cr-checkout-summary-products > tr\.cart_item > td\.product-total/);
  assert.match(checkoutCss, /\.cr-checkout-summary-totals > tr\.order-total/);
  assert.match(checkoutCss, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.cr-checkout-summary-products > tr/);
  assert.doesNotMatch(checkoutCss, /\.cr-checkout-summary-(?:products|totals)[^}]*border-(?:left|right):/);
});
