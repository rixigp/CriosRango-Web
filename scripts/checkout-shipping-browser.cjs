'use strict';
const { chromium } = require('playwright');
const BASE_URL = (process.env.STAGING_BASE_URL || 'https://criosrango.es/prueba').replace(/\/+$/, '');
function log(key, value) { console.log(key + '=' + value); }
async function visit(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  if (!response || response.status() >= 400) throw new Error('BROWSER_NAVIGATION_FAILED=' + url + ' STATUS=' + (response ? response.status() : 'NO_RESPONSE'));
  await page.waitForTimeout(900);
}
async function addPurchasableProduct(page) {
  await visit(page, BASE_URL + '/');
  const productUrls = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return Array.from(new Set(links
      .filter(link => /\/(producto|product)\//i.test(link.href))
      .map(link => link.href)))
      .slice(0, 12);
  });
  if (!productUrls.length) throw new Error('STAGING_PRODUCT_LINK_NOT_FOUND_FROM_HOME');

  for (const productUrl of productUrls) {
    await visit(page, productUrl);
    const formState = await page.evaluate(() => {
      const form = document.querySelector('form.cart');
      const button = form && form.querySelector('.single_add_to_cart_button');
      const selects = form ? Array.from(form.querySelectorAll('select[name^="attribute_"]')) : [];
      return { hasForm: Boolean(form), hasButton: Boolean(button), variationCount: selects.length };
    });
    if (!formState.hasForm || !formState.hasButton) continue;

    const variationSelects = page.locator('form.cart select[name^="attribute_"]');
    for (let i = 0; i < formState.variationCount; i += 1) {
      const select = variationSelects.nth(i);
      const firstAvailable = await select.locator('option').evaluateAll(options => {
        const option = options.find(item => item.value && !item.disabled);
        return option ? option.value : '';
      });
      if (!firstAvailable) break;
      await select.selectOption(firstAvailable);
    }

    const addButton = page.locator('form.cart .single_add_to_cart_button').first();
    const enabled = await page.waitForFunction(() => {
      const button = document.querySelector('form.cart .single_add_to_cart_button');
      return Boolean(button && !button.disabled && !button.classList.contains('disabled'));
    }, null, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!enabled) continue;

    await addButton.click({ timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(1200);
    await visit(page, BASE_URL + '/carrito/');
    const cartRows = await page.locator('.woocommerce-cart-form .cart_item').count().catch(() => 0);
    if (cartRows > 0) {
      log('CHECKOUT_TEST_PRODUCT_URL', productUrl);
      log('CHECKOUT_TEST_CART_ITEMS_COUNT', cartRows);
      return;
    }
  }
  throw new Error('NO_PURCHASABLE_PRODUCT_ADDED_FROM_PRODUCT_PAGES');
}
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const checkoutUrl = BASE_URL + '/finalizar-compra/';
  async function waitForCheckoutUpdate(action, label) {
    const previous = await page.evaluate(() => window.__crShippingUpdateCount || 0);
    const responsePromise = page.waitForResponse(response => response.url().includes('update_order_review') && response.request().method() === 'POST', { timeout: 30000 });
    await action();
    const response = await responsePromise;
    if (!response.ok()) throw new Error('CHECKOUT_AJAX_FAILED_' + label + '=' + response.status());
    await page.waitForFunction(count => (window.__crShippingUpdateCount || 0) > count, previous, { timeout: 30000 });
  }
  async function snapshot() {
    return page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('.cr-checkout-shipping-section'));
      const lists = Array.from(document.querySelectorAll('.cr-checkout-shipping-section #shipping_method.woocommerce-shipping-methods'));
      const rows = Array.from(document.querySelectorAll('.cr-checkout-shipping-section #shipping_method > li'));
      const labels = rows.map(row => (row.querySelector('label')?.innerText || row.innerText || '').replace(/\s+/g, ' ').trim());
      const radios = rows.flatMap(row => Array.from(row.querySelectorAll('input.shipping_method[type="radio"]')));
      const total = document.querySelector('.woocommerce-checkout-review-order-table .order-total');
      const additional = Array.from(document.querySelectorAll('.woocommerce-additional-fields'));
      const additionalInfo = additional[0] || null;
      const textarea = additionalInfo && additionalInfo.querySelector('#order_comments');
      const shell = textarea && textarea.closest('.cr-control-shell');
      const shippingBeforeAdditionalInfo = Boolean(sections[0] && additionalInfo
        && (sections[0].compareDocumentPosition(additionalInfo) & Node.DOCUMENT_POSITION_FOLLOWING));
      let textareaContentClipped = null;
      if (textarea) {
        const originalValue = textarea.value;
        textarea.value = 'Primera línea de prueba\\nSegunda línea de prueba';
        textareaContentClipped = textarea.scrollHeight > textarea.clientHeight + 1;
        textarea.value = originalValue;
      }
      const textareaStyle = textarea ? window.getComputedStyle(textarea) : null;
      return {
        sectionCount: sections.length,
        methodsRenderCount: lists.length,
        radioCount: radios.length,
        labels,
        totalText: total ? total.innerText.replace(/\\s+/g, ' ').trim() : '',
        additionalInfoCount: additional.length,
        shippingBeforeAdditionalInfo,
        textareaMinHeight: textareaStyle ? textareaStyle.minHeight : '',
        textareaHeight: textarea ? textarea.getBoundingClientRect().height : 0,
        textareaFontSize: textareaStyle ? textareaStyle.fontSize : '',
        textareaLineHeight: textareaStyle ? textareaStyle.lineHeight : '',
        textareaPaddingTop: textareaStyle ? textareaStyle.paddingTop : '',
        textareaPaddingBottom: textareaStyle ? textareaStyle.paddingBottom : '',
        textareaShellHeight: shell ? shell.getBoundingClientRect().height : 0,
        textareaContentClipped
      };
    });
  }
  async function assertSingle(stage) {
    const state = await snapshot();
    log('SHIPPING_SECTION_COUNT_' + stage, state.sectionCount);
    log('SHIPPING_METHODS_RENDER_COUNT_' + stage, state.methodsRenderCount);
    if (state.sectionCount !== 1 || state.methodsRenderCount !== 1) throw new Error('DUPLICATE_SHIPPING_SECTION_' + stage + '=' + JSON.stringify(state));
    if (state.additionalInfoCount !== 1 || !state.shippingBeforeAdditionalInfo) throw new Error('ADDITIONAL_INFO_ORDER_FAILED_' + stage + '=' + JSON.stringify(state));
    if (state.textareaMinHeight !== '88px' || state.textareaHeight < 88 || state.textareaShellHeight < 88
      || state.textareaFontSize !== '16px' || state.textareaLineHeight !== '24px'
      || state.textareaPaddingTop !== '12px' || state.textareaPaddingBottom !== '12px'
      || state.textareaContentClipped !== false) throw new Error('ADDITIONAL_INFO_TEXTAREA_FAILED_' + stage + '=' + JSON.stringify(state));
    log('SHIPPING_BEFORE_ADDITIONAL_INFO_' + stage, 'YES');
    log('TEXTAREA_MIN_HEIGHT_' + stage, state.textareaMinHeight);
    log('TEXTAREA_CONTENT_CLIPPED_' + stage, state.textareaContentClipped ? 'YES' : 'NO');
    return state;
  }
  try {
    await addPurchasableProduct(page);
    await visit(page, checkoutUrl);
    await page.waitForSelector('form.checkout #billing_postcode', { timeout: 30000 });
    await page.evaluate(() => {
      if (!window.jQuery) throw new Error('CHECKOUT_JQUERY_MISSING');
      window.__crShippingUpdateCount = 0;
      window.jQuery(document.body).on('updated_checkout.crShippingAudit', () => { window.__crShippingUpdateCount += 1; });
    });
    await waitForCheckoutUpdate(async () => {
      const address = await page.evaluate(() => {
        const state = document.querySelector('#billing_state');
        const postcode = document.querySelector('#billing_postcode');
        if (!state || state.tagName !== 'SELECT' || !postcode) return { ok: false, reason: 'BILLING_STATE_OR_POSTCODE_MISSING' };
        const cuenca = Array.from(state.options).find(option => /cuenca/i.test(option.textContent));
        if (!cuenca) return { ok: false, reason: 'CUENCA_PROVINCE_OPTION_MISSING' };
        state.value = cuenca.value;
        postcode.value = postcode.value === '16400' ? '16401' : '16400';
        window.jQuery(state).trigger('change');
        window.jQuery(postcode).trigger('change');
        return { ok: true, province: cuenca.textContent.trim(), postcode: postcode.value };
      });
      if (!address.ok) throw new Error('CHECKOUT_ADDRESS_SETUP_FAILED=' + address.reason);
      log('CHECKOUT_ADDRESS_TEST_VALUE', JSON.stringify(address));
    }, 'ADDRESS_SETUP');
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      await assertSingle('VIEWPORT_' + width);
      log('CHECKOUT_LAYOUT_VIEWPORT_' + width, 'PASS');
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    let state = await assertSingle('AFTER_ADDRESS_SETUP');
    const free = state.labels.some(label => /Envío gratuito/i.test(label));
    const pickup = state.labels.some(label => /Recogida en tienda Tarancón/i.test(label));
    log('FREE_SHIPPING_PRESENT', free ? 'YES' : 'NO');
    log('STORE_PICKUP_PRESENT', pickup ? 'YES' : 'NO');
    log('SHIPPING_RADIOS_FUNCTIONAL', state.radioCount >= 2 ? 'YES' : 'NO');
    if (!free || !pickup || state.radioCount < 2) throw new Error('EXPECTED_SHIPPING_METHODS_MISSING=' + JSON.stringify(state));
    async function choose(label, key) {
      const radio = page.locator('#shipping_method > li').filter({ hasText: label }).locator('input.shipping_method[type="radio"]').first();
      if (!(await radio.count())) throw new Error('SHIPPING_RADIO_MISSING_' + key);
      await waitForCheckoutUpdate(() => radio.check({ force: true }), key);
      const after = await assertSingle('AFTER_' + key);
      const selected = page.locator('#shipping_method > li').filter({ hasText: label }).locator('input.shipping_method[type="radio"]').first();
      if (!(await selected.isChecked())) throw new Error('SHIPPING_SELECTION_NOT_PERSISTED_' + key);
      if (!after.totalText) throw new Error('CHECKOUT_TOTAL_MISSING_AFTER_' + key);
      log('SELECTING_' + key + '=PASS');
      return after;
    }
    const initial = await page.locator('#shipping_method input.shipping_method[type="radio"]:checked').first().evaluate(input => input.value).catch(() => '');
    if (/free_shipping/.test(initial)) {
      await choose('Recogida en tienda Tarancón', 'STORE_PICKUP');
      await choose('Envío gratuito', 'FREE_SHIPPING');
      state = await choose('Recogida en tienda Tarancón', 'STORE_PICKUP_FINAL');
    } else {
      await choose('Envío gratuito', 'FREE_SHIPPING');
      state = await choose('Recogida en tienda Tarancón', 'STORE_PICKUP');
    }
    const updates = await page.evaluate(() => window.__crShippingUpdateCount || 0);
    log('CHECKOUT_TOTAL_RECALCULATION', updates >= 3 && Boolean(state.totalText) ? 'PASS' : 'FAIL');
    if (updates < 3 || !state.totalText) throw new Error('CHECKOUT_TOTAL_RECALCULATION_FAILED');
    await waitForCheckoutUpdate(async () => {
      const address = await page.evaluate(() => {
        const postcode = document.querySelector('#billing_postcode');
        if (!postcode) return { ok: false };
        postcode.value = postcode.value === '16401' ? '16400' : '16401';
        window.jQuery(postcode).trigger('change');
        return { ok: true, postcode: postcode.value };
      });
      if (!address.ok) throw new Error('CHECKOUT_POSTCODE_CHANGE_FAILED');
      log('CHECKOUT_POSTCODE_CHANGED', address.postcode);
    }, 'ADDRESS_CHANGE');
    await assertSingle('AFTER_ADDRESS_CHANGE');
    log('NO_DUPLICATE_AFTER_ADDRESS_CHANGE=PASS');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1000);
    state = await assertSingle('AFTER_RELOAD');
    if (!state.totalText) throw new Error('CHECKOUT_TOTAL_MISSING_AFTER_RELOAD');
    log('NO_DUPLICATE_AFTER_RELOAD=PASS');
    log('NO_DUPLICATE_AFTER_FRAGMENT_REFRESH=PASS');
    log('SHIPPING_SECTION_COUNT=' + state.sectionCount);
    log('SHIPPING_METHODS_RENDER_COUNT=' + state.methodsRenderCount);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error && error.stack ? error.stack : String(error)); process.exitCode = 1; });
