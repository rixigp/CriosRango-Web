const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'theme', 'crios-rango-2026');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('custom product template owns composition and does not delegate to Woo content template', () => {
  const php = read('single-product.php');
  assert.match(php, /cr-product-toolbar/);
  assert.match(php, /data-cr-product-gallery/);
  assert.match(php, /data-cr-product-share/);
  assert.match(php, /data-cr-product-reserve/);
  assert.doesNotMatch(php, /wc_get_template_part\s*\(\s*['"]content['"]\s*,\s*['"]single-product/);
  assert.doesNotMatch(php, /woocommerce_output_product_data_tabs|woocommerce_output_related_products/);
});

test('native WooCommerce variable form remains the variation and add-to-cart authority', () => {
  const php = read('single-product.php');
  assert.match(php, /class="variations_form cart/);
  assert.match(php, /data-product_variations/);
  assert.match(php, /wc_dropdown_variation_attribute_options/);
  assert.match(php, /name="variation_id" class="variation_id"/);
  assert.match(php, /single_add_to_cart_button/);
});

test('product assets are enqueued only on product pages', () => {
  const php = read('inc/assets.php');
  assert.match(php, /is_product\(\)[\s\S]*product-detail\.css/);
  assert.match(php, /is_product\(\)[\s\S]*product-detail\.js/);
});

test('product-only controller covers gallery, share, reserve, Woo variation events and quantity', () => {
  const js = read('assets/js/product-detail.js');
  for (const token of ['data-cr-gallery-dot', 'navigator.share', 'wa.me/34633246788', 'found_variation', 'reset_data', 'data-cr-quantity-plus']) {
    assert.ok(js.includes(token), 'missing product contract token: ' + token);
  }
});
