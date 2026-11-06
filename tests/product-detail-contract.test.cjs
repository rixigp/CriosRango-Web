const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'theme', 'crios-rango-2026');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('custom product template retains its own WooCommerce composition and gallery', () => {
  const php = read('single-product.php');
  assert.match(php, /cr2026_render_category_toolbar\s*\(/);
  assert.match(php, /data-cr-product-gallery/);
  assert.match(php, /data-cr-product-share/);
  assert.match(php, /data-cr-product-reserve/);
  assert.doesNotMatch(php, /cr-product-toolbar/);
  assert.doesNotMatch(php, /wc_get_template_part\s*\(\s*['"]content['"]\s*,\s*['"]single-product/);
  assert.doesNotMatch(php, /woocommerce_output_product_data_tabs|woocommerce_output_related_products/);
});

test('Product Detail reuses public uploads normalization without card CSS coupling', () => {
  const helpers = read('inc/helpers.php');
  const php = read('single-product.php');
  assert.match(helpers, /function cr2026_normalize_public_upload_url\s*\(/);
  assert.match(helpers, /function cr2026_normalize_attachment_image_attributes\s*\(/);
  assert.match(helpers, /function cr2026_product_card_image_attributes[\s\S]*?cr2026_normalize_attachment_image_attributes/);
  assert.match(helpers, /function cr2026_product_detail_image_attributes[\s\S]*?cr-product-gallery__image[\s\S]*?cr2026_normalize_attachment_image_attributes\s*\(\s*\$attr\s*,\s*\$attachment\s*,\s*false\s*\)/);
  assert.match(helpers, /function cr2026_normalize_attachment_image_attributes\s*\(\s*\$attr\s*,\s*\$attachment\s*,\s*\$canonicalize_src\s*=\s*true/);
  assert.match(helpers, /\$attr\[['"]srcset['"]\][\s\S]*?cr2026_normalize_public_upload_url/);
  assert.match(php, /wp_get_attachment_image\s*\(\s*\$image_id\s*,\s*['"]woocommerce_single['"]/);
  assert.doesNotMatch(php, /cr-product-card__image/);
});

test('variation image URLs are normalized in PHP before variation JSON serialization', () => {
  const detail = read('inc/product-detail.php');
  const php = read('single-product.php');
  assert.match(detail, /function cr2026_normalize_product_variation_image_urls\s*\(/);
  assert.match(detail, /full_src[\s\S]*?srcset[\s\S]*?cr2026_normalize_public_upload_url/);
  assert.match(php, /cr2026_normalize_product_variation_image_urls\s*\(\s*\$available_variations\s*\)/);
  assert.ok(php.indexOf('cr2026_normalize_product_variation_image_urls') < php.indexOf('wp_json_encode( $available_variations )'));
});

test('unusable attachment output falls back to WooCommerce placeholder', () => {
  const php = read('single-product.php');
  assert.match(php, /\$image_html\s*=\s*wp_get_attachment_image/);
  assert.match(php, /if\s*\(\s*\$image_html\s*\)/);
  assert.match(php, /wc_placeholder_img\s*\(\s*['"]woocommerce_single['"]/);
});

test('product toolbar reuses canonical category toolbar and has no invented controls', () => {
  const php = read('single-product.php');
  const css = read('assets/css/product-detail.css');
  assert.match(php, /cr2026_render_category_toolbar\s*\(/);
  assert.doesNotMatch(php, /cr-product-toolbar|♡/);
  assert.doesNotMatch(css, /\.cr-product-toolbar/);
});

test('product bottom inset reserves the exact global fixed-nav height at document scroll end', () => {
  const css = read('assets/css/product-detail.css');
  assert.match(css, /body\.single-product\s*\{\s*padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /body\.single-product\s+\.cr-product-detail\s*\{\s*padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  assert.doesNotMatch(css, /padding(?:-bottom)?\s*:[^;]*42px/);
});

test('product classic footer is omitted while shared navigation and wp_footer remain', () => {
  const footer = fs.readFileSync(path.join(root, 'footer.php'), 'utf8');
  assert.match(footer, /if\s*\(\s*!\s*is_product\(\)\s*&&[\s\S]*?<footer class="cr-footer">/);
  assert.match(footer, /<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/);
  assert.match(footer, /<\?php\s*wp_footer\(\);\s*\?>/);
  assert.doesNotMatch(footer, /if\s*\(\s*!\s*is_product\(\)\s*\)\s*\{[^}]*wp_footer/);
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

test('product-only controller retains existing gallery, share, reserve and Woo hooks', () => {
  const js = read('assets/js/product-detail.js');
  for (const token of ['data-cr-gallery-dot', 'navigator.share', 'wa.me/34633246788', 'found_variation', 'reset_data']) {
    assert.ok(js.includes(token), 'missing product contract token: ' + token);
  }
});


test('APP sale label is plain coral text rather than a badge or pill', () => {
  const css = read('assets/css/product-detail.css');
  assert.match(css, /\.cr-product-detail__sale\s*\{[^}]*background:transparent[^}]*\}/s);
  assert.match(css, /\.cr-product-detail__sale\s*\{[^}]*border-radius:0/s);
  assert.doesNotMatch(css, /\.cr-product-detail__sale\s*\{[^}]*border-radius:999px/s);
});

test('product title uses a light Roboto weight and prices render current before regular', () => {
  const css = read('assets/css/product-detail.css');
  const php = read('single-product.php');
  const detail = read('inc/product-detail.php');
  assert.match(css, /\.cr-product-detail__name\s*\{[^}]*font-family:Roboto[^}]*font-weight:300/s);
  assert.match(php, /cr2026_product_detail_price_html\s*\(\s*\$product\s*\)/);
  assert.match(detail, /\$current_html = wc_price\( \$current \)/);
  assert.match(detail, /return '<ins>' \.[\s\S]*?\$current_html[\s\S]*?'<\/ins> <del>'[\s\S]*?wc_price\( \$regular \)/);
  const js = read('assets/js/product-detail.js');
  assert.match(js, /renderPrice\(v\.display_price,v\.display_regular_price\)/);
  assert.ok(js.indexOf('amountMarkup(current)') < js.indexOf('amountMarkup(regular)'));
});

test('color choices render a swatch and retain their readable color label', () => {
  const php = read('single-product.php');
  const js = read('assets/js/product-detail.js');
  const css = read('assets/css/product-detail.css');
  assert.match(php, /cr-product-variation-swatch/);
  assert.match(php, /cr-product-variation-label/);
  assert.match(js, /swatchColor\(chip\.dataset\.label\)/);
  assert.match(css, /cr-product-variation-swatch[^}]*border-radius:50%/);
});

test('all native variation options stay represented and incompatible or globally unavailable chips are disabled', () => {
  const php = read('single-product.php');
  const js = read('assets/js/product-detail.js');
  assert.match(php, /foreach \( \$options as \$option \)/);
  assert.match(php, /wc_dropdown_variation_attribute_options/);
  assert.match(php, /name="variation_id" class="variation_id"/);
  assert.match(js, /chip\.disabled=!global\|\|!compatible/);
  assert.match(js, /\.trigger\('change'\)/);
  assert.match(js, /woocommerce_update_variation_values/);
  assert.match(js, /is-unavailable/);
  assert.match(js, /is-incompatible/);
});

test('variation reset restores the captured parent price, offer, stock and image state', () => {
  const js = read('assets/js/product-detail.js');
  assert.match(js, /parentPriceHtml=price\?\.innerHTML/);
  assert.match(js, /parentSaleHidden=parentSale\?parentSale\.hidden/);
  assert.match(js, /parentStockHtml=stock\?\.innerHTML/);
  assert.match(js, /parentImageState=parentImage\?/);
  assert.match(js, /reset_data hide_variation',restoreParentState/);
  assert.match(js, /parentSale\.hidden=parentSaleHidden/);
  assert.match(js, /price\.innerHTML=parentPriceHtml/);
});
