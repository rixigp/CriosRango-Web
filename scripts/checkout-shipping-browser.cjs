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
  const candidates = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]'))
    .filter(link => /\/(producto|product)\//i.test(link.href)).map(link => link.href)
    .filter((url, index, urls) => urls.indexOf(url) === index).slice(0, 12));
  for (const productUrl of candidates) {
    try {
      await visit(page, productUrl);
      const form = page.locator('form.cart').first();
      if (!(await form.count())) continue;
      const selects = form.locator('select[name^="attribute_"]');
      let ready = true;
      for (let index = 0; index < await selects.count(); index += 1) {
        const select = selects.nth(index);
        const options = await select.locator('option').evaluateAll(items => items.filter(option => option.value && !option.disabled).map(option => option.value));
        if (!options.length) { ready = false; break; }
        await select.selectOption(options[0]);
      }
      if (!ready) continue;
      const button = form.locator('.single_add_to_cart_button').first();
      if (!(await button.count())) continue;
      await page.waitForFunction(() => {
        const variation = document.querySelector('form.cart input.variation_id');
        return !variation || Number(variation.value) > 0;
      }, null, { timeout: 12000 }).catch(() => {});
      if (!(await button.isEnabled())) continue;
      await button.click();
      await page.waitForTimeout(1300);
      if (await page.locator('.woocommerce-error').count()) continue;
      log('CHECKOUT_TEST_PRODUCT=' + productUrl);
      return true;
    } catch (_) {}
  }
  throw new Error('NO_PURCHASABLE_SHIPPING_PRODUCT_FOUND');
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
      return { sectionCount: sections.length, methodsRenderCount: lists.length, radioCount: radios.length, labels, totalText: total ? total.innerText.replace(/\s+/g, ' ').trim() : '' };
    });
  }
  async function assertSingle(stage) {
    const state = await snapshot();
    log('SHIPPING_SECTION_COUNT_' + stage, state.sectionCount);
    log('SHIPPING_METHODS_RENDER_COUNT_' + stage, state.methodsRenderCount);
    if (state.sectionCount !== 1 || state.methodsRenderCount !== 1) throw new Error('DUPLICATE_SHIPPING_SECTION_' + stage + '=' + JSON.stringify(state));
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
        const madrid = Array.from(state.options).find(option => /madrid/i.test(option.textContent));
        if (!madrid) return { ok: false, reason: 'MADRID_PROVINCE_OPTION_MISSING' };
        state.value = madrid.value;
        postcode.value = postcode.value === '28013' ? '28014' : '28013';
        window.jQuery(state).trigger('change');
        window.jQuery(postcode).trigger('change');
        return { ok: true, province: madrid.textContent.trim(), postcode: postcode.value };
      });
      if (!address.ok) throw new Error('CHECKOUT_ADDRESS_SETUP_FAILED=' + address.reason);
      log('CHECKOUT_ADDRESS_TEST_VALUE', JSON.stringify(address));
    }, 'ADDRESS_SETUP');
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
        postcode.value = postcode.value === '28014' ? '28013' : '28014';
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
