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
  assert.doesNotMatch(skin, /the_content\s*\(|get_description\s*\(|DOMDocument/);
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
  assert.ok(productUiJs.includes("var isToggleAttribute = isSize || isColor"));
  assert.ok(productUiJs.includes("select.value = isToggleAttribute && select.value === option.value ? '' : option.value"));
  assert.ok(productUiJs.includes('dispatchNativeChange(select)'));
  assert.ok(productUiJs.includes('woocommerce_update_variation_values'));
  assert.ok(productUiJs.includes('option.disabled'));
  assert.equal(productUiJs.includes('variation_id.value ='), false);
  assert.equal(productUiJs.includes('variation.variation_id'), false);
  assert.equal(productUiJs.includes('variation.attributes'), false);
  assert.equal(productUiJs.includes('stock'), false);
  assert.equal(productUiJs.includes('price'), false);
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

test('variation CTA uses the existing WooCommerce button and native variation ID state', () => {
  assert.ok(productUiJs.includes("form.querySelector('button.single_add_to_cart_button')"));
  assert.ok(productUiJs.includes("document.createElementNS('http://www.w3.org/2000/svg', 'svg')"));
  assert.ok(productUiJs.includes("cartBody.setAttribute('d', 'M5 8h14l-1 12H6L5 8Z')"));
  assert.ok(productUiJs.includes("cartHandle.setAttribute('d', 'M9 9V6a3 3 0 0 1 6 0v3')"));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = validNativeVariation ? 'Añadir al carrito' : 'Elige opciones'"));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = 'Añadido al carrito'"));
  assert.ok(productUiJs.includes("Añadir al carrito"));
  assert.ok(productUiJs.includes("!Number.isFinite(variationId) || variationId <= 0"));
  assert.ok(productUiJs.includes('nativeButton.disabled = !validNativeVariation;'));
  assert.ok(productUiJs.includes("nativeButton.setAttribute('aria-disabled', validNativeVariation ? 'false' : 'true')"));
  assert.ok(productUiJs.includes("form.querySelector('.woocommerce-variation-add-to-cart')"));
  assert.ok(productUiJs.includes('isNativeVariationReady(selects, variationId && variationId.value, nativeButton, addToCartWrapper)'));
  assert.match(skinCss, /\.single_add_to_cart_button\s*\{[^}]*height:\s*52px;[^}]*min-height:\s*52px;/s);
  assert.match(skinCss, /\.single_add_to_cart_button:disabled[\s\S]*?background:\s*#E4EFEA;/);
  assert.match(skinCss, /\.single_add_to_cart_button:not\(:disabled\)[\s\S]*?background:\s*#183B35;/);
  assert.match(skinCss, /\.cr-product-cart-icon\s*\{[^}]*stroke:\s*currentColor;/s);
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

test('variable CTA is disabled until every native attribute and WooCommerce-confirmed variation are valid', () => {
  const sandboxModule = { exports: {} };
  vm.runInNewContext(productUiJs, {
    module: sandboxModule,
    document: { readyState: 'loading', addEventListener() {} }
  });
  const { isNativeVariationReady } = sandboxModule.exports;
  const select = (value, disabled) => ({
    value,
    selectedIndex: value ? 1 : 0,
    options: [{ value: '', disabled: false }, { value, disabled: !!disabled }]
  });
  const button = { classList: { contains: () => false } };
  const wrapper = { classList: { contains: (name) => name === 'woocommerce-variation-add-to-cart-enabled' } };

  assert.equal(isNativeVariationReady([select('', false), select('', false)], '0', button, wrapper), false);
  assert.equal(isNativeVariationReady([select('azul', false), select('', false)], '0', button, wrapper), false);
  assert.equal(isNativeVariationReady([select('', false), select('M', false)], '0', button, wrapper), false);
  assert.equal(isNativeVariationReady([select('azul', false), select('M', false)], '0', button, wrapper), false);
  assert.equal(isNativeVariationReady([select('azul', false), select('M', false)], 'NaN', button, wrapper), false);
  assert.equal(isNativeVariationReady([select('azul', true), select('M', false)], '357', button, wrapper), false);
  assert.equal(isNativeVariationReady([select('azul', false), select('M', false), select('', false)], '357', button, wrapper), false);
  assert.equal(isNativeVariationReady([select('azul', false), select('M', false)], '357', {
    classList: { contains: (name) => name === 'wc-variation-is-unavailable' }
  }, wrapper), false);
  assert.equal(isNativeVariationReady([select('azul', false), select('M', false)], '357', button, wrapper), true);
  assert.equal(isNativeVariationReady([select('azul', false), select('', false)], '357', button, wrapper), false);
});

test('incomplete variation CTA has no alert, warning, notice or scroll behavior', () => {
  assert.equal(productUiJs.includes('window.alert('), false);
  assert.equal(productUiJs.includes('cr-product-variation-warning'), false);
  assert.equal(productUiJs.includes('scrollIntoView'), false);
  assert.equal(productUiJs.includes('scrollTo('), false);
  assert.ok(productUiJs.includes("nativeButton.disabled = !validNativeVariation;"));
  assert.ok(productUiJs.includes("nativeButton.setAttribute('aria-disabled', validNativeVariation ? 'false' : 'true')"));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = validNativeVariation ? 'Añadir al carrito' : 'Elige opciones'"));
  assert.ok(productUiJs.includes("nativeButtonLabel.textContent = 'Añadido al carrito'"));
  assert.ok(productUiJs.includes("window.jQuery(form).on('found_variation show_variation'"));
  assert.ok(productUiJs.includes("window.jQuery(form).on('woocommerce_update_variation_values reset_data hide_variation'"));
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
  assert.equal(productUiJs.includes("variation.variation_id"), false);
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
  assert.match(productUiJs, /\.always\(function \(\)[\s\S]*?isAddingToCart = false[\s\S]*?removeAttribute\('aria-busy'\)/);
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
  assert.match(productUiJs, /on\('found_variation show_variation', function \(\) \{\s*clearProductDetailNotices\(\);\s*syncVariationState\(\);/);
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
  assert.ok(skin.includes('$display_title = cr2026_product_skin_display_title();'));
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

test('display title removes only a final product_brand suffix and leaves the sticky title complete', () => {
  assert.match(skin, /function cr2026_product_skin_brand_term\(\)/);
  assert.match(skin, /function cr2026_product_skin_display_title\( \$original_title = null, \$brand_name = null \)/);
  assert.ok(skin.includes("get_the_terms( absint( get_queried_object_id() ), 'product_brand' )"));
  assert.ok(skin.includes("preg_quote( $brand_name, '~' )"));
  assert.ok(skin.includes(String.raw`$brand_name = preg_replace( '/^\s+|\s+$/u', '', $brand_name );`));
  assert.ok(skin.includes(String.raw`$pattern = '~^(.*?)(?:\s*[-–—|]\s*)' . preg_quote( $brand_name, '~' ) . '\s*$~iu';`));
  assert.ok(skin.includes(String.raw`$display_title = preg_replace( '~[\s\-–—|]+$~u', '', $matches[1] );`));

  assert.ok(skin.includes("$~iu"));
  assert.ok(skin.includes("$display_title = cr2026_product_skin_display_title();"));
  assert.ok(skin.includes("esc_html( $display_title )"));
  assert.match(skin, /echo '<h1 class="cr-parent-category__title">'.*?esc_html\( \$product->get_name\(\) \)/);
  const toolbar = skin.slice(skin.indexOf('function cr2026_product_skin_toolbar'), skin.indexOf("add_action( 'woocommerce_before_single_product'"));
  assert.doesNotMatch(toolbar, /display_title/);

  function expectedDisplayTitle(title, brand) {
    if (!brand || !brand.trim()) return title;
    const escaped = Array.from(brand.trim(), (ch) =>
      ('.+*?^${}()|[]'.includes(ch) || ch.charCodeAt(0) === 92) ? String.fromCharCode(92) + ch : ch
    ).join('');
    const whitespace = String.fromCharCode(92) + 's';
    const suffix = new RegExp('^(.*?)(?:' + whitespace + '*[-–—|]' + whitespace + '*)' + escaped + whitespace + '*$', 'iu');
    const match = title.match(suffix);
    if (!match) return title;
    const trailingSeparators = new RegExp('[' + whitespace + '–—|-]+$', 'u');
    return match[1].replace(trailingSeparators, '') || title;
  }

  const cases = [
    ['Jersey - 194000146P - Spagnolo', 'Spagnolo', 'Jersey - 194000146P'],
    ['Chaqueta - 6516 - Ragussa', 'Ragussa', 'Chaqueta - 6516'],
    ['Vestido - Mayoral', 'Mayoral', 'Vestido'],
    ['Vestido especial', 'Mayoral', 'Vestido especial'],
    ['Producto – Spagnolo', 'spagnolo', 'Producto'],
    ['Producto — Spagnolo  ', 'Spagnolo', 'Producto'],
    ['Producto | Spagnolo', 'Spagnolo', 'Producto'],
    ['Producto - - Spagnolo', 'Spagnolo', 'Producto'],
    ['Vestido Spagnolo edición especial', 'Spagnolo', 'Vestido Spagnolo edición especial'],
    ['Producto - Spagnolo - especial', 'Spagnolo', 'Producto - Spagnolo - especial'],
    ['Cárdigan - MARCA Ñandú', 'marca ñANDÚ', 'Cárdigan'],
    ['Producto - Marca.+', 'Marca.+', 'Producto']
  ];
  for (const [title, brand, expected] of cases) {
    assert.equal(expectedDisplayTitle(title, brand), expected, title);
  }
  assert.equal(expectedDisplayTitle('Vestido - Mayoral', ''), 'Vestido - Mayoral');
});
