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
  const productApiUrl = BASE_URL + '/wp-json/wc/store/v1/products?per_page=100';
  const candidates = await page.evaluate(async url => {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) return [];
    const products = await response.json();
    if (!Array.isArray(products)) return [];
    return products
      .filter(product => product.is_purchasable && product.is_in_stock
        && (product.type === 'simple' || product.has_options === false))
      .map(product => ({
        id: product.id,
        name: product.name,
        price: Number(product.prices && product.prices.price || 0)
      }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 5);
  }, productApiUrl);

  if (!candidates.length) throw new Error('STORE_API_NO_PURCHASABLE_SIMPLE_PRODUCTS');
  const cartApiUrl = BASE_URL + '/wp-json/wc/store/v1/cart';
  const added = [];

  for (const product of candidates) {
    await visit(page, BASE_URL + '/?add-to-cart=' + encodeURIComponent(product.id));
    await page.waitForTimeout(500);
    const cartState = await page.evaluate(async url => {
      try {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) return { ok: false, count: 0 };
        const cart = await response.json();
        return {
          ok: true,
          count: Number(cart.items_count || (Array.isArray(cart.items) ? cart.items.length : 0))
        };
      } catch (_) {
        return { ok: false, count: 0 };
      }
    }, cartApiUrl);
    if (cartState.count > 0) {
      added.push(product.name);
      log('CHECKOUT_TEST_CART_ITEM', product.id + ':' + product.name);
      if (added.length >= 2 || cartState.count >= 2) break;
    }
  }

  const cartState = await page.evaluate(async url => {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) return { ok: false, count: 0 };
      const cart = await response.json();
      return { ok: true, count: Number(cart.items_count || (Array.isArray(cart.items) ? cart.items.length : 0)) };
    } catch (_) {
      return { ok: false, count: 0 };
    }
  }, cartApiUrl);
  if (!cartState.count) throw new Error('NO_PURCHASABLE_SHIPPING_PRODUCT_ADDED');
  log('CHECKOUT_TEST_CART_ITEMS_COUNT', cartState.count);
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
