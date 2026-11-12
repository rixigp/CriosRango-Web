const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'theme/crios-rango-2026/woocommerce/myaccount/view-order.php');
const presentationPath = path.join(root, 'theme/crios-rango-2026/inc/account-presentation.php');
const cssPath = path.join(root, 'theme/crios-rango-2026/assets/css/account.css');
const template = fs.readFileSync(templatePath, 'utf8');
const presentation = fs.readFileSync(presentationPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const mobileTemplate = template.split("$created = $order->get_date_created();")[1] || '';

test('mobile order detail uses canonical toolbar title and rail', () => {
  assert.match(presentation, /cr2026_account_view_order_endpoint_toolbar[\s\S]*?\$title = __\( 'Detalle de pedido'/);
  assert.match(presentation, /cr2026_account_render_endpoint_toolbar\( \$title, wc_get_account_endpoint_url\( 'orders' \) \)/);
  assert.match(template, /class="cr-order-detail"/);
  assert.match(css, /\.cr-order-detail\s*\{[^}]*width:100%; max-width:none; margin:0;/);
  assert.match(css, /\.cr-order-detail__card\s*\{[^}]*width:min\(calc\(100% - 40px\),720px\)[^}]*margin-inline:auto/);
  assert.doesNotMatch(css, /\.cr-order-detail\s*\{[^}]*max-width:\s*720px/);
});

test('mobile endpoint replaces legacy order table and paragraph visually', () => {
  assert.match(template, /if \( ! function_exists\( 'wp_is_mobile' \)[\s\S]*?do_action\( 'woocommerce_order_details_table', \$order_id \)/);
  assert.match(template, /if \( ! function_exists\( 'wp_is_mobile' \)[\s\S]*?return;/);
  assert.doesNotMatch(mobileTemplate, /<h2>\s*<\?php esc_html_e\( 'Order details'/);
  assert.match(template, /cr-order-detail__card--header/);
  assert.match(template, /cr-order-detail__card--products/);
  assert.match(template, /cr-order-detail__card--delivery/);
  assert.match(template, /cr-order-detail__card--payment/);
  assert.match(template, /cr-order-detail__card--summary/);
});

test('products show the base product name and formatted variation metadata without a line price', () => {
  assert.match(template, /\$items = \$order->get_items\( 'line_item' \)/);
  assert.match(template, /\$item_count = count\( \$items \)/);
  assert.match(template, /\$item->get_name\(\)/);
  assert.match(template, /\$parent_product->get_name\(\)/);
  assert.match(template, /\$item->get_formatted_meta_data\(\)/);
  assert.match(template, /implode\( ' · ', \$meta_values \)/);
  assert.match(template, /\$item->get_quantity\(\)/);
  const productsCard = template.split('cr-order-detail__card--products')[1].split('</article>')[0];
  assert.match(productsCard, /\$product_name/);
  assert.match(productsCard, /\$variation_summary/);
  assert.match(productsCard, /Cantidad:/);
  assert.doesNotMatch(productsCard, /get_formatted_line_subtotal|cr-order-detail__price/);
  assert.match(template, /\$candidate->get_image_id\(\)/);
  assert.match(template, /wp_attachment_is_image\( \$attachment_id \)/);
  assert.match(template, /wp_get_attachment_image_url\( \$attachment_id, 'woocommerce_thumbnail' \)/);
  assert.match(template, /alt="" loading="lazy" decoding="async"/);
  assert.match(css, /object-fit:cover/);
});

test('pickup label and location are separate and pickup never shows free shipping', () => {
  const deliveryCard = template.split('cr-order-detail__card--delivery')[1].split('</article>')[0];
  assert.match(deliveryCard, /Recogida en tienda/);
  assert.match(deliveryCard, /\$pickup_location/);
  assert.match(deliveryCard, /if \( ! \$pickup \)/);
  assert.doesNotMatch(deliveryCard, /\$store_label \?/);
  assert.match(template, /preg_replace\( '\/\^\(\?:recogida/);
});

test('delivery and payment are presentation-only and sourced from the order', () => {
  assert.match(template, /\$order->get_shipping_method\(\)/);
  assert.match(template, /\$order->get_formatted_shipping_address\(\)/);
  assert.match(template, /\$order->get_shipping_total\(\)/);
  assert.match(template, /\$order->get_payment_method_title\(\)/);
  assert.match(template, /\$order->get_payment_method\(\)/);
  assert.match(template, /Tarjeta/);
  assert.match(template, /Bizum/);
});

test('economic summary displays order-owned amounts without manual recalculation', () => {
  for (const method of ['get_subtotal', 'get_discount_total', 'get_fees', 'get_total_tax', 'get_formatted_order_total', 'get_currency']) {
    assert.match(template, new RegExp('\\$order->' + method + '\\('));
  }
  assert.match(template, /wc_price\( \$order->get_subtotal\(\)/);
  assert.match(template, /wc_price\( \$order->get_discount_total\(\)/);
  assert.match(template, /wc_price\( \$fee->get_total\(\)/);
  assert.match(template, /wc_price\( \$order->get_total_tax\(\)/);
});

test('payment, tax and summary remain order-sourced and the canonical toolbar remains intact', () => {
  const paymentCard = template.split('cr-order-detail__card--payment')[1].split('</article>')[0];
  const summaryCard = template.split('cr-order-detail__card--summary')[1].split('</article>')[0];
  assert.match(paymentCard, /\$payment_title/);
  assert.match(summaryCard, /get_subtotal/);
  assert.match(summaryCard, /get_total_tax/);
  assert.match(summaryCard, /get_formatted_order_total/);
  assert.match(presentation, /cr2026_account_render_endpoint_toolbar\( \$title, wc_get_account_endpoint_url\( 'orders' \) \)/);
});
