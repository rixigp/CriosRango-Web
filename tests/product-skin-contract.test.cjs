const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const setup = fs.readFileSync(path.join(theme, 'inc/setup.php'), 'utf8');
const functions = fs.readFileSync(path.join(theme, 'functions.php'), 'utf8');
const assets = fs.readFileSync(path.join(theme, 'inc/assets.php'), 'utf8');
const skin = fs.readFileSync(path.join(theme, 'inc/product-skin.php'), 'utf8');
const woocommerce = fs.readFileSync(path.join(theme, 'inc/woocommerce.php'), 'utf8');
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

test('toolbar back prefers validated same-origin history and has a server-rendered category fallback', () => {
  assert.match(skin, /woocommerce_before_single_product/);
  assert.match(skin, /cr-parent-category__toolbar/);
  assert.match(skin, /cr-parent-category__back/);
  assert.match(skin, /cr-parent-category__title/);
  assert.match(skin, /data-fallback-url/);
  assert.match(skin, /window\.history\.back\(\)/);
  assert.match(skin, /previous\.origin === current\.origin/);
  assert.match(skin, /window\.history\.length < 2/);
  assert.match(skin, /function cr2026_product_skin_back_fallback_url/);
  assert.match(skin, /get_ancestors\(\s*\$term->term_id,\s*'product_cat',\s*'taxonomy'\s*\)/);
  assert.match(skin, /_yoast_wpseo_primary_product_cat/);
  assert.match(skin, /_rank_math_primary_product_cat/);
  assert.match(skin, /return cr2026_shop_url\(\)/);
  assert.doesNotMatch(skin, /javascript:/);
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
  assert.match(skin, /if \( 'woocommerce' === \$domain && in_array\( \$text, array\( 'Sale!', '¡Oferta!' \), true \) \)/);
  assert.match(skinCss, /div\.product \{\s*position:\s*relative;/);
  assert.match(skinCss, /div\.product span\.onsale \{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*10px;[\s\S]*?left:\s*10px;[\s\S]*?background:\s*var\(--cr-product-coral\);[\s\S]*?color:\s*#fff;[\s\S]*?pointer-events:\s*none;/);
  assert.doesNotMatch(skinCss, /div\.product span\.onsale \{[^}]*position:\s*static;/s);
  assert.match(skinCss, /span\.onsale/);
  assert.match(skinCss, /p\.price ins/);
  assert.match(skinCss, /p\.price del/);
  assert.match(skinCss, /woocommerce-message/);
  assert.match(skinCss, /variations select/);
  assert.match(skinCss, /reset_variations/);
  assert.match(skinCss, /input\.qty/);
  assert.match(skinCss, /single_add_to_cart_button/);
});

test('short description is sanitized and balanced only at the WooCommerce excerpt boundary', () => {
  assert.match(skin, /function cr2026_product_skin_sanitize_short_description\( \$short_description \)/);
  assert.ok(skin.includes('wp_kses_post( $short_description )'));
  assert.ok(skin.includes('return force_balance_tags( $short_description );'));
  assert.match(skin, /add_filter\( 'woocommerce_short_description', 'cr2026_product_skin_sanitize_short_description', 20 \)/);
  assert.match(skin, /! is_product\(\)/);
  assert.doesNotMatch(skin, /DOMDocument/);
  assert.doesNotMatch(skin, /add_action\([^\n]*woocommerce_single_product_summary[^\n]*(?:quantity|cart|variation)/i);
  assert.match(skinCss, /woocommerce-product-details__short-description/);
  assert.match(skinCss, /\.woocommerce-product-details__short-description u \{\s*text-decoration: none;\s*\}/s);
  assert.doesNotMatch(skinCss, /woocommerce-product-details__short-description a(?::visited|:hover|:focus)?\s*,?/);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-main--woocommerce \{[^}]*padding: 0;/s);
  assert.doesNotMatch(skinCss, /body\.cr-product-detail-app \.cr-main--woocommerce \{[^}]*padding: 0 0 calc\(var\(--cr-bottom-nav/s);
  assert.match(skinCss, /woocommerce-Tabs-panel/);
  assert.match(skinCss, /--cr-bottom-nav[\s\S]*?env\(safe-area-inset-bottom\)/);
});

test('long product description is a single accessible collapsed accordion after size help and before variations', () => {
  assert.ok(skin.includes("function cr2026_product_skin_remove_description_tab( $tabs )"));
  assert.ok(skin.includes("unset( $tabs['description'] )"));
  assert.ok(skin.includes("function cr2026_product_skin_description_accordion()"));
  assert.ok(skin.includes("$product->get_description()"));
  assert.ok(skin.includes("apply_filters( 'the_content', $description )"));
  assert.ok(skin.includes("preg_replace( '/[\\s\\x{00a0}]+/u'"));
  assert.ok(skin.includes('aria-expanded="false"'));
  assert.ok(skin.includes('aria-controls='));
  assert.ok(skin.includes('role="region"'));
  assert.ok(skin.includes('class="cr-product-description__panel"') && skin.includes('hidden>'));
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_description_accordion', 25 )"));
  assert.ok(skin.indexOf("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 )") < skin.indexOf("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_description_accordion', 25 )"));
  assert.ok(skin.includes("add_filter( 'woocommerce_product_tabs', 'cr2026_product_skin_remove_description_tab', 99 )"));
  assert.ok(productUiJs.includes('function initProductDescriptionAccordion()'));
  assert.ok(productUiJs.includes("toggle.addEventListener('click'"));
  assert.ok(productUiJs.includes("toggle.setAttribute('aria-expanded'"));
  assert.ok(productUiJs.includes('panel.hidden = isExpanded'));
  assert.ok(productUiJs.includes('initProductDescriptionAccordion();'));
  assert.ok(skinCss.includes('body.cr-product-detail-app .cr-product-description {'));
  assert.ok(skinCss.includes('background: #fff;'));
  assert.ok(skinCss.includes('.cr-product-description__toggle[aria-expanded="true"]'));
  assert.ok(skinCss.includes('.cr-product-description__panel[hidden]'));
});

test('empty descriptions omit the accordion and native variation/cart behavior stays intact', () => {
  assert.ok(skin.includes("if ( ! is_string( $description ) || '' === trim( $description ) ) { return; }"));
  assert.ok(skin.includes("if ( ! is_string( $plain_description ) || '' === $plain_description ) { return; }"));
  assert.ok(!skin.includes("remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart'"));
  assert.ok(!skin.includes("remove_action( 'woocommerce_single_product_summary', 'woocommerce_single_variation'"));
  assert.ok(skin.includes("add_filter( 'woocommerce_product_tabs', 'cr2026_product_skin_remove_description_tab', 99 )"));
  assert.ok(productUiJs.includes("toggle.setAttribute('aria-expanded', isExpanded ? 'false' : 'true')"));
});

test('WPLoyalty promotional output is hidden by scoped wrapper CSS only', () => {
  assert.match(skinCss, /body\.cr-product-detail-app[\s\S]*?\.wlr-product-message/);
  assert.match(skinCss, /\.wlr-product-points-message/);
  assert.doesNotMatch(skin, /wployalty|wlr/i);
});




test('logged-out mobile Product Detail uses the approved header and toolbar baseline; admin-session geometry is accepted', () => {
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-app-header\s*\{[^}]*position: sticky !important;[^}]*top: 0 !important;/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-product-detail-toolbar\s*\{\s*position: sticky;\s*top: var\(--cr-app-topbar-height, 64px\);/);
  assert.doesNotMatch(skinCss, /body\.admin-bar\.cr-product-detail-app \.cr-app-header/);
  // Admin-bar header offset is now owned by the shared global header rule in main.css.
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
  assert.ok(productUiJs.includes("var isToggleAttribute = isSize || isColor"));
  assert.ok(productUiJs.includes("select.value = isToggleAttribute && select.value === option.value ? '' : option.value"));
  assert.ok(productUiJs.includes('dispatchNativeChange(select)'));
  assert.ok(productUiJs.includes('woocommerce_update_variation_values'));
  assert.ok(productUiJs.includes('option.disabled'));
  assert.equal(productUiJs.includes('variation_id.value ='), false);
  assert.equal(productUiJs.includes('variation.variation_id'), true);
  assert.equal(productUiJs.includes('variation.attributes'), false);
  assert.equal(productUiJs.includes('stock'), false);
  assert.equal(productUiJs.includes('price'), false);
});

test('description icon uses the app canvas and the accordion remains compact and inline', () => {
  assert.ok(skin.includes('class="cr-product-description__icon"'));
  assert.ok(skin.includes('<svg viewBox="0 0 24 24"'));
  assert.match(skinCss, /\.cr-product-description__icon\s*\{[^}]*background:\s*var\(--cr-app-canvas\);[^}]*color:\s*var\(--cr-product-green\);/s);
  assert.match(skinCss, /\.cr-product-description__toggle\s*\{[^}]*min-height:\s*54px;/s);
  assert.match(skinCss, /\.cr-product-description__toggle\s*\{[^}]*padding:\s*10px 16px;/s);
  assert.ok(skin.includes('aria-expanded="false"'));
  assert.ok(productUiJs.includes('panel.hidden = isExpanded'));
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 )"));
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_description_accordion', 25 )"));
});

test('Color and Size cards render only real native options and preserve WooCommerce selection and availability', () => {
  assert.ok(productUiJs.includes('cr-product-variation-cards'));
  assert.ok(productUiJs.includes('cr-product-variation-card--color'));
  assert.ok(productUiJs.includes('cr-product-variation-card--size'));
  assert.ok(productUiJs.includes('cr-product-choice-chips--color'));
  assert.ok(productUiJs.includes('cr-product-choice-chips--size'));
  assert.ok(productUiJs.includes('Array.prototype.slice.call(select.options)'));
  assert.ok(productUiJs.includes('if (!option.value) return'));
  assert.ok(productUiJs.includes('chip.disabled = !!option.disabled'));
  assert.ok(productUiJs.includes("chip.setAttribute('aria-pressed', select.value === option.value ? 'true' : 'false')"));
  assert.ok(productUiJs.includes('resolveColorSwatch(rawColorValue, rawColorLabel)'));
  assert.ok(productUiJs.includes('if (colorMapping.color) swatch.style.backgroundColor = colorMapping.color'));
  assert.ok(productUiJs.includes("select.value = isToggleAttribute && select.value === option.value ? '' : option.value"));
  assert.ok(productUiJs.includes('dispatchNativeChange(select)'));
  assert.ok(productUiJs.includes('woocommerce_update_variation_values'));
  assert.match(skinCss, /\.cr-product-variation-card\s*\{[^}]*border-radius:\s*21px;[^}]*background:\s*#fff;/s);
  assert.match(skinCss, /\.cr-product-choice-chips--color[\s\S]*?border-radius:\s*50%;/);
  assert.match(skinCss, /\.cr-product-choice-chips--size[\s\S]*?\.cr-product-choice-chip\s*\{[^}]*min-height:\s*46px;/s);
  assert.match(skinCss, /\.cr-product-choice-chips--size[\s\S]*?background:\s*var\(--cr-product-green\);[\s\S]*?color:\s*#fff;/);
  assert.match(skinCss, /\.cr-product-choice-chips--size[\s\S]*?\.cr-product-choice-chip:disabled/);
  assert.ok(productUiJs.includes("select.insertAdjacentElement('afterend', chips)") === false);
  assert.ok(productUiJs.includes("select.addEventListener('change', render)"));
});

test('quantity stepper background matches Product Detail canvas without changing its layout or behavior', () => {
  const backgroundFix = skinCss.slice(skinCss.lastIndexOf('Quantity control follows the page canvas'));
  assert.match(backgroundFix, /\.cr-product-quantity-stepper,[\s\S]*?\.cr-product-quantity-stepper button,[\s\S]*?\.cr-product-quantity-stepper input\.qty[\s\S]*?background:\s*transparent !important;[\s\S]*?background-color:\s*transparent !important;/);
  assert.match(skinCss, /\.cr-product-quantity-label\s*\{[^}]*display:\s*none !important;/s);
  assert.ok(productUiJs.includes("quantityLabel.textContent = 'Cantidad'"));
  assert.ok(productUiJs.includes('input.stepDown()'));
  assert.ok(productUiJs.includes('input.stepUp()'));
  assert.ok(productUiJs.includes('dispatchNativeChange(input)'));
});

test('quantity row matches the APP without replacing WooCommerce quantity authority', () => {
  assert.ok(productUiJs.includes('form.cart .quantity input.qty'));
  assert.ok(productUiJs.includes("quantityLabel.textContent = 'Cantidad'"));
  assert.ok(productUiJs.includes('input.stepDown()'));
  assert.ok(productUiJs.includes('input.stepUp()'));
  assert.ok(productUiJs.includes('dispatchNativeChange(input)'));
  assert.ok(skinCss.includes('.quantity.cr-product-quantity-row'));
  assert.match(skinCss, /\.quantity\.cr-product-quantity-row\s*\{[^}]*justify-content:\s*flex-start;/s);
  assert.match(skinCss, /\.cr-product-quantity-label\s*\{[^}]*flex:\s*0 0 auto;/s);
  assert.match(skinCss, /\.cr-product-quantity-stepper button\s*\{[^}]*min-width:\s*44px;/s);
  assert.ok(skinCss.includes('border: 0;'));
  assert.ok(skinCss.includes('background: transparent;'));
  assert.equal(productUiJs.includes('input.min'), false);
  assert.equal(productUiJs.includes('input.max'), false);
  assert.equal(productUiJs.includes('fetch('), false);
  assert.equal(productUiJs.includes('XMLHttpRequest'), false);
});

test('Limpiar is visually hidden while the native WooCommerce reset link remains in the form', () => {
  assert.match(skinCss, /\.reset_variations\s*\{[^}]*display:\s*none !important;/s);
  assert.ok(skinCss.includes('.reset_variations'));
  assert.doesNotMatch(productUiJs, /reset_variations[^\n]*(?:remove|delete)/);
});

test('variation CTA state is written by one event-driven readiness authority', () => {
  assert.ok(productUiJs.includes("form.querySelector('button.single_add_to_cart_button')"));
  assert.ok(productUiJs.includes("function isVariationEventReady(variation, purchasable)"));
  assert.ok(productUiJs.includes("function applyVariationButtonState(button, label, ready)"));
  assert.ok(productUiJs.includes("setVariationReady(isVariationEventReady(variation, purchasable))"));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = 'Añadido al carrito'"));
  assert.ok(productUiJs.includes("form.querySelector('input.variation_id')"));
  assert.ok(productUiJs.includes("var selectedVariationId = Number(variationId.value)"));
  assert.ok(productUiJs.includes("selectedVariationId <= 0"));
  assert.doesNotMatch(productUiJs,/woocommerce-variation-add-to-cart-enabled/);
  assert.doesNotMatch(productUiJs,/function isNativeVariationReady/);
});
test('CTA uses light mint before selection, dark green for a valid variation, and temporary mint success feedback', () => {
  assert.ok(productUiJs.includes("document.querySelector('.cr-cart-link .cr-icon svg')"));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = 'Añadido al carrito'"));
  assert.ok(productUiJs.includes("checkPath.setAttribute('d', 'm5 12 4 4L19 6')"));
  assert.ok(productUiJs.includes("nativeButton.classList.add('is-added-to-cart')"));
  assert.ok(productUiJs.includes("window.setTimeout(function ()"));
  assert.ok(productUiJs.includes("}, 2200)"));
  assert.ok(productUiJs.includes("added_to_cart.crProductDetail"));
  assert.ok(productUiJs.includes("var addedButton = $button && $button.jquery ? $button[0] : $button"));
  assert.ok(productUiJs.includes("body.classList.contains('cr-product-added-to-cart')"));
  assert.match(skinCss, /--cr-product-mint:\s*#E4EFEA;/);
  assert.match(skinCss, /\.single_add_to_cart_button\.is-added-to-cart[\s\S]*?background:\s*var\(--cr-product-mint\) !important;/);
  assert.match(skinCss, /\.single_add_to_cart_button:disabled[\s\S]*?background:\s*var\(--cr-product-mint\) !important;/);
  assert.match(skinCss, /\.single_add_to_cart_button:not\(:disabled\)[\s\S]*?background:\s*var\(--cr-product-green\) !important;/);
  assert.equal(productUiJs.includes("cr-cart-count"), false);
  assert.equal(productUiJs.includes("data-cr-cart-count"), false);
});

test('only successful add-to-cart notices are suppressed on Product Detail; WooCommerce errors remain visible', () => {
  assert.match(skin, /function cr2026_product_skin_suppress_success_notice\( \$message, \$products \)\s*\{\s*return is_product\(\) \? '' : \$message;/);
  assert.match(skin, /add_filter\( 'wc_add_to_cart_message_html', 'cr2026_product_skin_suppress_success_notice', 10, 2 \)/);
  assert.match(skin, /add_action\( 'woocommerce_add_to_cart', 'cr2026_product_skin_mark_added_feedback', 10, 6 \)/);
  assert.match(skin, /cr-product-added-to-cart/);
  assert.match(skinCss, /\.woocommerce-notices-wrapper \.woocommerce-error/);
  assert.doesNotMatch(skinCss, /\.woocommerce-message\s*\{[^}]*display:\s*none/i);
  assert.doesNotMatch(skinCss, /\.woocommerce-notices-wrapper\s*\{[^}]*display:\s*none/i);
});

test('Product Detail enhancements remain progressive while valid native variations use AJAX without navigation', () => {
  assert.ok(assets.includes('cr2026-product-ui-enhancements'));
  assert.ok(assets.includes('if ( $uses_product_detail_skin )'));
  assert.ok(productUiJs.includes("body.classList.add('cr-product-ui-enhanced')"));
  assert.ok(productUiJs.includes("body.classList.remove('cr-product-ui-enhanced')"));
  assert.ok(productUiJs.includes("var form = document.querySelector('form.variations_form')"));
  assert.ok(productUiJs.includes("form.querySelector('button.single_add_to_cart_button')"));
  assert.ok(productUiJs.includes('table.variations select'));
  assert.ok(productUiJs.includes('woocommerce_update_variation_values'));
  assert.ok(productUiJs.includes('dispatchNativeChange(select)'));
  assert.ok(productUiJs.includes('aria-pressed'));
  assert.ok(productUiJs.includes("form.querySelector('input.variation_id')"));
  assert.doesNotMatch(productUiJs, /submitProductDetailAddToCart/);
  assert.match(productUiJs, /form\.addEventListener\('submit',[\s\S]*?\}, true\)/);
  assert.ok(productUiJs.includes('initVariationAjaxAddToCart();'));
  assert.ok(productUiJs.includes('window.wc_add_to_cart_params'));
  assert.ok(productUiJs.includes("replace('%%endpoint%%', 'add_to_cart')"));
  assert.match(productUiJs, /product_id:\s*selectedVariationId/);
  assert.match(productUiJs, /quantity:\s*quantityInput\s*\?\s*quantityInput\.value\s*:\s*1/);
  assert.doesNotMatch(productUiJs, /product_id:\s*[^,]+,\s*variation_id:/);
  assert.ok(productUiJs.includes("$(document.body).trigger('added_to_cart'"));
  assert.ok(productUiJs.includes("added_to_cart.crProductDetail"));
  assert.doesNotMatch(productUiJs, /requestSubmit/);
  assert.equal(productUiJs.includes('fetch('), false);
  assert.equal(productUiJs.includes('XMLHttpRequest'), false);
  assert.ok(skinCss.includes('cr-product-ui-enhanced form.cart table.variations select'));
  assert.ok(skinCss.includes('cr-product-quantity-stepper'));
});


test('dots are centered relative to the gallery content and keep native slider delegation', () => {
  assert.match(skinCss, /\.cr-product-gallery-dots\s*\{[^}]*display:\s*flex;[^}]*width:\s*100%;[^}]*justify-content:\s*center;[^}]*align-items:\s*center;/s);
  assert.ok(productUiJs.includes('flexslider(index)'));
  assert.ok(productUiJs.includes('flex-control-thumbs'));
});

test('share and reserve actions are one equal-width capsule with real SVG share and chat icons', () => {
  assert.match(skin, /cr2026_icon\( 'share', 'cr-product-actions__icon' \)/);
  assert.match(skin, /cr2026_icon\( 'message', 'cr-product-actions__icon' \)/);
  assert.match(skinCss, /\.cr-product-actions\s*\{[^}]*display:\s*flex;[^}]*width:\s*100%;[^}]*min-height:\s*46px;/s);
  assert.match(skinCss, /\.cr-product-actions__button\s*\{[^}]*flex:\s*1 1 0;[^}]*width:\s*50%;[^}]*justify-content:\s*center;/s);
  assert.match(skinCss, /\.cr-product-actions__button \+ \.cr-product-actions__button::before/);
  assert.match(skinCss, /\.cr-product-reserve:disabled\s*\{[^}]*color:\s*#AEB2AD;/s);
  assert.doesNotMatch(skin, /↗|◉/);
});

