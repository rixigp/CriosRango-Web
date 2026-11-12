'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const php = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/woocommerce/myaccount/orders.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/account.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/js/account-orders.js'), 'utf8');
const helpers = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/helpers.php'), 'utf8');

test('MOBILE_ORDERS_USE_CANONICAL_TOOLBAR', () => {
  assert.match(php, /cr2026_render_category_toolbar\(\s*__\(\s*'Pedidos'/);
  assert.match(helpers, /cr-parent-category__toolbar/);
  assert.match(helpers, /cr-parent-category__back/);
  assert.match(helpers, /cr-parent-category__title/);
  assert.match(php, /cr-account-orders-title/);
});

test('ORDER_FILTERS_MATCH_APP_COPY_AND_ORDER', () => {
  const filters = [...php.matchAll(/data-cr-order-filter="([^"]+)"[^>]*>\s*<\?php esc_html_e\( '([^']+)'/g)]
    .map(m => ({ key: m[1], label: m[2] }));
  assert.deepEqual(filters, [
    { key: 'all', label: 'Todos' },
    { key: 'waiting', label: 'En espera' },
    { key: 'processing', label: 'Procesando' },
    { key: 'completed', label: 'Completado' },
    { key: 'refunded', label: 'Reembolsado' },
    { key: 'cancelled', label: 'Cancelado' },
  ]);
  assert.match(css, /\.cr-account-orders__filters\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto;/s);
  assert.match(css, /\.cr-account-orders__filters button\s*\{[^}]*flex:\s*0 0 auto;[^}]*white-space:\s*nowrap;/s);
  assert.match(js, /data-cr-order-filter/);
  assert.match(js, /setAttribute\('aria-pressed'/);
});

test('ORDER_CARD_USES_NATIVE_ORDER_NUMBER_DATE_TOTAL_STATUS_IMAGE_AND_DETAIL_ACTION', () => {
  assert.match(php, /\$order->get_order_number\(\)/);
  assert.match(php, /\$order->get_date_created\(\)/);
  assert.match(php, /wc_format_datetime\(\s*\$created,\s*'d-m-Y'\s*\)/);
  assert.match(php, /\$order->get_formatted_order_total\(\)/);
  assert.match(php, /wc_get_order_status_name\(\s*\$status\s*\)/);
  assert.match(php, /<img src="<?php echo esc_url\( \$image_url \); ?>" alt="" loading="lazy"/);
  assert.match(php, /get_view_order_url\(\)/);
  assert.match(php, /esc_html_e\( 'Ver detalle'/);
  assert.match(php, /cr-account-order__view/);
  assert.doesNotMatch(php, /get_item_count\(\)|cr-account-order__product/);
});

test('ORDER_IMAGE_RESOLUTION_USES_FIRST_VALID_PRODUCT_AND_VARIATION_PARENT_FALLBACK', () => {
  assert.match(php, /\$order_item instanceof WC_Order_Item_Product/);
  assert.match(php, /\$candidate_product instanceof WC_Product/);
  assert.match(php, /\$first_product->get_image_id\(\)/);
  assert.match(php, /\$first_product->is_type\( 'variation' \)/);
  assert.match(php, /wc_get_product\( \$first_product->get_parent_id\(\) \)/);
  assert.match(php, /\$parent_product->get_image_id\(\)/);
  assert.match(php, /wp_get_attachment_image_url\( \$image_id, 'woocommerce_thumbnail' \)/);
  assert.match(php, /wp_http_validate_url\( \$resolved_image_url \)/);
  assert.match(php, /cr-account-order__placeholder/);
  assert.match(js, /root\.addEventListener\('error'/);
  assert.match(js, /image\.hidden = true/);
  assert.match(php, /alt="" loading="lazy"/);
});

test('ORDER_CARD_APP_VISUAL_CONTRACT_REMOVES_OUTLINED_DETAIL_BUTTON', () => {
  assert.match(css, /\.cr-account-order\s*\{[^}]*border:[^;]+;[^}]*border-radius:\s*16px;[^}]*background:\s*#fff;[^}]*box-shadow:/s);
  assert.match(css, /\.cr-account-order__thumbnail\s*\{[^}]*width:\s*64px;[^}]*height:\s*64px;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.cr-account-order__view\s*\{[^}]*text-decoration:\s*none;/s);
  assert.doesNotMatch(css, /\.cr-account-order__view[^}]*border:\s*1px solid/i);
  assert.match(php, /<div class="cr-account-order__bottom">\s*<a class="cr-account-order__view"/);
  assert.match(php, /<span aria-hidden="true">›<\/span>/);
});
