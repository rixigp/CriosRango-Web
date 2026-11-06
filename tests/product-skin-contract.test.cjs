const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const setup = fs.readFileSync(path.join(theme, 'inc/setup.php'), 'utf8');
const functions = fs.readFileSync(path.join(theme, 'functions.php'), 'utf8');
const assets = fs.readFileSync(path.join(theme, 'inc/assets.php'), 'utf8');
const skin = fs.readFileSync(path.join(theme, 'inc/product-skin.php'), 'utf8');
const skinCss = fs.readFileSync(path.join(theme, 'assets/css/product-detail-skin.css'), 'utf8');
const productUiJs = fs.readFileSync(path.join(theme, 'assets/js/product-ui-enhancements.js'), 'utf8');

test('no custom single-product template or replacement Product Detail engine exists', () => {
  assert.equal(fs.existsSync(path.join(theme, 'single-product.php')), false);
  assert.equal(fs.existsSync(path.join(theme, 'assets/js/product-detail.js')), false);
  assert.doesNotMatch(functions, /product-detail\.js/);
  assert.doesNotMatch(assets, /product-detail\.js/);
});

test('WooCommerce native gallery, zoom, lightbox, slider, variation form, quantity and submit stay native', () => {
  for (const support of ['woocommerce', 'wc-product-gallery-zoom', 'wc-product-gallery-lightbox', 'wc-product-gallery-slider']) {
    assert.ok(setup.includes("add_theme_support( '" + support + "' )"), support + ' support remains');
  }
  assert.ok(skinCss.includes('.woocommerce-product-gallery'));
  assert.ok(skinCss.includes('.variations select'));
  assert.ok(skinCss.includes('.quantity input.qty'));
  assert.ok(skinCss.includes('.single_add_to_cart_button'));
  assert.doesNotMatch(skin, /remove_action\([^\n]*(?:woocommerce_single_variation|woocommerce_before_add_to_cart_form|woocommerce_before_add_to_cart_button|woocommerce_after_add_to_cart_button)/);
  assert.doesNotMatch(skin, /remove_action\([^\n]*woocommerce_template_single_add_to_cart/);
});

test('product detail stylesheet is enqueued only on is_product pages', () => {
  assert.match(assets, /\$uses_product_detail_skin\s*=\s*function_exists\( 'is_product' \) && is_product\(\)/);
  assert.match(assets, /if \( \$uses_product_detail_skin \) \{[\s\S]*?cr2026-product-detail-skin[\s\S]*?product-detail-skin\.css/s);
  assert.match(assets, /cr2026_asset_version\( 'assets\/css\/product-detail-skin\.css' \)/);
});

test('toolbar is presentational, uses approved category classes and standard shop navigation', () => {
  assert.match(skin, /woocommerce_before_single_product/);
  assert.match(skin, /cr-parent-category__toolbar/);
  assert.match(skin, /cr-parent-category__back/);
  assert.match(skin, /cr-parent-category__title/);
  assert.match(skin, /cr2026_shop_url\(\)/);
  assert.doesNotMatch(skin, /history\.back|window\.history|javascript:/);
});

test('legacy breadcrumb, product meta, related and upsell presentations are removed product-scoped', () => {
  assert.match(skin, /if \( ! is_product\(\) \) \{[\s\S]*?return;[\s\S]*?remove_action/s);
  assert.match(skin, /remove_action\( 'woocommerce_before_main_content', 'woocommerce_breadcrumb', 20 \)/);
  assert.match(skin, /remove_action\( 'woocommerce_sidebar', 'woocommerce_get_sidebar', 10 \)/);
  assert.match(skin, /remove_action\( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_sale_flash', 10 \)/);
  assert.match(skin, /add_action\( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_sale_flash', 30 \)/);
  assert.match(setup, /add_theme_support\( 'wc-product-gallery-slider' \)/);
  assert.match(skin, /remove_action\( 'woocommerce_single_product_summary', 'woocommerce_template_single_meta', 40 \)/);
  assert.match(skin, /remove_action\( 'woocommerce_after_single_product_summary', 'woocommerce_upsell_display', 15 \)/);
  assert.match(skin, /remove_action\( 'woocommerce_after_single_product_summary', 'woocommerce_output_related_products', 20 \)/);
  assert.match(skinCss, /\.additional_information_tab/);
  assert.match(skinCss, /#tab-additional_information/);
  assert.match(skinCss, /\.cr-footer \{\s*display: none !important/s);
});

test('sale badge, price, notices and native controls receive presentation-only CSS', () => {
  assert.match(skin, /function cr2026_product_skin_sale_label/);
  assert.match(skin, /return 'OFERTA'/);
  assert.match(skinCss, /span\.onsale/);
  assert.match(skinCss, /p\.price ins/);
  assert.match(skinCss, /p\.price del/);
  assert.match(skinCss, /woocommerce-message/);
  assert.match(skinCss, /variations select/);
  assert.match(skinCss, /reset_variations/);
  assert.match(skinCss, /input\.qty/);
  assert.match(skinCss, /single_add_to_cart_button/);
});

test('native description HTML remains intact and is only styled', () => {
  assert.doesNotMatch(skin, /the_content\s*\(|get_description\s*\(|wp_kses|DOMDocument/);
  assert.doesNotMatch(skin, /add_action\([^\n]*woocommerce_single_product_summary[^\n]*(?:quantity|cart|variation)/i);
  assert.match(skinCss, /woocommerce-product-details__short-description/);
  assert.match(skinCss, /\.woocommerce-product-details__short-description u \{\s*text-decoration: none;\s*\}/s);
  assert.doesNotMatch(skinCss, /woocommerce-product-details__short-description a(?::visited|:hover|:focus)?\s*,?/);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-main--woocommerce \{[^}]*padding: 0;/s);
  assert.doesNotMatch(skinCss, /body\.cr-product-detail-app \.cr-main--woocommerce \{[^}]*padding: 0 0 calc\(var\(--cr-bottom-nav/s);
  assert.match(skinCss, /woocommerce-Tabs-panel/);
  assert.match(skinCss, /--cr-bottom-nav[\s\S]*?env\(safe-area-inset-bottom\)/);
});

test('WPLoyalty promotional output is hidden by scoped wrapper CSS only', () => {
  assert.match(skinCss, /body\.cr-product-detail-app[\s\S]*?\.wlr-product-message/);
  assert.match(skinCss, /\.wlr-product-points-message/);
  assert.doesNotMatch(skin, /wployalty|wlr/i);
});




test('logged-out mobile Product Detail uses the approved header and toolbar baseline; admin-session geometry is accepted', () => {
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-app-header\s*\{[^}]*position: sticky !important;[^}]*top: 0 !important;/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-product-detail-toolbar\s*\{\s*position: sticky;\s*top: var\(--cr-app-topbar-height, 64px\);/);
  // KNOWN_ADMIN_SESSION_UI_BUG=ACCEPTED; admin offsets are deliberately not asserted.
});


test('gallery dots delegate to native FlexSlider and preserve WooCommerce gallery features', () => {
  assert.ok(productUiJs.includes('woocommerce-product-gallery'));
  assert.ok(productUiJs.includes('flexslider(index)'));
  assert.ok(productUiJs.includes('flex-control-thumbs'));
  assert.ok(skinCss.includes('cr-product-gallery-dots'));
  assert.ok(skinCss.includes('cr-product-ui-enhanced .woocommerce-product-gallery .flex-control-thumbs'));
  assert.ok(setup.includes('wc-product-gallery-zoom'));
  assert.ok(setup.includes('wc-product-gallery-lightbox'));
  assert.ok(setup.includes('wc-product-gallery-slider'));
});

test('share and WhatsApp reservation use product permalink and native selected attributes', () => {
  assert.ok(skin.includes('cr-product-share'));
  assert.ok(skin.includes('cr-product-reserve'));
  assert.ok(skin.includes('get_permalink'));
  assert.ok(productUiJs.includes('navigator.share'));
  assert.ok(productUiJs.includes('navigator.clipboard'));
  assert.ok(productUiJs.includes('wa.me/34633246788'));
  assert.ok(productUiJs.includes('variationId.value'));
  assert.ok(productUiJs.includes('select.value'));
  assert.ok(productUiJs.includes('select.options[select.selectedIndex]'));
});

test('variation chips are native select proxies and do not implement variation matching', () => {
  assert.ok(productUiJs.includes('table.variations select'));
  assert.ok(productUiJs.includes('select.value = option.value'));
  assert.ok(productUiJs.includes('dispatchNativeChange(select)'));
  assert.ok(productUiJs.includes('woocommerce_update_variation_values'));
  assert.ok(productUiJs.includes('option.disabled'));
  assert.equal(productUiJs.includes('variation_id.value ='), false);
  assert.equal(productUiJs.includes('variation.variation_id'), false);
  assert.equal(productUiJs.includes('variation.attributes'), false);
});

test('quantity stepper delegates to the existing WooCommerce quantity input', () => {
  assert.ok(productUiJs.includes('form.cart .quantity input.qty'));
  assert.ok(productUiJs.includes('input.stepDown()'));
  assert.ok(productUiJs.includes('input.stepUp()'));
  assert.ok(productUiJs.includes('dispatchNativeChange(input)'));
  assert.equal(productUiJs.includes('fetch('), false);
  assert.equal(productUiJs.includes('XMLHttpRequest'), false);
  assert.equal(productUiJs.includes('add_to_cart'), false);
});

test('enhancements are progressive and the native add-to-cart button remains the only submit', () => {
  assert.ok(assets.includes('cr2026-product-ui-enhancements'));
  assert.ok(assets.includes('if ( $uses_product_detail_skin )'));
  assert.ok(productUiJs.includes("body.classList.add('cr-product-ui-enhanced')"));
  assert.ok(productUiJs.includes("body.classList.remove('cr-product-ui-enhanced')"));
  assert.ok(productUiJs.includes("form.querySelector('button.single_add_to_cart_button')"));
  assert.equal(productUiJs.includes("addEventListener('submit'"), false);
  assert.equal(productUiJs.includes('requestSubmit'), false);
  assert.equal(productUiJs.includes('fetch('), false);
  assert.equal(productUiJs.includes('XMLHttpRequest'), false);
  assert.ok(skinCss.includes('cr-product-ui-enhanced form.cart table.variations select'));
  assert.ok(skinCss.includes('cr-product-quantity-stepper'));
});