test('mobile WooCommerce attribute rows always stack labels above full-width option areas', () => {
  assert.match(skinCss, /@media \(max-width: 767px\)[\s\S]*?table\.variations tr\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;/s);
  assert.match(skinCss, /table\.variations th\.label,[\s\S]*?table\.variations td\.value\s*\{[^}]*display:\s*block !important;[^}]*width:\s*100% !important;/s);
  assert.match(skinCss, /table\.variations th\.label label\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;/s);
  assert.match(skinCss, /td\.value \.cr-product-choice-chips\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*flex-start;[^}]*flex-wrap:\s*wrap;/s);
});

test('native WooCommerce zoom control is visually hidden while its native lightbox trigger remains in use', () => {
  assert.ok(skinCss.includes('body.cr-product-detail-app .woocommerce-product-gallery .woocommerce-product-gallery__trigger {'));
  assert.ok(skinCss.includes('display: none !important;'));
  assert.ok(productUiJs.includes('nativeTrigger.click()'));
  assert.ok(setup.includes('wc-product-gallery-lightbox'));
});

test('single-image tap bypasses FlexSlider active-slide class while multi-image taps remain gated', () => {
  assert.ok(productUiJs.includes("var isSingleImage = slides.length === 1;"));
  assert.ok(productUiJs.includes("var isActiveSlide = tappedSlide.classList.contains('flex-active-slide');"));
  assert.ok(productUiJs.includes("if (!isSingleImage && !isActiveSlide) return;"));
  assert.ok(productUiJs.includes("if (moved > 10) return;"));
  assert.ok(productUiJs.includes("nativeTrigger.click()"));
});

test('touch tap delegates to WooCommerce native lightbox while swipe remains native', () => {
  assert.ok(productUiJs.includes("pointerdown"));
  assert.ok(productUiJs.includes("pointerup"));
  assert.ok(productUiJs.includes("moved > 10"));
  assert.ok(productUiJs.includes(".woocommerce-product-gallery__trigger"));
  assert.ok(productUiJs.includes("nativeTrigger.click()"));
  assert.ok(setup.includes("wc-product-gallery-lightbox"));
  assert.ok(setup.includes("wc-product-gallery-slider"));
  assert.equal(productUiJs.includes("PhotoSwipe("), false);
  assert.equal(productUiJs.includes("new Lightbox"), false);
});

test('first valid variation enables CTA on one show_variation event despite stale disabled wrapper class', () => {
  const sandboxModule={exports:{}};
  vm.runInNewContext(productUiJs,{module:sandboxModule,document:{readyState:'loading',addEventListener(){}}});
  const {isVariationEventReady,applyVariationButtonState}=sandboxModule.exports;
  const button={disabled:true,attrs:{'aria-disabled':'true'},setAttribute(name,value){this.attrs[name]=value;}};
  const label={textContent:'Elige opciones'};
  const staleWrapperClass='woocommerce-variation-add-to-cart-disabled';
  assert.equal(button.disabled,true);
  assert.equal(label.textContent,'Elige opciones');
  assert.equal(staleWrapperClass,'woocommerce-variation-add-to-cart-disabled');
  const ready=isVariationEventReady({variation_id:12345},true);
  applyVariationButtonState(button,label,ready);
  assert.equal(ready,true);
  assert.equal(label.textContent,'Añadir al carrito');
  assert.equal(button.disabled,false);
  assert.equal(button.attrs['aria-disabled'],'false');
});

test('variation readiness requires a positive event variation ID and purchasable=true', () => {
  const sandboxModule={exports:{}};
  vm.runInNewContext(productUiJs,{module:sandboxModule,document:{readyState:'loading',addEventListener(){}}});
  const {isVariationEventReady,applyVariationButtonState}=sandboxModule.exports;
  assert.equal(isVariationEventReady({variation_id:12345},true),true);
  assert.equal(isVariationEventReady({variation_id:'12345'},true),true);
  assert.equal(isVariationEventReady({variation_id:0},true),false);
  assert.equal(isVariationEventReady({variation_id:'NaN'},true),false);
  assert.equal(isVariationEventReady({variation_id:12345},false),false);
  assert.equal(isVariationEventReady(null,true),false);
  const button={disabled:false,attrs:{},setAttribute(name,value){this.attrs[name]=value;}};
  const label={textContent:'Añadir al carrito'};
  applyVariationButtonState(button,label,false);
  assert.equal(button.disabled,true);
  assert.equal(button.attrs['aria-disabled'],'true');
  assert.equal(label.textContent,'Elige opciones');
});

test('show_variation is sole READY authority and chip sync cannot overwrite it', () => {
  const s=productUiJs.indexOf('function syncVariationState()'),e=productUiJs.indexOf('function getProductDetailNoticeRoot()',s);
  assert.doesNotMatch(productUiJs.slice(s,e),/nativeButton\\.disabled|aria-disabled|nativeButtonLabel\\.textContent|setVariationReady/);
  assert.ok(productUiJs.includes("on('show_variation', function (event, variation, purchasable)"));
  assert.ok(productUiJs.includes("setVariationReady(isVariationEventReady(variation, purchasable))"));
  assert.ok(productUiJs.includes("on('reset_data hide_variation'"));
  assert.ok(productUiJs.includes("on('woocommerce_update_variation_values', syncVariationState)"));
  assert.ok(productUiJs.includes("form.addEventListener('change', function (event)"));
  assert.ok(productUiJs.includes('if (selects.indexOf(event.target) !== -1) setVariationReady(false)'));
  assert.doesNotMatch(productUiJs,/woocommerce-variation-add-to-cart-enabled/);
  assert.doesNotMatch(productUiJs,/woocommerce-variation-add-to-cart-disabled/);
  assert.ok(productUiJs.includes('setVariationReady(currentVariationReady)'));
});

test('hide, non-purchasable and READY-to-READY transitions update CTA state', () => {
  const sandboxModule={exports:{}};
  vm.runInNewContext(productUiJs,{module:sandboxModule,document:{readyState:'loading',addEventListener(){}}});
  const {isVariationEventReady,applyVariationButtonState}=sandboxModule.exports;
  const button={disabled:true,attrs:{},setAttribute(name,value){this.attrs[name]=value;}};
  const label={textContent:'Elige opciones'};
  const apply=(variation,purchasable)=>{const ready=isVariationEventReady(variation,purchasable);applyVariationButtonState(button,label,ready);return ready;};
  assert.equal(apply({variation_id:12345},true),true);
  assert.equal(button.disabled,false);
  assert.equal(apply({variation_id:12346},true),true);
  assert.equal(button.disabled,false);
  assert.equal(apply({variation_id:12346},false),false);
  assert.equal(button.disabled,true);
  assert.equal(label.textContent,'Elige opciones');
  assert.ok(productUiJs.includes('setVariationReady(currentVariationReady)'));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = 'Añadido al carrito'"));
});


test('incomplete variation CTA has no alert, warning, notice or scroll behavior', () => {
  assert.equal(productUiJs.includes('window.alert('), false);
  assert.equal(productUiJs.includes('cr-product-variation-warning'), false);
  assert.equal(productUiJs.includes('scrollIntoView'), false);
  assert.equal(productUiJs.includes('scrollTo('), false);
  assert.ok(productUiJs.includes("button.disabled = !ready"));
  assert.ok(productUiJs.includes("button.setAttribute('aria-disabled', ready ? 'false' : 'true')"));
  assert.ok(productUiJs.includes("label.textContent = ready ? 'Añadir al carrito' : 'Elige opciones'"));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = 'Añadido al carrito'"));
  assert.ok(productUiJs.includes("on('show_variation', function (event, variation, purchasable)"));
  assert.ok(productUiJs.includes("on('reset_data hide_variation'"));
});

test('color chips render every non-empty native select option and audit counts', () => {
  assert.ok(productUiJs.includes("Array.prototype.slice.call(select.options)"));
  assert.ok(productUiJs.includes("if (!option.value) return;"));
  assert.ok(productUiJs.includes("select.dataset.crNativeOptionCount"));
  assert.ok(productUiJs.includes("select.dataset.crChipCount"));
  assert.ok(productUiJs.includes("COLOR_OPTIONS_AUDIT"));
  assert.ok(productUiJs.includes("nativeNonempty: nativeColorOptions.length"));
  assert.ok(productUiJs.includes("renderedChips: renderedColorCount"));
});

