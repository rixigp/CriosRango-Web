#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const a = {};
  for (const item of argv) {
    const m = item.match(/^--([a-z-]+)=(.*)$/);
    if (!m) throw new Error('Invalid argument: ' + item);
    a[m[1]] = m[2];
  }
  if (!a.url) throw new Error('Missing --url');
  const parsed = new URL(a.url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('--url must be HTTP(S)');
  const width = Number(a.width || 1440), height = Number(a.height || 900);
  if (!Number.isInteger(width) || width < 320 || width > 3840) throw new Error('Invalid --width');
  if (!Number.isInteger(height) || height < 320 || height > 2160) throw new Error('Invalid --height');
  return { url: a.url, width, height, selector: a.selector || '' };
}

async function optionalLogin(page) {
  const email = process.env.STAGING_ACCOUNT_EMAIL;
  const password = process.env.STAGING_ACCOUNT_PASSWORD;
  if (!email || !password) return { attempted: false, authenticated: false };
  const forms = [
    ['#user_login', '#user_pass', '#wp-submit'],
    ['form.login input[name="username"], form.login input[name="email"]', 'form.login input[name="password"]', 'form.login button[name="login"], form.login input[name="login"]']
  ];
  for (const [user, pass, submit] of forms) {
    const u = page.locator(user).first(), p = page.locator(pass).first();
    if (await u.count() && await p.count()) {
      await u.fill(email);
      await p.fill(password);
      const button = page.locator(submit).first();
      if (await button.count()) await button.click();
      else await p.press('Enter');
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      return { attempted: true, authenticated: !/wp-login\.php$/.test(new URL(page.url()).pathname) };
    }
  }
  return { attempted: false, authenticated: false, reason: 'No supported login form found' };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const out = path.resolve(process.env.INSPECT_OUTPUT_DIR || 'artifacts');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: a.width, height: a.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    const response = await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const login = await optionalLogin(page);
    if (login.attempted) await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(400);

    const pageShot = 'browser-inspect-' + a.width + 'x' + a.height + '.png';
    await page.screenshot({ path: path.join(out, pageShot), fullPage: true, animations: 'disabled' });
    const data = await page.evaluate((selector) => {
      const result = {
        currentUrl: location.href, innerWidth: window.innerWidth, innerHeight: window.innerHeight,
        documentClientWidth: document.documentElement.clientWidth,
        documentClientHeight: document.documentElement.clientHeight, selector: selector || null, element: null
      };
      if (!selector) return result;
      const el = document.querySelector(selector);
      if (!el) { result.selectorError = 'NO_MATCH'; return result; }
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      const props = [
        'display','position','marginTop','marginRight','marginBottom','marginLeft',
        'paddingTop','paddingRight','paddingBottom','paddingLeft','width','height','boxSizing',
        'fontFamily','fontSize','fontWeight','lineHeight',
        'gridTemplateColumns','gridTemplateRows','gridColumn','gridRow',
        'flexWrap','gap','rowGap','columnGap','flexDirection','alignItems','alignContent',
        'justifyContent','overflow','overflowX','overflowY','transform','zIndex'
      ];
      const computed = {};
      for (const key of props) computed[key] = s[key];
      return { ...result, element: {
        tagName: el.tagName, className: typeof el.className === 'string' ? el.className : '',
        computed, rect: { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height, x:r.x, y:r.y }
      }};
    }, a.selector);

    let elementShot = null;
    if (a.selector && !data.selectorError && await page.locator(a.selector).count()) {
      elementShot = 'browser-inspect-element.png';
      await page.locator(a.selector).first().screenshot({ path: path.join(out, elementShot), animations: 'disabled' });
    }
    const result = {
      browserEngine: browser.browserType().name(), requestedUrl: a.url,
      httpStatus: response ? response.status() : null,
      viewport: { width: a.width, height: a.height }, login, ...data,
      screenshots: { page: pageShot, element: elementShot }, capturedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(out, 'browser-inspect-result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log('BROWSER_ENGINE=' + result.browserEngine);
    console.log('URL=' + result.currentUrl);
    console.log('VIEWPORT=' + a.width + 'x' + a.height);
    console.log('INNER_WIDTH=' + result.innerWidth);
    console.log('DOCUMENT_CLIENT_WIDTH=' + result.documentClientWidth);
    if (a.selector) {
      console.log('SELECTOR=' + a.selector);
      if (result.selectorError) console.log('SELECTOR_STATUS=NOT_FOUND');
      else {
        const c = result.element.computed, r = result.element.rect;
        const fields = {
          DISPLAY:c.display, POSITION:c.position,
          MARGIN_TOP:c.marginTop, MARGIN_RIGHT:c.marginRight, MARGIN_BOTTOM:c.marginBottom, MARGIN_LEFT:c.marginLeft,
          PADDING_TOP:c.paddingTop, PADDING_RIGHT:c.paddingRight, PADDING_BOTTOM:c.paddingBottom, PADDING_LEFT:c.paddingLeft,
          WIDTH:c.width, HEIGHT:c.height, RECT_LEFT:r.left, RECT_TOP:r.top, RECT_RIGHT:r.right, RECT_BOTTOM:r.bottom, RECT_WIDTH:r.width, RECT_HEIGHT:r.height,
          FONT_FAMILY:c.fontFamily, FONT_SIZE:c.fontSize, FONT_WEIGHT:c.fontWeight, LINE_HEIGHT:c.lineHeight,
          GRID_TEMPLATE_COLUMNS:c.gridTemplateColumns, GRID_TEMPLATE_ROWS:c.gridTemplateRows, GRID_COLUMN:c.gridColumn,
          GRID_ROW:c.gridRow, FLEX_WRAP:c.flexWrap, GAP:c.gap, ROW_GAP:c.rowGap, COLUMN_GAP:c.columnGap
        };
        for (const [k,v] of Object.entries(fields)) console.log(k + '=' + v);
      }
    }
    console.log('SCREENSHOT=' + pageShot);
    console.log('ELEMENT_SCREENSHOT=' + (elementShot || 'NOT_CAPTURED'));
    console.log('RESULT_JSON=browser-inspect-result.json');
    if (result.selectorError) process.exitCode = 2;
  } finally {
    await context.close();
    await browser.close();
  }
}
main().catch(e => { console.error('STAGING_INSPECT_ERROR=' + (e.stack || String(e))); process.exitCode = 1; });