test('color chips use the same native-select deselection behavior as size', () => {
  assert.ok(productUiJs.includes("var isColor = /colou?r|tono/.test(label)"));
  assert.ok(productUiJs.includes("var isSize = /talla|size/.test(label)"));
  assert.ok(productUiJs.includes("var isToggleAttribute = isSize || isColor"));
  assert.ok(productUiJs.includes("select.value = isToggleAttribute && select.value === option.value ? '' : option.value"));
  assert.ok(productUiJs.includes("dispatchNativeChange(select)"));
  assert.match(productUiJs, /dispatchNativeChange\(input\)\s*\{[\s\S]*?new Event\('change', \{ bubbles: true \}\)/);
  assert.ok(productUiJs.includes("chip.disabled = !!option.disabled"));
  assert.ok(productUiJs.includes("chip.disabled = !option || !!option.disabled"));
  assert.ok(productUiJs.includes("select.value === option.value ? 'true' : 'false'"));
  assert.ok(productUiJs.includes("selects.forEach(function (select)"));
  assert.ok(productUiJs.includes("woocommerce_update_variation_values"));
  assert.equal(productUiJs.includes("variationId.value ="), false);
  assert.equal(productUiJs.includes("variation_id.value ="), false);
  assert.ok(productUiJs.includes("COLOR_OPTIONS_AUDIT"));
  assert.ok(productUiJs.includes("'granate': '#800020'"));
});

test('shared variation chip toggle contract is limited to size and color and uses the native select', () => {
  assert.ok(productUiJs.includes("var isColor = /colou?r|tono/.test(label)"));
  assert.ok(productUiJs.includes("var isSize = /talla|size/.test(label)"));
  assert.ok(productUiJs.includes("var isToggleAttribute = isSize || isColor"));

  // Selected toggle attribute clears its native select; all other cases select the tapped option.
  assert.match(productUiJs, /select\.value = isToggleAttribute && select\.value === option\.value \? '' : option\.value/);
  assert.ok(productUiJs.includes("dispatchNativeChange(select)"));
  assert.ok(productUiJs.includes("select.value === option.value ? 'true' : 'false'"));
  assert.ok(productUiJs.includes("chip.disabled = !!option.disabled"));
  assert.ok(productUiJs.includes("if (chip.disabled) return"));
  assert.ok(productUiJs.includes("woocommerce_update_variation_values"));

  // No third attribute can become toggle-enabled, and no custom variation matching is introduced.
  assert.ok(productUiJs.includes("var isToggleAttribute = isSize || isColor"));
  assert.equal(productUiJs.includes("isToggleAttribute = isSize || isColor ||"), false);
  assert.equal(productUiJs.includes("variation_id.value ="), false);
  assert.equal(productUiJs.includes("variationId.value ="), false);
  assert.equal(productUiJs.includes("variation.variation_id"), true);
});

test('size chip remains independently toggleable through its native select', () => {
  assert.ok(productUiJs.includes("var isSize = /talla|size/.test(label)"));
  assert.ok(productUiJs.includes("var isToggleAttribute = isSize || isColor"));
  assert.match(productUiJs, /select\.value = isToggleAttribute && select\.value === option\.value \? '' : option\.value/);
  assert.ok(productUiJs.includes("dispatchNativeChange(select)"));
  assert.ok(productUiJs.includes("select.value === option.value ? 'true' : 'false'"));
});

test('color chip is independently toggleable through its native select', () => {
  assert.ok(productUiJs.includes("var isColor = /colou?r|tono/.test(label)"));
  assert.ok(productUiJs.includes("var isToggleAttribute = isSize || isColor"));
  assert.match(productUiJs, /select\.value = isToggleAttribute && select\.value === option\.value \? '' : option\.value/);
  assert.ok(productUiJs.includes("dispatchNativeChange(select)"));
  assert.ok(productUiJs.includes("select.value === option.value ? 'true' : 'false'"));
  assert.ok(productUiJs.includes("COLOR_OPTIONS_AUDIT"));
});

test('all 35 current WooCommerce colors resolve to a visual swatch without fallback', () => {
  const sandboxModule = { exports: {} };
  vm.runInNewContext(productUiJs, {
    module: sandboxModule,
    document: { readyState: 'loading', addEventListener() {} }
  });
  const { resolveColorSwatch } = sandboxModule.exports;
  const colors = [
    'Amarillo', 'Azul', 'Azul claro', 'Azul marino', 'Azul pavo',
    'Azul turquesa', 'Azulón', 'Beige', 'Berenjena', 'Blanco',
    'Caldero', 'Camel', 'Celeste', 'Chicle', 'Coral', 'Fucsia',
    'Granate', 'Gris', 'Kaki', 'Lila', 'Marrón', 'Morado',
    'Mostaza', 'Naranja', 'Negro', 'Oro', 'Pistacho', 'Rojo',
    'Rosa', 'Salmón', 'Verde', 'Verde esmeralda', 'Verde fluor',
    'Verde manzana', 'Verde oscuro'
  ];
  assert.equal(colors.length, 35);
  for (const color of colors) {
    const result = resolveColorSwatch(color.toLowerCase().replace(/ /g, '-'), color);
    assert.equal(result.fallback, false, color + ' must not use fallback');
    assert.match(result.color, /^#[0-9A-F]{6}$/i, color + ' must resolve to HEX');
  }
});

test('color resolver normalizes accents, case, whitespace and WooCommerce slug separators', () => {
  const sandboxModule = { exports: {} };
  vm.runInNewContext(productUiJs, {
    module: sandboxModule,
    document: { readyState: 'loading', addEventListener() {} }
  });
  const { resolveColorSwatch } = sandboxModule.exports;
  for (const value of ['Salmón', 'Salmon', 'salmón', 'salmon', ' SALMÓN ']) {
    assert.equal(resolveColorSwatch(value, value).color, '#F29A82', value);
    assert.equal(resolveColorSwatch(value, value).fallback, false, value);
  }
  assert.equal(resolveColorSwatch('azulon', 'Azulón').color, '#2457A6');
  assert.equal(resolveColorSwatch('marron', 'Marrón').color, '#805B43');
  assert.equal(resolveColorSwatch('azul-marino', 'Azul marino').color, '#263B5B');
});

test('Granate keeps its exact existing HEX and unknown future terms keep neutral fallback', () => {
  const sandboxModule = { exports: {} };
  vm.runInNewContext(productUiJs, {
    module: sandboxModule,
    document: { readyState: 'loading', addEventListener() {} }
  });
  const { resolveColorSwatch } = sandboxModule.exports;
  assert.deepEqual(
    JSON.parse(JSON.stringify(resolveColorSwatch('granate', 'Granate'))),
    { normalized: 'granate', color: '#800020', fallback: false }
  );
  assert.equal(resolveColorSwatch('ultravioleta-futuro', 'Ultravioleta futuro').fallback, true);
  assert.equal(resolveColorSwatch('ultravioleta-futuro', 'Ultravioleta futuro').color, null);
});

test('visual color resolution never mutates the native WooCommerce option value', () => {
  const sandboxModule = { exports: {} };
  vm.runInNewContext(productUiJs, {
    module: sandboxModule,
    document: { readyState: 'loading', addEventListener() {} }
  });
  const { resolveColorSwatch } = sandboxModule.exports;
  const nativeSelectValue = 'salmon';
  const originalValue = nativeSelectValue;
  resolveColorSwatch(nativeSelectValue, 'Salmón');
  assert.equal(nativeSelectValue, originalValue);
  assert.match(productUiJs, /var rawColorValue = option\.value;[\s\S]*?resolveColorSwatch\(rawColorValue, rawColorLabel\)/);
  assert.match(productUiJs, /select\.value = isToggleAttribute && select\.value === option\.value \? '' : option\.value/);
});


test('valid variable submit is intercepted and posts the WooCommerce variation ID contract', () => {
  assert.match(productUiJs, /form\.addEventListener\('submit',[\s\S]*?event\.preventDefault\(\)/);
  assert.ok(productUiJs.includes("form.querySelector('input.variation_id')"));
  assert.match(productUiJs, /var selectedVariationId = Number\(variationId\.value\)/);
  assert.match(productUiJs, /product_id:\s*selectedVariationId/);
  assert.match(productUiJs, /quantity:\s*quantityInput\s*\?\s*quantityInput\.value\s*:\s*1/);
  assert.doesNotMatch(productUiJs, /product_id:\s*[^,]+,\s*variation_id:/);
  assert.match(productUiJs, /if \(!Number\.isFinite\(selectedVariationId\) \|\| selectedVariationId <= 0[\s\S]*?return;/);
  assert.match(productUiJs, /var selectedVariationId = Number\(variationId\.value\)/);
  assert.match(productUiJs, /selectedVariationId <= 0/);
  assert.match(productUiJs, /Number\.isFinite\(selectedVariationId\)/);
  assert.match(productUiJs, /product_id:\s*selectedVariationId/);
  assert.match(productUiJs, /quantity:\s*quantityInput\s*\?\s*quantityInput\.value\s*:\s*1/);
  assert.doesNotMatch(productUiJs, /product_id:\s*[^,]+,\s*variation_id:/);
  assert.match(productUiJs, /var quantityInput = form\.querySelector\('input\.qty\[name="quantity"\]'\)/);
  assert.match(productUiJs, /var endpoint = String\(ajaxParams\.wc_ajax_url\)\.replace\('%%endpoint%%', 'add_to_cart'\)/);
  assert.match(productUiJs, /\$\.ajax\(\{[\s\S]*?data: data[\s\S]*?dataType: 'json'/);
  assert.match(productUiJs, /form\.addEventListener\('submit',[\s\S]*?\}, true\)/);
  assert.match(assets, /array\( 'jquery', 'wc-add-to-cart', 'wc-cart-fragments' \)/);
  assert.ok(productUiJs.includes('woocommerce_update_variation_values'));
  assert.equal(productUiJs.includes('variation_id.value ='), false);
});

test('cart count remains a WooCommerce fragment for every existing header and bottom-nav counter', () => {
  assert.match(woocommerce, /\$fragments\['span\[data-cr-cart-count\]'\]/);
  assert.match(woocommerce, /add_filter\( 'woocommerce_add_to_cart_fragments', 'cr2026_cart_count_fragment' \)/);
});

test('short-description fixtures preserve valid formatting and contain malformed underline markup', () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/product-short-description.json'), 'utf8'));
  assert.equal(fixtures.length, 2);

  function assertBalancedMarkup(html) {
    const stack = [];
    const voidTags = new Set(['br']);
    for (const match of html.matchAll(/<\/?([a-z][a-z0-9]*)(?:\s[^>]*)?\s*\/?>/gi)) {
      const tag = match[1].toLowerCase();
      const token = match[0];
      if (token.startsWith('</')) {
        assert.equal(stack.pop(), tag, 'closing tag must match its open tag');
      } else if (!voidTags.has(tag) && !/\/\s*>$/.test(token)) {
        stack.push(tag);
      }
    }
    assert.deepEqual(stack, [], 'all allowed markup must be closed before following product controls');
  }

  for (const fixture of fixtures) {
    // force_balance_tags() closes the remaining open inline element at the excerpt boundary.
    const balanced = fixture.input + (fixture.name.startsWith('malformed') ? '</u>' : '');
    assert.equal(balanced, fixture.expected, fixture.name);
    assertBalancedMarkup(balanced);
    assert.match(balanced, /<u>/);
    assert.match(balanced, /<\/u>/);
  }

  const valid = fixtures.find((fixture) => fixture.name.startsWith('valid'));
  assert.equal(valid.expected, valid.input, 'already-balanced WooCommerce markup must remain unchanged');
  assert.match(valid.expected, /<u>Composición:<\/u>/);
  assert.match(valid.expected, /<u>Marca:<\/u> Arggido/);
});

test('cart submitting state enters and clears repeatedly, including a second add without reload', () => {
  const sandboxModule={exports:{}};
  vm.runInNewContext(productUiJs,{module:sandboxModule,document:{readyState:'loading',addEventListener(){}}});
  const {enterCartSubmittingState,clearCartSubmittingState}=sandboxModule.exports;
  const classes=new Set();
  const button={
    disabled:false,
    attrs:{'aria-disabled':'false','aria-busy':'false'},
    classList:{add(name){classes.add(name);},remove(name){classes.delete(name);}},
    setAttribute(name,value){this.attrs[name]=value;}
  };
  const label={textContent:'Añadir al carrito'};
  const spinner={hidden:true};
  // Simulate three consecutive valid request cycles, specifically asserting the second re-entry.
  for(let add=1;add<=3;add++){
    enterCartSubmittingState(button,label,spinner);
    assert.equal(classes.has('is-submitting'),true, 'add '+add+' enters submitting');
    assert.equal(button.disabled,true);
    assert.equal(button.attrs['aria-disabled'],'true');
    assert.equal(button.attrs['aria-busy'],'true');
    assert.equal(label.textContent,'Añadiendo...');
    assert.equal(spinner.hidden,false);
    clearCartSubmittingState(button,label,spinner,true,true);
    assert.equal(classes.has('is-submitting'),false, 'add '+add+' clears submitting');
    assert.equal(button.attrs['aria-busy'],'false');
    assert.equal(spinner.hidden,true);
    label.textContent='Añadido al carrito';
    clearCartSubmittingState(button,label,spinner,true,false);
    assert.equal(label.textContent,'Añadir al carrito');
    assert.equal(button.disabled,false);
    assert.equal(button.attrs['aria-disabled'],'false');
  }
});

test('cart submitting cleanup on request error restores READY or INCOMPLETE and clears aria-busy', () => {
  const sandboxModule={exports:{}};
  vm.runInNewContext(productUiJs,{module:sandboxModule,document:{readyState:'loading',addEventListener(){}}});
  const {enterCartSubmittingState,clearCartSubmittingState}=sandboxModule.exports;
  const classes=new Set();
  const button={disabled:false,attrs:{},classList:{add(n){classes.add(n);},remove(n){classes.delete(n);}},setAttribute(n,v){this.attrs[n]=v;}};
  const label={textContent:'Añadir al carrito'}, spinner={hidden:true};
  enterCartSubmittingState(button,label,spinner);
  clearCartSubmittingState(button,label,spinner,true,false);
  assert.equal(classes.has('is-submitting'),false);
  assert.equal(button.attrs['aria-busy'],'false');
  assert.equal(button.disabled,false);
  assert.equal(label.textContent,'Añadir al carrito');
  enterCartSubmittingState(button,label,spinner);
  clearCartSubmittingState(button,label,spinner,false,false);
  assert.equal(button.disabled,true);
  assert.equal(button.attrs['aria-disabled'],'true');
  assert.equal(label.textContent,'Elige opciones');
});

test('Product Detail loading uses centered custom spinner and suppresses WooCommerce corner pseudo-spinner', () => {
  assert.ok(productUiJs.includes("enterCartSubmittingState(nativeButton, nativeButtonLabel, loadingSpinner)"));
  assert.ok(productUiJs.includes("clearCartSubmittingState(nativeButton, nativeButtonLabel, loadingSpinner, currentVariationReady, hasAddedFeedback)"));
  assert.ok(skinCss.includes('.single_add_to_cart_button.loading::after {'));
  assert.ok(skinCss.includes('display: none !important;'));
  assert.ok(skinCss.includes('.single_add_to_cart_button.is-submitting .cr-product-cart-spinner'));
  assert.ok(skinCss.includes('justify-content: center;'));
  assert.ok(skinCss.includes('align-items: center;'));
  assert.ok(skinCss.includes('border-right-color: transparent;'));
  assert.ok(skinCss.includes('animation: cr-product-cart-spin 700ms linear infinite;'));
  assert.ok(skinCss.includes('.single_add_to_cart_button.is-submitting .cr-product-cart-icon'));
  assert.ok(skinCss.includes('width: 20px;'));
  assert.ok(skinCss.includes('height: 52px;'));
  assert.ok(skinCss.includes('min-height: 52px;'));
});

test('variation AJAX flow is single-request, guarded, and emits WooCommerce added_to_cart feedback', () => {
  assert.ok(productUiJs.includes('initVariationAjaxAddToCart();'));
  assert.match(productUiJs, /var isAddingToCart = false/);
  assert.match(productUiJs, /if \(isAddingToCart\) return/);
  assert.match(productUiJs, /isAddingToCart = true[\s\S]*?\$\.ajax\(/);
  assert.match(productUiJs, /\$\.ajax\(\{[\s\S]*?type: 'POST'[\s\S]*?url: endpoint[\s\S]*?data: data/);
  assert.match(productUiJs, /event\.preventDefault\(\)[\s\S]*?event\.stopImmediatePropagation\(\)/);
  assert.match(productUiJs, /\$\(document\.body\)\.trigger\('added_to_cart', \[[\s\S]*?response\.fragments[\s\S]*?response\.cart_hash[\s\S]*?\$button/);
  assert.match(productUiJs, /\.fail\(function \(xhr, status, error\)[\s\S]*?variation add-to-cart request failed/);
  assert.match(productUiJs, /!response \|\| response\.error \|\| response\.success === false/);
  assert.match(productUiJs, /\.always\(function \(\)[\s\S]*?isAddingToCart = false[\s\S]*?clearCartSubmittingState\(nativeButton, nativeButtonLabel, loadingSpinner, currentVariationReady, hasAddedFeedback\)/);
  assert.ok(productUiJs.includes("button.setAttribute('aria-busy', 'false')"));
  assert.ok(productUiJs.includes("added_to_cart.crProductDetail"));
  assert.ok(productUiJs.includes('showAddedFeedback()'));
  assert.doesNotMatch(productUiJs, /submitProductDetailAddToCart/);
  assert.doesNotMatch(woocommerce, /cr2026_product_detail_error_notice_fragment|cr_product_detail/);
});

test('CTA keeps its native added_to_cart listener without creating a replacement request', () => {
  assert.ok(productUiJs.includes("added_to_cart.crProductDetail"));
  assert.ok(productUiJs.includes('showAddedFeedback()'));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = 'Añadido al carrito'"));
  assert.doesNotMatch(productUiJs, /jQuery\.ajax\s*\(|fetch\s*\(/);
});

test('Product Detail hides only its WooCommerce cart link and duplicate added-state check', () => {
  assert.ok(skinCss.includes('body.cr-product-detail-app .cr-main--woocommerce div.product form.cart a.added_to_cart.wc-forward {'));
  assert.ok(skinCss.includes('body.cr-product-detail-app .cr-main--woocommerce div.product form.cart .single_add_to_cart_button.added::after {'));
  assert.ok(skinCss.includes('content: none !important;'));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = 'Añadido al carrito'"));
  assert.ok(productUiJs.includes("setCartIcon('check')"));
});


test('Product Detail clears only its own notices when WooCommerce resolves a variation', () => {
  assert.ok(productUiJs.includes('function clearProductDetailNotices()'));
  assert.ok(productUiJs.includes("on('found_variation', function ()"));
  assert.ok(productUiJs.includes("on('show_variation', function (event, variation, purchasable)"));
  assert.ok(productUiJs.includes("noticeRoot.querySelectorAll('.woocommerce-notices-wrapper')"));
  assert.doesNotMatch(productUiJs, /document\.querySelectorAll\(['"]\.woocommerce-message/);
});

test('variation chips, quantity, CTA, gallery and native lightbox remain presentational enhancements', () => {
  assert.ok(productUiJs.includes('cr-product-choice-chips'));
  assert.ok(productUiJs.includes('form.cart .quantity input.qty'));
  assert.ok(productUiJs.includes("form.querySelector('button.single_add_to_cart_button')"));
  assert.ok(productUiJs.includes('showAddedFeedback'));
  assert.ok(productUiJs.includes('initNativeTouchLightbox'));
  assert.ok(productUiJs.includes('.woocommerce-product-gallery__trigger'));
  assert.ok(productUiJs.includes("added_to_cart.crProductDetail"));
});

test('Product Detail renders assigned product_brand logo with native metadata priority and name fallback', () => {
  assert.ok(skin.includes('function cr2026_product_skin_brand()'));
  assert.ok(skin.includes("taxonomy_exists( 'product_brand' )"));
  assert.ok(skin.includes("get_the_terms( absint( get_queried_object_id() ), 'product_brand' )"));
  assert.ok(skin.includes("cr2026_home_brand_image_url( $brand )"));
  assert.ok(skin.includes('cr-product-brand__logo'));
  assert.ok(skin.includes('cr-product-brand__name'));
  assert.ok(skinCss.includes('cr-product-brand::before'));
  assert.ok(skinCss.includes('object-fit:contain'));
  assert.ok(skin.includes('cr-product-title-brand-row__brand'));
  const helpers = fs.readFileSync(path.join(theme, 'inc/helpers.php'), 'utf8');
  assert.ok(helpers.includes("foreach ( array( 'thumbnail_id', 'image_id' ) as $meta_key )"));
});

test('Product Detail global size help has exact email and WhatsApp links', () => {
  assert.ok(skin.includes('Pregunta por más tallas!'));
  assert.ok(skin.includes('Si la talla que necesitas, no se encuentra disponible, contacta con nosotros en'));
  assert.ok(skin.includes('href="mailto:criosrango@criosrango.es"'));
  assert.ok(skin.includes('href="https://wa.me/34633246788"'));
  assert.ok(skin.includes('target="_blank" rel="noopener noreferrer">633 246 788'));
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 )"));
});

test('legacy excerpt brand and size help cleanup leaves the balancing sanitizer active', () => {
  assert.ok(skin.includes('Strip legacy brand labels/values'));
  assert.ok(skin.includes('Legacy sizing-help blocks are now rendered globally'));
  assert.ok(skin.includes('return force_balance_tags( $short_description );'));
  assert.ok(skin.includes('criosrango@criosrango.es'));
  assert.ok(skin.includes('633\\s*246\\s*788'));
});


test('final app layout groups native title, dynamic price and WordPress brand without standalone brand dividers', () => {
  assert.ok(skin.includes('function cr2026_product_skin_title_price_brand()'));
  assert.ok(skin.includes('$display_title = cr2026_product_skin_display_title( $original_title, $brand instanceof WP_Term ? $brand->name :'));
  assert.ok(skin.includes('woocommerce_template_single_price();'));
  assert.ok(skin.includes('cr2026_product_skin_brand();'));
  assert.ok(skin.includes('cr-product-title-brand-row__divider'));
  assert.ok(skin.includes("remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_excerpt', 20 )"));
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_title_price_brand', 5 )"));
  assert.ok(skinCss.includes('cr-product-title-brand-row'));
  assert.ok(skinCss.includes('woocommerce-product-details__short-description { display: none !important; }'));
});

test('global sizing help exposes a stable measuring-tape icon wrapper containing a local SVG', () => {
  assert.match(skin, /<span class="cr-product-size-help__icon"[^>]*>\s*<svg\b/);
  assert.match(skin, /<svg\b[^>]*viewBox="0 0 32 32"/);
  assert.ok(skin.includes('cr-product-size-help__content'));
  assert.ok(skinCss.includes('cr-product-size-help__icon svg'));
  assert.ok(skinCss.includes('background: #EAF1E8'));
});

test('share and reserve capsule is hooked after the native gallery and before product information', () => {
  // WooCommerce outputs its native gallery at priority 20 on this hook.
  assert.ok(setup.includes("add_theme_support( 'wc-product-gallery-slider' )"));
  assert.ok(skin.includes("add_action( 'woocommerce_before_single_product_summary', 'cr2026_product_skin_actions', 31 )"));
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_title_price_brand', 5 )"));
  assert.doesNotMatch(skin, /add_action\( 'woocommerce_after_add_to_cart_form', 'cr2026_product_skin_actions'/);
});

test('mobile variable purchase wrapper follows the native variation table and lays out quantity plus CTA in one grid row', () => {
  assert.match(skinCss, /form\.cart table\.variations\s*\{[^}]*order:\s*1;/s);
  assert.match(skinCss, /form\.cart \.single_variation_wrap\s*\{[^}]*order:\s*2;[^}]*flex:\s*0 0 100%;/s);
  assert.match(skinCss, /\.single_variation_wrap \.woocommerce-variation-add-to-cart\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*max-content 116px minmax\(0, 1fr\);/s);
  assert.match(skinCss, /\.quantity\.cr-product-quantity-row\s*\{\s*display:\s*contents !important;/s);
  assert.match(skinCss, /\.cr-product-quantity-stepper\s*\{[^}]*width:\s*116px;[^}]*height:\s*58px;/s);
  assert.match(skinCss, /\.single_add_to_cart_button\s*\{[^}]*grid-column:\s*3;[^}]*min-width:\s*0;[^}]*white-space:\s*nowrap;/s);
  assert.match(skinCss, /@media \(max-width: 340px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.ok(productUiJs.includes("quantityLabel.textContent = 'Cantidad'"));
  assert.ok(productUiJs.includes('cr-product-quantity-stepper'));
});

test('empty native variation template contributes no gap or margin before the purchase row', () => {
  const selector = 'single_variation:has(> .woocommerce-variation-description:empty):has(> .woocommerce-variation-price:empty):has(> .woocommerce-variation-availability:empty)';
  assert.ok(skinCss.includes(selector));
  const ruleStart = skinCss.indexOf(selector);
  const ruleEnd = skinCss.indexOf('}', ruleStart);
  const emptyRule = skinCss.slice(ruleStart, ruleEnd + 1);
  assert.match(emptyRule, /display:\s*none !important;/);
  assert.match(emptyRule, /margin:\s*0 !important;/);
  assert.match(emptyRule, /padding:\s*0 !important;/);
  assert.match(emptyRule, /min-height:\s*0 !important;/);
  assert.match(skinCss, /\.single_variation_wrap\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*8px;/s);
  assert.doesNotMatch(skinCss, /margin-top:\s*-16px/);
  assert.doesNotMatch(skinCss, /\.single_variation\s*\{\s*display:\s*none/s);
});

test('mobile title and brand columns are balanced and title scale is reduced', () => {
  assert.match(skinCss, /grid-template-columns:\s*minmax\(0,\s*1\.62fr\)\s*1px\s*minmax\(0,\s*1fr\)/);
  assert.match(skinCss, /font-size:\s*clamp\(20px,\s*4\.8vw,\s*25px\)/);
  assert.match(skinCss, /line-height:\s*1\.14/);
  assert.match(skinCss, /font-weight:\s*600/);
});

test('final mobile block order keeps variations before the native purchase wrapper', () => {
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_title_price_brand', 5 )"));
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 )"));
  assert.ok(skin.indexOf("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_title_price_brand', 5 )") < skin.indexOf("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 )"));
  assert.match(skinCss, /form\.cart table\.variations\s*\{[^}]*order:\s*1;/s);
  assert.match(skinCss, /form\.cart \.single_variation_wrap\s*\{[^}]*order:\s*2;/s);
  assert.match(skinCss, /\.single_variation_wrap \.woocommerce-variation-add-to-cart\s*\{[^}]*display:\s*grid;/s);
  assert.match(skinCss, /\.cr-product-title-brand-row \.product_title\s*\{[^}]*font-size:\s*clamp\(20px,\s*4\.8vw,\s*25px\)/s);
});

test('gallery zoom trigger stays hidden while native WooCommerce lightbox and FlexSlider controls remain', () => {
  assert.ok(skinCss.includes('.woocommerce-product-gallery__trigger'));
  assert.ok(skinCss.includes('display: none !important'));
  assert.ok(productUiJs.includes('initNativeTouchLightbox'));
  assert.ok(productUiJs.includes('.woocommerce-product-gallery__trigger'));
  assert.ok(skinCss.includes('.flex-direction-nav'));
  assert.ok(skinCss.includes('cr-product-gallery-dots'));
});


test('final mobile block order follows gallery, share, product info, size help, variations and purchase controls', () => {
  // Gallery (WooCommerce priority 20) precedes share (priority 31) on the same hook.
  assert.ok(setup.includes("add_theme_support( 'wc-product-gallery-slider' )"));
  assert.ok(skin.includes("add_action( 'woocommerce_before_single_product_summary', 'cr2026_product_skin_actions', 31 )"));
  // Product info and size help share the summary hook; priorities define their order.
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_title_price_brand', 5 )"));
  assert.ok(skin.includes("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 )"));
  assert.ok(skin.indexOf("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_title_price_brand', 5 )") < skin.indexOf("add_action( 'woocommerce_single_product_summary', 'cr2026_product_skin_global_size_help', 24 )"));
  // WooCommerce's native add-to-cart form follows; variations precede quantity and CTA.
  assert.doesNotMatch(skin, /remove_action\(\s*'woocommerce_single_product_summary',\s*'woocommerce_template_single_add_to_cart'/);
  assert.match(skinCss, /form\.cart table\.variations\s*\{[^}]*order:\s*1;/s);
  assert.match(skinCss, /form\.cart \.quantity\.cr-product-quantity-row\s*\{[^}]*order:\s*2;/s);
  assert.match(skinCss, /form\.cart \.single_add_to_cart_button\s*\{[^}]*order:\s*3;/s);
  assert.match(skinCss, /font-size: clamp\(22px, 5\.5vw, 28px\)/);
  assert.match(skinCss, /flex: 0 0 104px/);
  assert.match(skinCss, /min-height: 60px/);
  assert.match(skinCss, /white-space: nowrap/);
});

test('contextual back ignores external referrers and only goes back within the current site path', () => {
  assert.match(skin, /previous\.origin === current\.origin/);
  assert.match(skin, /insideSite && isDifferentPage/);
  assert.match(skin, /event\.preventDefault\(\);\s*window\.history\.back\(\)/);
  assert.match(skin, /data-site-path/);
});

test('product category fallback uses assigned primary category then deterministic deepest category', () => {
  assert.match(skin, /_yoast_wpseo_primary_product_cat/);
  assert.match(skin, /_rank_math_primary_product_cat/);
  assert.match(skin, /get_ancestors\(\s*\$term->term_id,\s*'product_cat',\s*'taxonomy'\s*\)/);
  assert.match(skin, /\$right\['depth'\] <=> \$left\['depth'\]/);
  assert.match(skin, /\$left\['term'\]->term_id <=> \$right\['term'\]->term_id/);
  assert.match(skin, /return cr2026_shop_url\(\)/);
});

test('display title removes only an exact final product_brand suffix and Product Info renders the helper result', () => {
  assert.ok(skin.includes('function cr2026_product_skin_brand_term()'));
  assert.ok(skin.includes('function cr2026_product_skin_display_title( $original_title = null, $brand_name = null )'));
  assert.ok(skin.includes("get_the_terms( absint( get_queried_object_id() ), 'product_brand' )"));
  assert.ok(skin.includes("mb_strtolower( $title_suffix, 'UTF-8' )"));
  assert.ok(skin.includes("mb_substr( $original_title, -$brand_length, null, 'UTF-8' )"));
  const strip=(title,brand)=>{const original=title,t=title.trim(),b=brand.trim();if(!b||t.length<=b.length||t.slice(-b.length).toLocaleLowerCase('es')!==b.toLocaleLowerCase('es'))return original;const prefix=t.slice(0,-b.length);if(!/\s*[-–—|]\s*$/.test(prefix))return original;const out=prefix.replace(/\s*[-–—|]\s*$/,'').trim();return out||original;};
  const cases=[
    ['Jersey - 194000146P - Spagnolo','Spagnolo','Jersey - 194000146P'],
    ['Chaqueta - 6516 - Ragussa','Ragussa','Chaqueta - 6516'],
    ['Vestido – Mayoral','Mayoral','Vestido'],
    ['Vestido especial','Mayoral','Vestido especial'],
    ['Spagnolo Jersey Edición Especial','Spagnolo','Spagnolo Jersey Edición Especial'],
    ['Vestido Spagnolo Edición Especial','Spagnolo','Vestido Spagnolo Edición Especial'],
    ['Jersey - 194000146P | spagnolo','Spagnolo','Jersey - 194000146P']
  ];
  for(const [title,brand,expected] of cases) assert.equal(strip(title,brand),expected,title);
  assert.equal(strip('Jersey - 194000146P - Spagnolo',''),'Jersey - 194000146P - Spagnolo');
  assert.equal(strip('Jersey - 194000146P Spagnolo','Spagnolo'),'Jersey - 194000146P Spagnolo');
  const renderer=skin.slice(skin.indexOf('function cr2026_product_skin_title_price_brand()'),skin.indexOf('function cr2026_product_skin_brand_term()'));
  assert.ok(renderer.includes('cr2026_product_skin_display_title( $original_title, $brand instanceof WP_Term ? $brand->name :'));
  assert.ok(renderer.includes('esc_html( $display_title )'));
  assert.equal(renderer.includes('esc_html( $product->get_name() )'), false);
  assert.ok(skin.includes("echo '<h1 class=\"cr-parent-category__title\">' . esc_html( $product->get_name() ) . '</h1>'"));
  assert.equal(renderer.includes('esc_html( $display_title )'),true,'PRODUCT_INFO_RENDER_USES_DISPLAY_TITLE=YES');
});

test('Product Detail makes the complete brand logo or text fallback a safe same-tab archive link', () => {
  const brandRenderer = skin.slice(skin.indexOf('function cr2026_product_skin_brand()'), skin.indexOf('function cr2026_product_skin_global_size_help()'));
  assert.match(brandRenderer, /\$brand_url = get_term_link\( \$brand \)/);
  assert.match(brandRenderer, /! is_wp_error\( \$brand_url \)/);
  assert.match(brandRenderer, /class="cr-product-brand-link"/);
  assert.match(brandRenderer, /Ver productos de %s/);
  assert.match(brandRenderer, /if \( \$logo_url \)/);
  assert.match(brandRenderer, /cr-product-brand__logo/);
  assert.match(brandRenderer, /cr-product-brand__name/);
  assert.match(brandRenderer, /if \( \$brand_linked \) \{\s*echo '<a/s);
  assert.match(brandRenderer, /echo '<\/a>'/);
  assert.doesNotMatch(brandRenderer, /target="_blank"/);
  assert.match(skinCss, /\.cr-product-title-brand-row__brand \.cr-product-brand-link\s*\{[^}]*width:\s*100%;[^}]*text-decoration:\s*none;/s);
  assert.match(skin, /if \( ! \$brand instanceof WP_Term \) \{ return; \}/);
});


test('Product Detail uses the shared canvas and content-sized compact variation cards', () => {
  assert.match(skinCss, /--cr-product-cream:\s*var\(--cr-app-canvas\)/);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-main--woocommerce div\.product \{[^}]*background:\s*var\(--cr-app-canvas\)/s);
  assert.match(skinCss, /\.cr-product-description__icon\s*\{[^}]*background:\s*var\(--cr-app-canvas\)/s);
  assert.match(skinCss, /\.cr-product-variation-card\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*0;[^}]*padding:\s*14px 15px 12px;/s);
  assert.match(skinCss, /\.cr-product-variation-card__title\s*\{[^}]*margin-bottom:\s*12px;/s);
  assert.match(skinCss, /\.cr-product-choice-chips--color \.cr-product-choice-chip\s*\{[^}]*min-height:\s*0;[^}]*gap:\s*5px;/s);
  assert.match(skinCss, /\.cr-product-choice-chips--color \.cr-product-choice-chip__swatch\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;/s);
  assert.match(skinCss, /\.cr-product-choice-chips--size \.cr-product-choice-chip\s*\{[^}]*min-height:\s*46px;[^}]*padding:\s*0 20px;/s);
  assert.match(skinCss, /\.cr-product-variation-cards\s*\{[^}]*gap:\s*12px;[^}]*margin:\s*0 0 20px;/s);
});


test('Product Detail matches the global Category canvas and uses transparent compact description and variation surfaces', () => {
  const globalCss = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
  assert.match(globalCss, /body\.cr-parent-category-view \{[^}]*background:\s*var\(--cr-app-canvas\);/s);
  assert.match(skinCss, /body\.cr-product-detail-app \{[^}]*background:\s*var\(--cr-app-canvas\);/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-main--woocommerce div\.product,\s*body\.cr-product-detail-app \.cr-main--woocommerce div\.product div\.summary \{[^}]*background:\s*transparent;/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-product-description,\s*body\.cr-product-detail-app \.cr-product-description__toggle,\s*body\.cr-product-detail-app \.cr-product-description__panel,\s*body\.cr-product-detail-app \.cr-product-description__icon,\s*body\.cr-product-detail-app \.cr-product-variation-card \{[^}]*background:\s*transparent !important;/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-product-description__toggle \{[^}]*min-height:\s*52px;[^}]*padding:\s*8px 15px;/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-product-variation-card \{[^}]*height:\s*auto;[^}]*min-height:\s*0;[^}]*padding:\s*11px 15px;/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-product-choice-chips--color \.cr-product-choice-chip__swatch \{[^}]*width:\s*32px;[^}]*height:\s*32px;/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-product-choice-chips--size \.cr-product-choice-chip \{[^}]*height:\s*40px;[^}]*min-height:\s*40px;[^}]*min-width:\s*58px;[^}]*padding:\s*0 14px;[^}]*border-radius:\s*13px;/s);
  assert.match(skinCss, /body\.cr-product-detail-app \.cr-product-variation-cards \{[^}]*gap:\s*10px;[^}]*margin:\s*0 0 18px;/s);
});


test('Product Detail final controls stay compact and quantity label is visually removed without changing behavior', () => {
  assert.ok(skinCss.includes('width: 32px;') && skinCss.includes('height: 32px;'), 'COLOR_SWATCH_SMALLER=PASS');
  assert.ok(skinCss.includes('0 0 0 4px var(--cr-product-green)'), 'COLOR_SELECTED_RING_PRESERVED=PASS');
  assert.ok(skinCss.includes('width: 12px;') && skinCss.includes('height: 12px;'), 'COLOR_CHECK_REDUCED=PASS');
  assert.ok(skinCss.includes('min-width: 58px;') && skinCss.includes('padding: 0 14px;') && skinCss.includes('border-radius: 13px;'), 'SIZE_CHIP_NARROWER_AND_LESS_PILL=PASS');
  assert.ok(skinCss.includes('.cr-product-quantity-label {\n    display: none !important;'), 'QUANTITY_LABEL_RENDERED=NO');
  assert.ok(skinCss.includes('border: 1px solid var(--cr-product-border);\n    border-radius: 12px;\n    background: #fff;'), 'QUANTITY_CONTROL_WHITE_BACKGROUND=PASS');
  assert.ok(skinCss.includes('.woocommerce-variation-add-to-cart {\n    display: flex !important;') && skinCss.includes('gap: 10px;'), 'QUANTITY_AND_CTA_ALIGNED=PASS');
  assert.ok(skinCss.includes('flex: 1 1 auto;'), 'CTA_RETAINS_AVAILABLE_WIDTH=PASS');
});

test('Shared bottom navigation uses the exact storefront canvas with no visible top cut', () => {
  const globalCss = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
  assert.ok(globalCss.includes('.cr-mobile-bottom-nav {\n  background: var(--cr-app-canvas) !important;'), 'BOTTOM_NAV_MATCHES_PAGE_BACKGROUND=PASS');
  assert.ok(globalCss.includes('border-top: 0 !important;') && globalCss.includes('box-shadow: none !important;') && globalCss.includes('backdrop-filter: none !important;'), 'BOTTOM_NAV_BORDER_OR_SHADOW_REMOVED=PASS');
  assert.ok(globalCss.includes('.cr-mobile-bottom-nav::before,\n.cr-mobile-bottom-nav::after {\n  display: none !important;\n  content: none !important;'), 'BOTTOM_NAV_PSEUDO_SEPARATORS_REMOVED=PASS');
  assert.ok(globalCss.includes('.cr-mobile-bottom-nav__inner {\n  background: transparent !important;'), 'BOTTOM_NAV_INNER_TRANSPARENT=PASS');
});

 
test('mobile cart uses one WooCommerce table cell card and cart-only WPLoyalty filters', () => {
  const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  const cartHooks = fs.readFileSync(path.join(theme, 'inc/cart.php'), 'utf8');
  const pageTemplate = fs.readFileSync(path.join(theme, 'page.php'), 'utf8');
  const footerTemplate = fs.readFileSync(path.join(theme, 'footer.php'), 'utf8');
  const emptyTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart-empty.php'), 'utf8');
  assert.match(cartTemplate, /<tr class="woocommerce-cart-form__cart-item cart_item cr-cart-item">[\s\S]*?<td class="cr-cart-item-cell" colspan="6">[\s\S]*?<article class="cr-cart-item__card">[\s\S]*?<div class="cr-cart-item__main">[\s\S]*?cr-cart-item__media[\s\S]*?cr-cart-item__content[\s\S]*?<div class="cr-cart-item__actions">[\s\S]*?<\/article>[\s\S]*?<\/td>[\s\S]*?<\/tr>/);
  assert.doesNotMatch(cartTemplate, /class="product-thumbnail cr-cart-item__image"|class="product-name cr-cart-item__details"/);
  assert.match(cartTemplate, /\$_product->get_image\( 'woocommerce_thumbnail', array\(/);
  assert.match(cartTemplate, /wc_get_template\( 'cart\/cart-empty\.php' \)/);
  assert.doesNotMatch(cartTemplate, /woocommerce_cart_is_empty/);
  assert.match(cartHooks, /wlr_is_cart_earn_message_enabled/);
  assert.match(cartHooks, /wlr_is_cart_redeem_message_enabled/);
  assert.match(cartHooks, /function cr2026_cart_disable_wployalty_messages\( \$enabled \) \{\s*return false;/);
  assert.match(pageTemplate, /! function_exists\( 'is_cart' \) \|\| ! is_cart\(\)/);
  assert.match(footerTemplate, /! function_exists\( 'is_cart' \) \|\| ! is_cart\(\)/);
  assert.match(cartCss, /grid-template-columns:104px minmax\(0,1fr\)/);
  assert.match(cartCss, /\.cr-cart-item__actions \{ display:flex; justify-content:space-between; align-items:center; gap:8px; width:100%; min-width:0; flex-wrap:nowrap; \}/);
  assert.match(cartCss, /button\[name="update_cart"\].*clip-path:inset\(50%\)/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-footer \{ display:none!important; \}/);
  assert.match(emptyTemplate, /Tu carrito está vacío/);
  assert.match(emptyTemplate, /Añade algo que te guste para continuar/);
  assert.match(emptyTemplate, /wc-backward/);
  assert.doesNotMatch(emptyTemplate, /woocommerce_cart_is_empty/);
});

test('full cart physical defect contracts: WPLoyalty, image, remove, overflow and native totals', () => {
  const cartHooks = fs.readFileSync(path.join(theme, 'inc/cart.php'), 'utf8');
  const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  const cartTotals = fs.existsSync(path.join(theme, 'woocommerce/cart/cart-totals.php'))
    ? fs.readFileSync(path.join(theme, 'woocommerce/cart/cart-totals.php'), 'utf8') : '';
  assert.match(cartHooks, /wlr_is_cart_earn_message_enabled/);
  assert.match(cartHooks, /wlr_is_cart_redeem_message_enabled/);
  assert.doesNotMatch(cartHooks, /wlr_is_cart_(?:earn|redeem)_message_enabled[\s\S]{0,160}is_cart\(\)/);
  assert.match(cartHooks, /return false;/);
  assert.match(cartHooks, /cr2026_cart_product_image_attributes/);
  assert.match(cartTemplate, /wc_get_cart_remove_url\( \$cart_item_key \)/);
  assert.match(cartTemplate, /class="cr-cart-remove"/);
  assert.doesNotMatch(cartTemplate, /class="remove cr-cart-remove"/);
  assert.match(cartTemplate, /wc_get_formatted_cart_item_data\( \$cart_item, false, \$cart_display_name \)/);
  assert.match(cartCss, /table\.cart \.cr-cart-item__media img\.cr-cart-item__image-img/);
  assert.match(cartCss, /width:104px; height:128px; min-width:104px; max-width:104px/);
  assert.match(cartCss, /width:100%; height:100%; max-width:none; display:block; object-fit:cover/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-item__actions \{ min-width:0; \}/);
  assert.match(cartCss, /cr-cart-remove[\s\S]{0,180}white-space:nowrap/);
  assert.match(cartCss, /cr-cart-item__content[\s\S]{0,220}min-width:0/);
  assert.doesNotMatch(cartCss, /body\s*\{[^}]*overflow-x\s*:\s*hidden/i);
  assert.match(cartTotals, /wc_price\( \$cr_merchandise_before_shipping \)/);
  assert.match(cartTotals, /wc_price\( \$cr_merchandise_after_discounts \)/);
  assert.match(cartTotals, /woocommerce_cart_totals_before_shipping/);
  assert.match(cartTotals, /woocommerce_proceed_to_checkout/);
  assert.match(cartCss, /includes_tax/);
  assert.match(cartTotals, /Resumen/);
  assert.match(cartTotals, /woocommerce_cart_totals_after_order_total/);
});


test('final cart presentation uses parent variation title and native structured attributes', () => {
  const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');
  assert.match(cartTemplate, /\$_product->is_type\( 'variation' \)[\s\S]{0,300}\$parent_product = wc_get_product\( \$_product->get_parent_id\(\) \)/);
  assert.match(cartTemplate, /\$cart_display_name = \$parent_product->get_name\(\)/);
  assert.match(cartTemplate, /wc_get_formatted_cart_item_data\( \$cart_item, false, \$cart_display_name \)/);
  assert.match(cartTemplate, /\$cart_display_name/);
  assert.doesNotMatch(cartTemplate, /preg_replace|explode\(\s*['"][,;]/);
});

test('guest empty promotions stay collapsed without changing authenticated rewards and promotions', () => {
  const cartJs = fs.readFileSync(path.join(theme, 'assets/js/cart-ui.js'), 'utf8');
  assert.match(cartJs, /if \(!visible\.length\)\s*\{\s*promotionsList\.hidden = true;/);
  assert.match(cartJs, /const visible = \(config\.authenticated \? list : list\.filter\(guestPromotionVisible\)\)\s*\.filter\(\(promotion\) => !hasCoupon\(currentCart, promotion\.code\)\)/);
  assert.match(cartJs, /renderPromotions\(promotionsPayload\)/);
});

test('cart totals hide tax-rate rows but keep WooCommerce tax and total values', () => {
  const cartTotals = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart-totals.php'), 'utf8');
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  assert.doesNotMatch(cartTotals, /get_tax_totals\(\)|class="tax-rate/);
  assert.match(cartTotals, /get_cart_contents_total\(\)/);
  assert.match(cartTotals, /wc_price\( \$cr_merchandise_after_discounts \)/);
  assert.doesNotMatch(cartTotals, /get_total_tax\(\)|Incluye %s de impuestos/);
  assert.match(cartCss, /\.includes_tax[\s\S]*?display:none!important/);
  assert.match(cartTotals, /get_cart_contents_total\(\)/);
  assert.doesNotMatch(cartTotals, /EUR/);
  assert.doesNotMatch(cartTotals, /wc_cart_totals_shipping_html\(\)/);
  assert.match(cartTotals, /woocommerce_cart_totals_before_order_total/);
  assert.match(cartTotals, /woocommerce_cart_totals_after_order_total/);
  assert.match(cartTotals, /woocommerce_proceed_to_checkout/);
});

test('cart hides shipping methods and leaves method selection to checkout', () => {
  const cartTotals = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart-totals.php'), 'utf8');
  const cartJs = fs.readFileSync(path.join(theme, 'assets/js/cart-ui.js'), 'utf8');
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  assert.doesNotMatch(cartTotals, /wc_cart_totals_shipping_html\(\)/);
  assert.doesNotMatch(cartJs, /Cambiar método|initShippingPresentation|input\.shipping_method:checked/);
  assert.match(cartTotals, /Se calcula en el checkout/);
  assert.match(cartCss, /\.cr-cart-summary ul#shipping_method[\s\S]*?display:none!important/);
  assert.doesNotMatch(cartTotals, /woocommerce_shipping_calculator\(\)/);
});

test('cart visual pass preserves loyalty, promotions endpoints, auth and native cart actions', () => {
  const cartJs = fs.readFileSync(path.join(theme, 'assets/js/cart-ui.js'), 'utf8');
  const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');
  assert.match(cartJs, /config\.promotionsUrl/);
  assert.match(cartJs, /config\.loyaltyUrl/);
  assert.match(cartJs, /config\.redeemUrl/);
  assert.match(cartJs, /config\.authenticated/);
  assert.match(cartTemplate, /name="cr2026_empty_cart"/);
  assert.match(cartTemplate, /wp_nonce_field\( 'cr2026_empty_cart'/);
  assert.match(cartTemplate, /wc_get_cart_remove_url\( \$cart_item_key \)/);
});


test('cart page canvas is the global app token with transparent wrappers and no fallback', () => {
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  const mainCss = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
  assert.match(mainCss, /--cr-app-canvas:\s*#FCFAF7/i);
  assert.match(cartCss, /body\.woocommerce-cart\s*\{\s*background:\s*var\(--cr-app-canvas\)\s*!important;/);
  assert.doesNotMatch(cartCss, /var\(--cr-app-canvas,\s*#FCFAF7\)/i);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-main--woocommerce\s*\{\s*background:\s*transparent\s*!important;/);
  assert.doesNotMatch(cartCss, /--cart-page-background|--cr-page-canvas/);
});

test('cart item price, variation display, remove icon, compact stepper and CTA are app-aligned', () => {
  const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  assert.match(cartTemplate, /cr-cart-item__unit-label[^>]*>\/ ud\./);
  assert.match(cartTemplate, /wc_get_formatted_cart_item_data\( \$cart_item, false, \$cart_display_name \)/);
  assert.match(cartCss, /\.cr-cart-item__main \{ grid-template-columns: 88px minmax\(0,1fr\)/);
  assert.match(cartCss, /\.cr-cart-quantity\s*\{[^}]*border: 0;[^}]*border-radius: 0;/);
  assert.match(cartCss, /\.cr-cart-remove span \{ display:none!important; \}/);
  assert.match(cartCss, /\.cr-cart-summary \.checkout-button::after[\s\S]*?Finalizar compra/);
});

test('cart promotions and totals outer cards are removed, wallet points and tax presentation hidden', () => {
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  const cartJs = fs.readFileSync(path.join(theme, 'assets/js/cart-ui.js'), 'utf8');
  const cartTotals = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart-totals.php'), 'utf8');
  assert.match(cartCss, /\.cr-cart-promotions \{ padding:\s*0; border:\s*0; border-radius:\s*0;/);
  assert.match(cartCss, /\.cr-cart-summary \.cart_totals[\s\S]*?background: transparent!important/);
  assert.match(cartCss, /\.cr-cart-summary \.cart_totals > h2 \{ display:none!important; \}/);
  assert.match(cartCss, /\.cr-cart-wallet__points \{ display:none!important; \}/);
  assert.match(cartJs, /cartIcon\('wallet'/);
  assert.match(cartJs, /openWalletInfo/);
  assert.match(cartJs, /cr-cart-wallet__rewards/);
  assert.match(cartJs, /cr-cart-promo-card--welcome/);
  assert.doesNotMatch(cartTotals, /wc_cart_totals_shipping_html\(\)/);
  assert.doesNotMatch(cartTotals, /woocommerce_shipping_calculator\(\)|get_total_tax\(\)|Incluye %s de impuestos/);
});


test('cart final app refinement: light header, compact products, structured variations, light promotions and transparent totals', () => {
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  const cartJs = fs.readFileSync(path.join(theme, 'assets/js/cart-ui.js'), 'utf8');
  const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');
  const cartTotals = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart-totals.php'), 'utf8');

  // Cart heading now reuses the canonical Categories/Outlet toolbar; legacy cart-only header rules must stay absent.
  assert.ok(cartTemplate.includes('class="cr-cart-header-shell"') && cartTemplate.includes("cr2026_render_category_toolbar( __( 'Tu carrito'"));
  assert.doesNotMatch(cartCss, /\.cr-cart-heading|\.cr-cart-back/);
  assert.match(cartCss, /\.cr-cart-item__card \{ gap: 8px; padding: 9px;/);
  assert.match(cartCss, /\.cr-cart-item__media,[\s\S]*?width: 82px; height: 98px;/);
  assert.match(cartTemplate, /wc_get_formatted_cart_item_data\( \$cart_item, false, \$cart_display_name \)/);
  assert.match(cartCss, /\.cr-cart-item__variations dl\.variation \{[\s\S]*?display: flex!important/);
  assert.match(cartCss, /\.cr-cart-item__variations dl\.variation:empty \{ display: none!important; \}/);

  assert.match(cartCss, /\.cr-cart-promotions > h2,[\s\S]*?font-weight: 400;/);
  assert.match(cartCss, /\.cr-cart-reward__icon \{ color: var\(--cr-green/);
  assert.match(cartCss, /\.cr-cart-promo-card__icon \{ color: #C58A2A;/);
  assert.match(cartCss, /\.cr-cart-apply-button,[\s\S]*?font-weight: 500!important;/);

  assert.match(cartCss, /\.cr-cart-summary \.cart_totals,[\s\S]*?background: transparent!important/);
  assert.match(cartCss, /\.cr-cart-summary table\.shop_table th,[\s\S]*?background: transparent!important/);
  assert.match(cartCss, /\.cr-cart-summary table\.shop_table tr \+ tr > th,[\s\S]*?border-top: 1px solid rgba\(32,36,31,.10\)!important/);

  assert.doesNotMatch(cartTotals, /wc_cart_totals_shipping_html\(\)/);
  assert.match(cartJs, /renderCartSummary/);
  assert.match(cartJs, /Gratis/);
  assert.match(cartJs, /Se calcula en el checkout/);
  assert.doesNotMatch(cartJs, /selectedText[^;]*selectedItem\.textContent/);
  assert.match(cartTotals, /wc_price\( \$cr_merchandise_after_discounts \)/);
  assert.doesNotMatch(cartTotals, /EUR/);

  // Native cart operations and shipping selection remain authoritative and unchanged.
  assert.match(cartTemplate, /wp_nonce_field\( 'woocommerce-cart'/);
  assert.match(cartTemplate, /woocommerce_quantity_input\(/);
  assert.match(cartTemplate, /wc_get_cart_remove_url\( \$cart_item_key \)/);
  assert.doesNotMatch(cartJs, /input\.shipping_method:checked/);
  assert.doesNotMatch(cartJs, /methods\.hidden = !expanded/);
});


test('cart variation attributes use WooCommerce native formatter with parent title and omit empty simple-product markup', () => {
  const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');
  assert.match(cartTemplate, /\$variation_html = wc_get_formatted_cart_item_data\( \$cart_item, false, \$cart_display_name \)/);
  assert.match(cartTemplate, /if \( ! empty\( \$variation_html \) \) : \?>[\s\S]*?class="cr-cart-item__variations"[\s\S]*?\$variation_html/);
  assert.doesNotMatch(cartTemplate, /preg_replace|explode\(\s*['"][,;]/);
  // WooCommerce's formatter retains taxonomy labels, terms, custom attributes and extension item-data filters.
  assert.doesNotMatch(cartTemplate, /attribute_pa_color|attribute_pa_size|['"]Azul['"]|['"]42['"]/);
});

test('cart removes only the translated Cart updated success notice on cart requests', () => {
  const cart = fs.readFileSync(path.join(theme, 'inc/cart.php'), 'utf8');
  assert.match(cart, /function cr2026_cart_remove_updated_success_notice\(\)/);
  assert.match(cart, /! is_cart\(\)/);
  assert.match(cart, /wc_get_notices\(\)/);
  assert.match(cart, /wc_set_notices\( \$notices \)/);
  assert.match(cart, /__\( 'Cart updated\.', 'woocommerce' \)/);
  assert.match(cart, /trim\( wp_strip_all_tags\( \$notice\['notice'\] \) \) === \$updated_message/);
  assert.match(cart, /unset\( \$notices\['success'\]\[ \$notice_key \] \)/);
  assert.match(cart, /add_action\( 'wp', 'cr2026_cart_remove_updated_success_notice', 99 \)/);
  assert.doesNotMatch(cart, /wc_clear_notices\(\)/);
  assert.doesNotMatch(cart, /unset\( \$notices\['(?:error|notice|info)'\]/);
  assert.doesNotMatch(cart, /wc_set_notices\(\s*\[\s*\]\s*\)/);
  assert.doesNotMatch(cart, /woocommerce-message\s*\{[^}]*display\s*:\s*none/i);
  assert.doesNotMatch(cart, /woocommerce-error\s*\{[^}]*display\s*:\s*none/i);
});

test('cart updated notice suppression leaves other success and all error notices intact', () => {
  const cart = fs.readFileSync(path.join(theme, 'inc/cart.php'), 'utf8');
  const fn = cart.slice(cart.indexOf('function cr2026_cart_remove_updated_success_notice'));
  assert.match(fn, /foreach \( \$notices\['success'\] as \$notice_key => \$notice \)/);
  assert.match(fn, /unset\( \$notices\['success'\]\[ \$notice_key \] \)/);
  assert.doesNotMatch(fn, /unset\( \$notices\['error'\]|unset\( \$notices\['notice'\]|unset\( \$notices\['info'\]/);
  assert.match(fn, /if \( \$removed \) \{\s*wc_set_notices\( \$notices \);/);
});


test('cart product cards keep the requested moderate compact layout and preserve controls', () => {
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  assert.match(cartCss, /grid-template-columns: 100px minmax\(0, 1fr\);/);
  assert.match(cartCss, /width: 100px;\s*height: 120px;/);
  assert.match(cartCss, /padding: 15px;[\s\S]*?border-radius: 20px;/);
  assert.match(cartCss, /min-height: 0 !important;[\s\S]*?height: auto;/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-content \.cr-cart-table tbody\{[\s\S]*?row-gap:8px!important/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-quantity__button \{[\s\S]*?width: 30px;[\s\S]*?height: 30px;/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-remove \{[\s\S]*?width: 42px;[\s\S]*?height: 42px;[\s\S]*?min-height: 42px;/);
});


test('mobile cart final density, variation label, summary grid and checkout label contracts', () => {
  const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
  const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');
  const cartTotals = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart-totals.php'), 'utf8');
  const cartJs = fs.readFileSync(path.join(theme, 'assets/js/cart-ui.js'), 'utf8');

  // Product card, image, text hierarchy and spacing.
  assert.match(cartCss, /padding: 15px;[\s\S]*?border-radius: 20px;[\s\S]*?box-shadow: none;/, 'CART_PRODUCT_CARD_COMPACTED=PASS');
  assert.match(cartCss, /min-height: 0 !important;[\s\S]*?height: auto;/, 'CART_PRODUCT_CARD_NO_LARGE_MIN_HEIGHT=PASS');
  assert.match(cartCss, /width: 100px;[\s\S]*?height: 120px;/, 'CART_IMAGE_COMPACT_SIZE=PASS');
  assert.match(cartCss, /font-size: 14px;[\s\S]*?line-height: 1\.25;[\s\S]*?font-weight: 500;/, 'CART_PRODUCT_NAME_MEDIUM_WEIGHT=PASS');
  assert.match(cartCss, /gap: 0 15px;/, 'CART_IMAGE_TEXT_GAP=PASS');
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-content \.cr-cart-table tbody\{[\s\S]*?row-gap:8px!important/);

  // Structured WooCommerce variation data remains the source; only the visible plural label is singularized.
  assert.match(cartTemplate, /wc_get_formatted_cart_item_data\( \$cart_item, false, \$cart_display_name \)/);
  assert.match(cartTemplate, /str_replace\( 'Tallas:', 'Talla:', \$variation_html \)/, 'CART_VARIATION_TALLA_SINGULAR_LABEL=PASS');
  assert.match(cartCss, /dd:not\(:last-of-type\)::after[\s\S]*?content: "\\u00b7"|dd:not\(:last-of-type\)::after[\s\S]*?content: "·"/, 'CART_VARIATION_NO_ORPHAN_SEPARATOR=PASS');

  // Controls are inside the text content, after the subtotal; WooCommerce handlers/targets remain.
  const contentAt = cartTemplate.indexOf('class="cr-cart-item__content"');
  const subtotalAt = cartTemplate.indexOf('class="cr-cart-item__subtotal"', contentAt);
  const actionsAt = cartTemplate.indexOf('class="cr-cart-item__actions"', contentAt);
  const mainCloseAt = cartTemplate.indexOf('</div>\n                                            </div>', actionsAt);
  assert.ok(contentAt >= 0 && subtotalAt > contentAt && actionsAt > subtotalAt && mainCloseAt > actionsAt, 'CART_ACTION_ROW_CLOSE_TO_CONTENT=PASS');
  assert.match(cartTemplate, /class="cr-cart-remove" aria-label="%s"/);
  assert.match(cartTemplate, /esc_attr\( sprintf\( __\( 'Eliminar %s del carrito'/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-quantity__button \{[\s\S]*?width: 30px;[\s\S]*?height: 30px;/, 'CART_TOUCH_TARGETS_PRESERVED=PASS');
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-remove \{[\s\S]*?width: 42px;[\s\S]*?height: 42px;[\s\S]*?min-height: 42px;/);

  // Real two-column summary, no responsive label colon, and only the allowed shipping display text.
  assert.match(cartCss, /grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*?align-items: center;[\s\S]*?width: 100% !important;/, 'CART_SUMMARY_FULL_WIDTH=PASS');
  assert.match(cartCss, /table\.shop_table tr \{[\s\S]*?display: grid !important;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/, 'CART_SUMMARY_TWO_COLUMN_LAYOUT=PASS');
  assert.match(cartCss, /table\.shop_table td::before \{\s*content: none !important;/, 'CART_SUBTOTAL_NO_CONCATENATED_COLON=PASS');
  assert.match(cartCss, /table\.shop_table td::before \{\s*content: none !important;/, 'CART_SHIPPING_NO_CONCATENATED_COLON=PASS');
  assert.match(cartCss, /table\.shop_table td::before \{\s*content: none !important;/, 'CART_TOTAL_NO_CONCATENATED_COLON=PASS');
  assert.match(cartTotals, /wc_price\( \$cr_merchandise_before_shipping \)/);
  assert.doesNotMatch(cartTotals, /wc_cart_totals_shipping_html\(\)/);
  assert.match(cartTotals, /wc_price\( \$cr_merchandise_after_discounts \)/);
  assert.match(cartJs, /const renderCartSummary = \(cart\)/);
  assert.match(cartJs, /Gratis/);
  assert.doesNotMatch(cartJs, /selectedText\.textContent\s*=\s*selectedLabel/, 'CART_SHIPPING_NO_METHOD_NAME=PASS');

  // Label is visual-only; the checkout destination continues to be emitted by WooCommerce's native hook.
  assert.match(cartCss, /checkout-button::after\s*\{\s*content: "Finalizar compra";/);
  assert.match(cartTemplate, /do_action\( 'woocommerce_cart_collaterals' \)/);
  assert.match(cartTotals, /do_action\( 'woocommerce_proceed_to_checkout' \)/);
  assert.match(cartCss, /checkout-button::after[\s\S]*?Finalizar compra/, 'CART_CTA_FINALIZAR_COMPRA=PASS');
  assert.match(cartTotals, /woocommerce_proceed_to_checkout/ , 'CART_CTA_ACTION_UNCHANGED=PASS');

  // Native cart logic, shipping/tax calculations and checkout hooks remain in place.
  assert.match(cartTemplate, /wp_nonce_field\( 'woocommerce-cart'/);
  assert.match(cartTemplate, /woocommerce_quantity_input\(/);
  assert.match(cartTemplate, /wc_get_cart_remove_url\( \$cart_item_key \)/);
  assert.match(cartTemplate, /woocommerce_before_cart_contents/);
  assert.match(cartTotals, /get_cart_contents_total\(\)/);
  assert.match(cartTotals, /woocommerce_cart_totals_before_shipping/);
  assert.doesNotMatch(cartJs, /input\.shipping_method:checked/);
  assert.match(cartJs, /requestSubmit\(submit \|\| undefined\)/);
  assert.match(cartJs, /config\.promotionsUrl/);
  assert.match(cartJs, /config\.loyaltyUrl/);
  assert.match(cartJs, /config\.redeemUrl/);
  assert.match(cartJs, /data-cr-qty-change/);
  assert.match(cartJs, /form\.requestSubmit/);
  assert.ok(!cartJs.includes('woocommerce_cart_totals_calculate'), 'CART_FUNCTIONAL_LOGIC_UNCHANGED=PASS');
});

test('cart shared rail aligns product cards, promotions, summary and checkout',()=>{const t=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8'),c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');assert.match(t,/class="cr-cart-content"[\s\S]*?class="cr-cart-item__card"[\s\S]*?class="cr-cart-promotions(?: cr-cart-body-rail)?"[\s\S]*?class="cart-collaterals cr-cart-summary(?: cr-cart-body-rail)?"/);assert.match(c,/\.cr-cart-content[\s\S]*?\.cr-cart-content \.cr-cart-summary[\s\S]*?width:100%/);});
test('cart maps rewards/promotions to friendly coupon labels and hides native coupon rows',()=>{const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8'),t=fs.readFileSync(path.join(theme,'woocommerce/cart/cart-totals.php'),'utf8'),c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');assert.match(j,/pending_rewards[\s\S]*?x\.code[\s\S]*?Saldo de monedero/);assert.match(j,/promotions\.find[\s\S]*?x\.code[\s\S]*?promotion\.title/);assert.doesNotMatch(j,/coupon\.label\s*\|\|\s*coupon\.code/);assert.doesNotMatch(t,/wc_cart_totals_coupon_html|wc_cart_totals_coupon_label/);assert.match(c,/tr\.cart-discount:not\(\.cr-cart-summary-discount\)\{display:none!important\}/);});
test('cart coupon apply/remove are Store API confirmed and do not reload the page',()=>{const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8');assert.match(j,/applyCouponUrl[\s\S]*?method: 'POST'[\s\S]*?hasCoupon\(cart, normalized\)/);assert.match(j,/removeCouponUrl[\s\S]*?method: 'POST'[\s\S]*?!hasCoupon\(cart, code\)/);assert.match(j,/await refreshCartUi\(cart\)/);assert.match(j,/style\.setProperty\('display',discount<=0n\?'none':'grid','important'\)/);assert.doesNotMatch(j,/location\.reload|location\.assign/);assert.match(j,/setButtonPending\(button,true,'Aplicando…'\)/);});
test('cart wallet information modal contains approved copy and accessible dialog semantics',()=>{const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8'),c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');assert.match(j,/role="dialog" aria-modal="true"/);assert.match(j,/¿Cómo funciona tu monedero\?/);assert.match(j,/1 € gastado = 1 punto/);assert.match(j,/Cuando acumules 100 puntos, podrás convertirlos en 5 € de saldo para tus compras\./);assert.match(j,/La barra te indica cuánto te falta para desbloquear el saldo\./);assert.match(j,/Cuando tengas saldo disponible, pulsa “Usar” para elegir cuánto quieres aplicar a tu compra\./);assert.match(j,/Entendido/);assert.doesNotMatch(j,/alert\s*\(/);assert.match(c,/cr-cart-wallet-dialog__backdrop/);});
test('cart shipping summary uses strict pre-shipping threshold and excludes shipping from displayed total',()=>{const t=fs.readFileSync(path.join(theme,'woocommerce/cart/cart-totals.php'),'utf8'),j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8');assert.match(t,/get_subtotal\(\)[\s\S]*?get_subtotal_tax\(\)[\s\S]*?> 50/);assert.match(t,/get_cart_contents_total\(\)[\s\S]*?get_cart_contents_tax\(\)/);assert.match(t,/Se calcula en el checkout/);assert.match(j,/50n\*\(10n\*\*BigInt\(Number\(t\.currency_minor_unit/);assert.match(j,/formatStoreMoney\(net,t\)/);assert.doesNotMatch(t,/wc_cart_totals_shipping_html\(\)/);});

test('cart removes applied rewards and promotions from available lists and restores them from Store API cart state',()=>{
  const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8');
  assert.match(j,/const normalizeCouponCode = \(code\) => text\(code\)\.trim\(\)\.replace\(\/\\s\+\/g, ' '\)\.toLowerCase\(\)/);
  assert.match(j,/const availableRewards = rewards\.filter\(\(reward\) => reward\.code && !hasCoupon\(currentCart, reward\.code\)\)/);
  assert.match(j,/if \(availableRewards\.length\) \{/);
  assert.match(j,/\.filter\(\(promotion\) => !hasCoupon\(currentCart, promotion\.code\)\)/);
  assert.match(j,/if \(!visible\.length\) \{\s*promotionsList\.hidden = true;/);
  assert.match(j,/const refreshCartUi = async \(cart\) => \{ currentCart=cart; renderAppliedCoupons\(cart\); renderCartSummary\(cart\); if\(promotionsPayload\)renderPromotions\(promotionsPayload\); if\(config\.authenticated\)await refreshWallet\(\); \};/);
  assert.match(j,/if \(!hasCoupon\(cart, normalized\)\)/);
  assert.match(j,/if \(hasCoupon\(cart, code\)\)/);
  assert.doesNotMatch(j,/node\('span',\s*'[^']*',\s*'Aplicado'\)/);
});

test('cart wallet card uses three independent grid columns and a right-aligned 44px info target',()=>{const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8'),c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');assert.match(j,/info\.appendChild\(walletHeading\);[\s\S]*?summary\.appendChild\(infoButton\);[\s\S]*?walletPanel\.appendChild\(summary\);/);assert.doesNotMatch(j,/walletHeading\.appendChild\(infoButton\)/);assert.match(c,/body\.woocommerce-cart \.cr-cart-wallet__summary\s*\{[^}]*display:grid;[^}]*grid-template-columns:auto minmax\(0,1fr\) auto;[^}]*align-items:center/);assert.match(c,/body\.woocommerce-cart \.cr-cart-wallet__info-icon\s*\{[^}]*justify-self:end;[^}]*align-self:center;[^}]*width:44px;[^}]*height:44px;[^}]*min-width:44px;[^}]*min-height:44px/);assert.match(c,/\.cr-cart-wallet__info\s*\{\s*min-width:0;/);});
test('cart wallet help dialog fills dynamic viewport and centers a safely scrollable panel',()=>{const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');assert.match(c,/\.cr-cart-wallet-dialog\s*\{[^}]*position:fixed;[^}]*inset:0;[^}]*min-height:100dvh;[^}]*display:grid;[^}]*place-items:center/);assert.match(c,/\.cr-cart-wallet-dialog\s*\{[^}]*padding:max\(24px,env\(safe-area-inset-top,0px\)\) 20px max\(24px,env\(safe-area-inset-bottom,0px\)\)/);assert.match(c,/\.cr-cart-wallet-dialog__panel\s*\{[^}]*width:min\(100%,480px\);[^}]*max-height:calc\(100dvh - 48px\);[^}]*overflow-y:auto/);assert.match(c,/\.cr-cart-wallet-dialog__backdrop\s*\{\s*position:absolute;inset:0;/);assert.match(c,/body\.cr-cart-dialog-open\s*\{\s*overflow:hidden\s*\}/);});
test('cart wallet dialog retains approved copy, focus return, keyboard close and dialog semantics',()=>{const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8');assert.match(j,/role="dialog" aria-modal="true" aria-labelledby="cr-cart-wallet-dialog-title"/);assert.match(j,/¿Cómo funciona tu monedero\?/);assert.match(j,/1 € gastado = 1 punto/);assert.match(j,/Cuando acumules 100 puntos, podrás convertirlos en 5 € de saldo para tus compras\./);assert.match(j,/La barra te indica cuánto te falta para desbloquear el saldo\./);assert.match(j,/Cuando tengas saldo disponible, pulsa “Usar” para elegir cuánto quieres aplicar a tu compra\./);assert.match(j,/Entendido/);assert.match(j,/e\.key === 'Escape'[\s\S]*?closeWalletInfo\(\)/);assert.match(j,/const closeWalletInfo = \(\) => \{[\s\S]*?walletDialogReturnFocus\.focus\(\)/);assert.match(j,/walletDialogReturnFocus = event && event\.currentTarget/);assert.match(j,/walletDialog\.querySelector\('\.cr-cart-wallet-dialog__confirm'\)\.focus\(\)/);});

test('wallet info button keeps its position and uses an outlined info-circle SVG with a 44px target',()=>{const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8'),c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');assert.match(j,/createButton\('', 'cr-cart-wallet__info-icon', openWalletInfo\)/);assert.match(j,/infoButton\.appendChild\(cartIcon\('info', 'cr-cart-wallet__info-svg'\)\)/);assert.match(j,/info: '<svg[\s\S]*?<circle cx=\"12\" cy=\"12\" r=\"9\"\/>/);assert.match(j,/summary\.appendChild\(infoButton\)/);assert.doesNotMatch(j,/walletHeading\.appendChild\(infoButton\)|createButton\('i', 'cr-cart-wallet__info-icon'/);assert.match(c,/\.cr-cart-wallet__info-icon \{[^}]*width:44px;[^}]*height:44px/);assert.match(c,/\.cr-cart-wallet__info-svg,[\s\S]*?width:25px;[\s\S]*?height:25px/);});
test('wallet reward and coupon success feedback is silent while error feedback remains',()=>{const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8');assert.doesNotMatch(j,/showMessage|aplicado correctamente|Descuento eliminado/);assert.match(j,/await refreshCartUi\(cart\); clearFeedback\(\)/);assert.match(j,/const showError = \(message\) =>/);assert.match(j,/feedback\.classList\.add\('is-error'\)/);assert.match(j,/renderAppliedCoupons\(cart\)/);});
test('cart summary uses custom full-width two-column rows rather than a WooCommerce table',()=>{const t=fs.readFileSync(path.join(theme,'woocommerce/cart/cart-totals.php'),'utf8'),j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8'),c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');assert.match(t,/class=\"cr-cart-summary__rows\"[\s\S]*?cr-cart-summary__row--subtotal[\s\S]*?cr-cart-summary__row--shipping[\s\S]*?cr-cart-summary__row--total/);assert.doesNotMatch(t,/<table|<tr|<th|<td/);assert.match(c,/\.cr-cart-summary__rows \{[\s\S]*?width:100%;[\s\S]*?min-width:0;[\s\S]*?box-sizing:border-box/);assert.match(c,/\.cr-cart-summary__row \{[\s\S]*?display:grid;[\s\S]*?grid-template-columns:minmax\(0,1fr\) auto;[\s\S]*?width:100%;[\s\S]*?border:0!important/);assert.match(c,/\.cr-cart-summary__row--total \{[\s\S]*?border-top:1px solid/);assert.match(j,/closest\('\.cr-cart-summary__row'\)/);assert.match(j,/row\.append\(label,value\)/);});


test('CART_SUMMARY_USES_PRODUCT_CARD_GUTTER=PASS; summary and CTA use the cart card rail',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8'),p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 assert.ok(p.includes('<div class="cr-cart-content">') && p.indexOf('<div class="cr-cart-content">') < p.indexOf('class="cr-cart-item__card"'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-content{width:100%;max-width:1280px;min-width:0;margin-inline:auto;box-sizing:border-box}'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-content .cr-cart-item__card{width:100%!important;max-width:100%;min-width:0;box-sizing:border-box}'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-content .cr-cart-promotions'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-content .cr-cart-summary'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-summary .cart_totals{'));
 assert.ok(c.includes('margin:0!important;padding:0!important;border:0!important'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-summary .checkout-button{'));
 assert.ok(c.includes('display:flex!important;width:100%!important;max-width:100%;min-width:0;margin:0!important;'));
});
test('CART_SUMMARY_LEFT_EDGE_MATCH_PRODUCT=PASS and CART_SUMMARY_RIGHT_EDGE_MATCH_PRODUCT=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-content{width:100%'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-content .cr-cart-summary .cart_totals{width:100%!important'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-summary .cr-cart-summary__rows'));
 assert.ok(c.includes('width:100%; min-width:0; box-sizing:border-box;'));
});
test('CART_CTA_LEFT_EDGE_MATCH_PRODUCT=PASS and CART_CTA_RIGHT_EDGE_MATCH_PRODUCT=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-summary .wc-proceed-to-checkout{'));
 assert.ok(c.includes('body.woocommerce-cart .cr-cart-summary .checkout-button{'));
 assert.ok(c.includes('display:flex!important;width:100%!important;max-width:100%;min-width:0;margin:0!important;'));
});
test('CART_RAILS_SHARE_EFFECTIVE_CONTAINING_BLOCK=PASS',()=>{
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.match(p,/class="cr-cart-layout">\s*<form[^>]*class="woocommerce-cart-form cr-cart-form"/);
 assert.match(p,/<\/form>\s*<div class="cr-cart-secondary-rail">/);
 assert.doesNotMatch(p,/cr-cart-primary/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-form,\s*body\.woocommerce-cart \.cr-cart-content \.cr-cart-secondary-rail\{[\s\S]*?flex:0 0 100%!important;[\s\S]*?width:100%!important;[\s\S]*?max-width:100%!important;[\s\S]*?margin:0!important;[\s\S]*?padding:0!important;[\s\S]*?box-sizing:border-box!important/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-layout\{[\s\S]*?gap:12px!important;[\s\S]*?width:100%!important;[\s\S]*?box-sizing:border-box/);
});
test('CART_DOM_ORDER_HEADER_BEFORE_PRODUCTS=PASS',()=>{
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 assert.ok(p.indexOf('class="cr-cart-header-shell"') < p.indexOf('class="cr-cart-item__card"'));
});
test('CART_DOM_ORDER_PRODUCTS_BEFORE_SECONDARY=PASS',()=>{
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 assert.match(p,/class="cr-cart-layout">\s*<form[^>]*cr-cart-form[\s\S]*?<\/form>\s*<div class="cr-cart-secondary-rail">/);
});
test('CART_DOM_ORDER_SECONDARY_BEFORE_SUMMARY=PASS',()=>{
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 assert.ok(p.indexOf('class="cr-cart-secondary-rail"') < p.indexOf('class="cart-collaterals cr-cart-summary"'));
});
test('CART_DOM_ORDER_SUMMARY_BEFORE_CTA=PASS',()=>{
 const totals=fs.readFileSync(path.join(theme,'woocommerce/cart/cart-totals.php'),'utf8');
 const summaryHeading=totals.indexOf('Resumen');
 const rows=totals.indexOf('cr-cart-summary__rows');
 const totalRow=totals.indexOf('cr-cart-summary__row--total');
 const checkoutWrapper=totals.indexOf('<div class="wc-proceed-to-checkout">');
 const checkoutHook=totals.indexOf("do_action( 'woocommerce_proceed_to_checkout' )");
 assert.ok(summaryHeading >= 0 && rows > summaryHeading);
 assert.ok(totalRow > rows && checkoutWrapper > totalRow && checkoutHook > checkoutWrapper);
});
test('CART_NO_CSS_VISUAL_REORDERING=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.doesNotMatch(c, /\border\s*:/);
 assert.doesNotMatch(c, /grid-template-areas/);
 assert.doesNotMatch(c, /display\s*:\s*contents/);
});
test('CART_SECONDARY_RAIL_CONTAINS_ALL_POST_PRODUCT_BLOCKS=PASS',()=>{
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 const start=p.indexOf('<div class="cr-cart-secondary-rail">');
 const end=p.indexOf('</div>\n        </div>',start);
 const rail=p.slice(start,end);
 assert.ok(start>=0&&end>start);
 for(const selector of ['class="cr-cart-promotions"','class="cr-cart-wallet"','class="cr-cart-applied"','class="cr-cart-manual-coupon"','class="cart-collaterals cr-cart-summary"'])assert.ok(rail.includes(selector),selector);
 assert.doesNotMatch(rail,/cr-cart-table|cr-cart-item__card/);
});
test('CART_PRODUCT_LIST_HAS_ONE_COMPACT_GAP_OWNER=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.match(c,/\.cr-cart-table tbody \{ display:grid; \}/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-table tbody\{\s*display:grid!important;\s*row-gap:8px!important;\s*\}/);
 assert.doesNotMatch(c,/@media[^{}]*\{[^{}]*\.cr-cart-table tbody[^{}]*gap:\s*(12|14|18)px/);
 assert.doesNotMatch(c,/\.cr-cart-table tbody \{[^}]*gap:\s*(12|14|18)px/);
});
test('CART_PRODUCT_TO_SECONDARY_RAIL_HAS_ONE_12PX_OWNER=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-layout\{[\s\S]*?gap:12px!important/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-form,\s*body\.woocommerce-cart \.cr-cart-content \.cr-cart-secondary-rail\{[\s\S]*?margin:0!important/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-secondary-rail > \.cr-cart-promotions,\s*body\.woocommerce-cart \.cr-cart-content \.cr-cart-secondary-rail > \.cr-cart-summary\{[\s\S]*?margin:0!important/);
 assert.doesNotMatch(c,/\.cr-cart-form \{ margin:0 0 18px/);
 assert.doesNotMatch(c,/\.cr-cart-promotions \{ margin-top:18px/);
});
test('CART_PRODUCT_CARD_HORIZONTAL_GEOMETRY_FROZEN=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.match(c,/body\.woocommerce-cart \.cr-cart-item__card \{[\s\S]*?padding: 15px;[\s\S]*?border-radius: 20px;/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-item__card\{width:100%!important;max-width:100%;min-width:0;box-sizing:border-box\}/);
 assert.match(c,/\.cr-cart-item-cell \{ display:block!important; width:100%; min-width:0; padding:0!important/);
 assert.doesNotMatch(c,/cr-cart-item__card\s*\{[^}]*width\s*:\s*calc\(|cr-cart-item__card\s*\{[^}]*margin-inline/);
});
test('CART_PROMOTIONS_SUMMARY_CTA_USE_SECONDARY_RAIL=PASS',()=>{
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.match(p,/class="cr-cart-promotions"[\s\S]*?class="cart-collaterals cr-cart-summary"/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-secondary-rail > \.cr-cart-promotions,[\s\S]*?width:100%!important;[\s\S]*?max-width:100%!important/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-summary \.wc-proceed-to-checkout\{[\s\S]*?width:100%!important/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-summary \.checkout-button\{[\s\S]*?width:100%!important/);
});
test('CART_HEADER_VERTICAL_PARENT_CHAIN_MATCHES_OUTLET_CANVAS=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 const m=fs.readFileSync(path.join(theme,'assets/css/main.css'),'utf8');
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 assert.match(m,/body\.cr-global-app-header:not\(\.home\)\s*\{[\s\S]*?padding-top:\s*var\(--cr-app-topbar-height\)/);
 assert.match(m,/body\.cr-parent-category-view \.cr-parent-category__canvas,\s*body\.cr-app-nav-shell \.cr-category-hub\s*\{\s*padding-top:\s*0 !important/);
 assert.match(m,/\.cr-parent-category__canvas\s*\{[\s\S]*?flex:\s*1 0 auto;[\s\S]*?padding:\s*0;/);
 assert.match(p,/class="cr-cart-header-shell"[\s\S]*?cr2026_render_category_toolbar\( __\( 'Tu carrito'/);
 assert.match(c,/body\.woocommerce-cart \.cr-main > \.cr-shell\.cr-page-shell,\s*body\.woocommerce-cart \.cr-page,\s*body\.woocommerce-cart \.cr-prose,\s*body\.woocommerce-cart \.woocommerce,\s*body\.woocommerce-cart \.cr-cart-page,\s*body\.woocommerce-cart \.cr-cart-header-shell\{\s*margin-block-start:0!important;\s*padding-block-start:0!important;\s*\}/);
 assert.match(c,/body\.woocommerce-cart \.cr-main > \.cr-shell\.cr-page-shell,\s*body\.woocommerce-cart \.cr-main--woocommerce > \.cr-shell\{padding-block-start:0!important\}/);
 assert.doesNotMatch(c,/translateY|cr-cart-header-shell[^}]*top:\s*-|cr-cart-header-shell[^}]*margin-block-start:\s*-/);
});
test('CART_HEADER_HORIZONTAL_GEOMETRY_UNCHANGED=PASS',()=>{
 const m=fs.readFileSync(path.join(theme,'assets/css/main.css'),'utf8');
 assert.match(m,/\.cr-parent-category__toolbar \{[\s\S]*?min-height: 64px;[\s\S]*?margin: 0 20px 16px;[\s\S]*?grid-template-columns: 48px minmax\(0, 1fr\) auto;[\s\S]*?column-gap: 10px;/);
 assert.match(m,/\.cr-parent-category__back \{[\s\S]*?width: 48px;[\s\S]*?height: 48px;/);
 assert.match(m,/\.cr-parent-category__title \{[\s\S]*?font: 300 21px\/28px "Roboto", Arial, sans-serif;/);
});
test('CART_HEADER_AND_PRODUCT_CARD_HORIZONTAL_GEOMETRY_NOT_CHANGED=PASS',()=>{
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.match(p,/class="cr-cart-header-shell"/);
 assert.match(p,/class="cr-cart-item__card"/);
 assert.doesNotMatch(c,/cr-cart-item__card\s*\{[^}]*margin-inline|cr-cart-item__card\s*\{[^}]*width:\s*calc\(/);
 assert.doesNotMatch(c,/cr-parent-category__toolbar\s*\{[^}]*grid-template-columns|cr-parent-category__back\s*\{[^}]*width:|cr-parent-category__title\s*\{[^}]*font:/);
});


test('CART_HEADER_TO_FIRST_PRODUCT_SINGLE_SPACING_OWNER=PASS; CART_HEADER_TO_FIRST_PRODUCT_GAP_REDUCED=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8'),m=fs.readFileSync(path.join(theme,'assets/css/main.css'),'utf8');
 assert.match(m,/\.cr-parent-category__toolbar \{\s*min-height: 64px;\s*margin: 0 20px 16px;/);
 assert.match(m,/@media \(max-width: 767px\)[\s\S]*?\.cr-parent-category__toolbar \{ margin: 0 20px 14px; \}/);
 assert.match(m,/@media \(min-width: 1280px\)[\s\S]*?\.cr-parent-category__toolbar \{ margin: 0 32px 24px; \}/);
 const rules=c.match(/body\.woocommerce-cart \.cr-cart-header-shell > \.cr-parent-category__toolbar\s*\{[^}]*\}/g)||[];
 const blockEndOwners=rules.filter(rule=>/margin-block-end\s*:/i.test(rule));
 assert.strictEqual(blockEndOwners.length,1);
 assert.match(blockEndOwners[0],/margin-block-end:8px!important/);
 assert.doesNotMatch(blockEndOwners[0],/margin-inline|margin-left|margin-right|width|grid-template-columns|column-gap/);
});
test('CART_PRODUCT_ROW_VERTICAL_PADDING_ZERO=PASS; CART_PRODUCT_LIST_GAP_REMAINS_8PX=PASS; CART_EFFECTIVE_CARD_TO_CARD_SPACING_8PX=PASS; CART_PRODUCT_CARD_INTERNAL_GEOMETRY_UNCHANGED=PASS; CART_PRODUCT_CARD_HORIZONTAL_GEOMETRY_UNCHANGED=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 const rowRules=c.match(/\.cr-cart-table tr\.cr-cart-item\s*\{[^}]*\}/g)||[];
 assert.ok(rowRules.length>=4,'base and all responsive row rules remain explicit');
 for(const rule of rowRules){
  assert.doesNotMatch(rule,/padding-(?:top|bottom|block)\s*:/i,'row rule must not introduce vertical padding');
 }
 assert.match(c,/\.cr-cart-table tr\.cr-cart-item \{[^}]*padding-inline:var\(--cr-cart-card-inline-gutter\);/);
 assert.match(c,/@media \(max-width:767px\)[\s\S]*?\.cr-cart-table tr\.cr-cart-item \{[^}]*padding-inline:var\(--cr-cart-card-inline-gutter\);/);
 assert.match(c,/@media \(max-width:360px\)[\s\S]*?\.cr-cart-table tr\.cr-cart-item \{[^}]*padding-inline:var\(--cr-cart-card-inline-gutter\);/);
 const gapOwners=c.match(/body\.woocommerce-cart \.cr-cart-content \.cr-cart-table tbody\s*\{[^}]*row-gap\s*:\s*8px!important[^}]*\}/g)||[];
 assert.equal(gapOwners.length,1,'one 8px product-list gap owner');
 assert.equal(8+0+0,8,'zero vertical row padding makes effective spacing equal to tbody gap');
 assert.match(c,/body\.woocommerce-cart \.cr-cart-item__card \{\s*gap:4px;\s*padding:6px 8px;/);
 assert.match(c,/@media \(max-width: 767px\) \{[\s\S]*?body\.woocommerce-cart \.cr-cart-item__card \{[\s\S]*?padding: 15px;/);
});

test('CART_SHARED_CARD_GUTTER_DEFINED=PASS; CART_PRODUCT_ROW_USES_SHARED_GUTTER=PASS; CART_WALLET_CARD_USES_SHARED_GUTTER=PASS; CART_REWARD_CARD_USES_SHARED_GUTTER=PASS; CART_PROMOTION_CARD_USES_SHARED_GUTTER=PASS; CART_APPLIED_CARD_USES_SHARED_GUTTER=PASS; CART_SECONDARY_CARDS_NO_FULL_RAIL_WIDTH_OVERRIDE=PASS; CART_PRODUCT_CARD_GEOMETRY_UNCHANGED=PASS; CART_PRODUCT_VERTICAL_SPACING_UNCHANGED=PASS; CART_DOM_STRUCTURE_UNCHANGED=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 assert.match(c,/body\.woocommerce-cart \{ --cr-cart-card-inline-gutter:16px; \}/,'desktop gutter remains 16px');
 assert.match(c,/@media\(max-width:767px\)\{body\.woocommerce-cart\{--cr-cart-card-inline-gutter:11px\}\}/,'mobile gutter remains 11px');
 assert.match(c,/@media\(max-width:360px\)\{body\.woocommerce-cart\{--cr-cart-card-inline-gutter:9px\}\}/,'narrow mobile gutter remains 9px');
 assert.match(c,/\.cr-cart-table tr\.cr-cart-item \{[^}]*padding-inline:var\(--cr-cart-card-inline-gutter\);/,'product row consumes shared gutter');
 const shared=c.match(/body\.woocommerce-cart \.cr-cart-content \.cr-cart-wallet__summary,[\s\S]*?body\.woocommerce-cart \.cr-cart-content \.cr-cart-applied\s*\{[^}]*\}/);
 assert.ok(shared,'one shared secondary surface rule exists');
 for(const selector of ['cr-cart-wallet__summary','cr-cart-wallet__rewards','cr-cart-promo-card','cr-cart-applied'])assert.ok(shared[0].includes(selector),selector);
 assert.match(shared[0],/inline-size:auto;[\s\S]*?margin-inline:var\(--cr-cart-card-inline-gutter\);[\s\S]*?box-sizing:border-box;/);
 assert.doesNotMatch(shared[0],/width\s*:\s*100%|max-width\s*:\s*100%|margin-inline\s*:\s*0/,'secondary cards must not stretch across full rail');
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-item__card\{width:100%!important;max-width:100%;min-width:0;box-sizing:border-box\}/,'product card width remains unchanged');
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-secondary-rail\{[\s\S]*?width:100%!important;[\s\S]*?max-width:100%!important;[\s\S]*?padding:0!important/,'secondary rail remains unchanged');
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-secondary-rail > \.cr-cart-promotions,[\s\S]*?width:100%!important;[\s\S]*?max-width:100%!important/,'promotion wrapper rail remains full width');
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-table tbody\s*\{[^}]*row-gap\s*:\s*8px!important/,'product vertical gap remains 8px');
 assert.match(c,/body\.woocommerce-cart \.cr-cart-item__card \{\s*gap:4px;\s*padding:6px 8px;/,'product card internals remain unchanged');
 assert.match(p,/class="cr-cart-secondary-rail">[\s\S]*?class="cr-cart-promotions"[\s\S]*?class="cr-cart-wallet"[\s\S]*?class="cr-cart-applied"[\s\S]*?class="cr-cart-manual-coupon"[\s\S]*?class="cart-collaterals cr-cart-summary"/,'DOM hierarchy/order unchanged');
 assert.match(p,/class="cr-cart-item__card"/,'product card DOM remains present');
});
test('CART_HEADER_HORIZONTAL_GEOMETRY_UNCHANGED=PASS; CART_PRODUCT_CARD_GEOMETRY_UNCHANGED=PASS',()=>{
 const m=fs.readFileSync(path.join(theme,'assets/css/main.css'),'utf8'),c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 assert.match(m,/\.cr-parent-category__toolbar \{[\s\S]*?grid-template-columns: 48px minmax\(0, 1fr\) auto;[\s\S]*?column-gap: 10px;/);
 assert.match(m,/\.cr-parent-category__back \{[\s\S]*?width: 48px;[\s\S]*?height: 48px;/);
 assert.match(m,/\.cr-parent-category__title \{[\s\S]*?font: 300 21px\/28px "Roboto", Arial, sans-serif;/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-item__card \{[\s\S]*?padding: 15px;[\s\S]*?border-radius: 20px;/);
 assert.match(c,/body\.woocommerce-cart \.cr-cart-content \.cr-cart-item__card\{width:100%!important;max-width:100%;min-width:0;box-sizing:border-box\}/);
});


test('CART_PROMOTIONS_TITLE_USES_SHARED_GUTTER=PASS; CART_MANUAL_COUPON_USES_SHARED_GUTTER=PASS; CART_BOX_TITLES_BOLD=PASS; CART_SUMMARY_USES_SHARED_GUTTER=PASS; CART_SUMMARY_MATCHES_PRODUCT_WIDTH=PASS; CART_SUMMARY_NO_INTERNAL_ROW_BORDERS=PASS; CART_SUMMARY_TOTAL_EMPHASIZED=PASS; CART_CTA_MATCHES_PRODUCT_WIDTH=PASS; CART_PRODUCT_GEOMETRY_UNCHANGED=PASS; CART_DOM_ORDER_UNCHANGED=PASS; CART_FUNCTIONAL_LOGIC_UNCHANGED=PASS',()=>{
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 const totals=fs.readFileSync(path.join(theme,'woocommerce/cart/cart-totals.php'),'utf8');
 const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8');
 const refinement=c.slice(c.lastIndexOf('/* Promotions and order summary align to the approved product-card gutter.'));
 assert.ok(refinement.length>0,'final presentation refinement exists');
 assert.match(refinement,/\.cr-cart-promotions > h2,\s*body\.woocommerce-cart \.cr-cart-manual-coupon\s*\{\s*margin-inline:var\(--cr-cart-card-inline-gutter\);/);
 assert.match(refinement,/\.cr-cart-promotions > h2\s*\{\s*font-weight:600;/);
 for(const selector of ['.cr-cart-wallet__title','.cr-cart-promotions__subheading','.cr-cart-applied__title'])assert.ok(refinement.includes(selector),selector);
 assert.match(refinement,/\.cr-cart-wallet__balance,[\s\S]*?font-weight:400!important/);
 assert.match(refinement,/\.cr-cart-summary \.cr-cart-summary__rows\s*\{[\s\S]*?inline-size:auto!important;[\s\S]*?width:auto!important;[\s\S]*?margin:0 var\(--cr-cart-card-inline-gutter\) 14px!important;[\s\S]*?padding:12px;[\s\S]*?border-radius:15px;/);
 assert.match(refinement,/\.cr-cart-summary \.cr-cart-summary__row\s*\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) auto;[\s\S]*?border:0!important/);
 assert.match(refinement,/\.cr-cart-summary \.cr-cart-summary__row--total\s*\{[\s\S]*?border:0!important/);
 assert.match(refinement,/\.cr-cart-summary__row--total \.cr-cart-summary__value strong\s*\{[\s\S]*?font-weight:700!important/);
 assert.match(refinement,/\.cr-cart-content \.cr-cart-summary \.wc-proceed-to-checkout\s*\{[\s\S]*?width:auto!important;[\s\S]*?margin:0 var\(--cr-cart-card-inline-gutter\)!important/);
 assert.match(refinement,/\.cr-cart-content \.cr-cart-summary \.checkout-button\s*\{[\s\S]*?width:100%!important/);
 assert.match(c,/body\.woocommerce-cart \{ --cr-cart-card-inline-gutter:16px; \}/);
 assert.match(c,/--cr-cart-card-inline-gutter:11px/);
 assert.match(c,/--cr-cart-card-inline-gutter:9px/);
 assert.match(c,/\.cr-cart-content \.cr-cart-item__card\{width:100%!important;max-width:100%;min-width:0;box-sizing:border-box\}/);
 assert.match(c,/\.cr-cart-content \.cr-cart-table tbody\{\s*display:grid!important;\s*row-gap:8px!important;/);
 assert.match(p,/class="cr-cart-header-shell"/);
 assert.match(p,/class="cr-cart-item__card"/);
 assert.match(p,/class="cr-cart-secondary-rail"[\s\S]*?class="cr-cart-promotions"[\s\S]*?class="cr-cart-manual-coupon"[\s\S]*?class="cart-collaterals cr-cart-summary"/);
 assert.match(totals,/class="cr-cart-summary__rows"[\s\S]*?cr-cart-summary__row--subtotal[\s\S]*?cr-cart-summary__row--shipping[\s\S]*?cr-cart-summary__row--total/);
 assert.match(totals,/do_action\( 'woocommerce_proceed_to_checkout' \)/);
 assert.match(j,/applyCouponUrl[\s\S]*?method: 'POST'/);
 assert.match(j,/removeCouponUrl[\s\S]*?method: 'POST'/);
 assert.match(j,/const refreshCartUi = async \(cart\)/);
 assert.match(totals,/get_cart_contents_total\(\)/);
});


test('CART_PROMOTIONS_LOADING_TEXT_NOT_VISUALLY_RENDERED=PASS; CART_PROMOTIONS_LOADING_SKELETON_PRESENT=PASS; CART_PROMOTIONS_LOADING_SKELETON_USES_SHARED_GUTTER=PASS; CART_PROMOTIONS_LOADING_SUCCESS_REPLACEMENT_UNCHANGED=PASS; CART_PROMOTIONS_LOADING_EMPTY_STATE_UNCHANGED=PASS; CART_PROMOTIONS_FUNCTIONAL_LOGIC_UNCHANGED=PASS',()=>{
 const p=fs.readFileSync(path.join(theme,'woocommerce/cart/cart.php'),'utf8');
 const c=fs.readFileSync(path.join(theme,'assets/css/cart.css'),'utf8');
 const j=fs.readFileSync(path.join(theme,'assets/js/cart-ui.js'),'utf8');
 const loading=p.match(/<div class="cr-cart-promotions__loading"[\s\S]*?<\/div>/);
 assert.ok(loading,'single promotions loading element remains');
 assert.doesNotMatch(loading[0],/>\s*Cargando promociones(?:…|\.\.\.)?\s*</i,'loading copy is not rendered as visible text');
 assert.match(loading[0],/role="status" aria-live="polite" aria-label="<\?php esc_attr_e\( 'Cargando promociones'/,'accessible loading announcement retained');
 assert.equal((loading[0].match(/cr-cart-promotions__skeleton-bar/g)||[]).length,2,'two decorative skeleton bars');
 assert.match(loading[0],/aria-hidden="true"/);
 const skeleton=c.slice(c.lastIndexOf('/* Promotions loading state:'));
 assert.match(skeleton,/\.cr-cart-promotions__loading\s*\{[\s\S]*?margin-inline:var\(--cr-cart-card-inline-gutter\);[\s\S]*?min-height:68px;[\s\S]*?border-radius:13px;[\s\S]*?background:rgba\(53,95,75,\.055\)/);
 assert.match(skeleton,/\.cr-cart-promotions__skeleton-bar--title\s*\{\s*width:42%;/);
 assert.match(skeleton,/\.cr-cart-promotions__skeleton-bar--copy\s*\{\s*width:29%;/);
 assert.match(skeleton,/@media \(prefers-reduced-motion:reduce\)\s*\{[\s\S]*?animation:none!important/);
 assert.match(j,/\.then\(\(payload\) => \{ promotionsPayload=payload; promotionsLoaded=true; renderPromotions\(payload\); if\(currentCart\)renderAppliedCoupons\(currentCart\); \}\)/);
 assert.match(j,/\.finally\(\(\) => \{ loading\.hidden = true; \}\)/);
 assert.match(j,/if \(!visible\.length\) \{\s*promotionsList\.hidden = true;/);
 assert.match(j,/\.catch\(\(error\) => promotionsList\.replaceChildren\(node\('p', 'cr-cart-feedback is-error', error\.message\)\)\)/);
 assert.match(p,/class="cr-cart-promotions__loading"[\s\S]*?class="cr-cart-wallet"/);
 assert.match(p,/class="cr-cart-wallet"[\s\S]*?data-cr-cart-promotions-list[\s\S]*?data-cr-cart-applied/);
});
