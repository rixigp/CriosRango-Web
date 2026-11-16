'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const theme = path.join(__dirname, '..', 'theme', 'crios-rango-2026');
const css = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
const footer = fs.readFileSync(path.join(theme, 'footer.php'), 'utf8');
const helpers = fs.readFileSync(path.join(theme, 'inc/helpers.php'), 'utf8');
const account = fs.readFileSync(path.join(theme, 'assets/css/account.css'), 'utf8');
const product = fs.readFileSync(path.join(theme, 'assets/css/product-detail-skin.css'), 'utf8');

function mediaBlock(source, query) {
  const marker = '@media (' + query + ') {';
  const start = source.lastIndexOf(marker);
  assert.notEqual(start, -1, 'missing canonical @media (' + query + ') block');
  const open = source.indexOf('{', start);
  let depth = 1;
  for (let i = open + 1; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(open + 1, i);
  }
  assert.fail('unclosed media block: ' + query);
}

const tablet = mediaBlock(css, 'max-width: 1279px');
const desktop = mediaBlock(css, 'min-width: 1280px');

test('GLOBAL_SHELL_PRESENT_FOR_ALL_NORMAL_PUBLIC_REQUESTS=PASS', () => {
  assert.match(helpers, /function\s+cr2026_is_app_nav_shell\s*\(\)[\s\S]*?return\s+!\s*\(/);
  assert.match(footer, /<nav class="cr-desktop-rail"/);
  assert.match(footer, /<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/);
  assert.doesNotMatch(footer, /if\s*\(\s*\$is_app_nav_shell/);
  assert.equal((footer.match(/<nav class="cr-desktop-rail"/g) || []).length, 1);
  assert.equal((footer.match(/<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/g) || []).length, 1);
});

test('GLOBAL_PRIMARY_NAV_EXACTLY_ONE_MODE_AT_1280=PASS', () => {
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{[^}]*display:\s*block\s*!important/s);
  assert.match(tablet, /\.cr-desktop-rail\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(desktop, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(desktop, /\.cr-desktop-rail\s*\{[^}]*display:\s*flex\s*!important/s);
});

test('GLOBAL_VIEWPORT_MATRIX=390,768,980,1100,1279,1280,1440,1920', () => {
  for (const width of [390, 768, 980, 1100, 1279, 1280, 1440, 1920]) {
    const bottom = width < 1280;
    const sidebar = width >= 1280;
    assert.notEqual(bottom, sidebar, width + 'px must expose exactly one primary nav');
  }
});

test('ACCOUNT_INTERNAL_DESKTOP_NAV_STARTS_AT_1280=PASS', () => {
  assert.match(account, /@media\s*\(max-width:\s*1279px\)\s*\{[\s\S]*?woocommerce-MyAccount-navigation\s*\{\s*display:\s*none\s*!important/s);
  assert.match(account, /@media\s*\(min-width:\s*1280px\)\s*\{[\s\S]*?woocommerce-MyAccount-navigation\s*\{/s);
});

test('PRODUCT_TWO_COLUMN_LAYOUT_STARTS_AT_1280=PASS', () => {
  const tabletProduct = product.slice(product.indexOf('@media (min-width: 768px)'), product.indexOf('@media (min-width: 1280px)'));
  assert.doesNotMatch(tabletProduct, /flex:\s*0\s+1\s+52%|width:\s*52%|grid-template-columns:/);
  assert.match(product, /@media\s*\(min-width:\s*1280px\)\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*\.92fr\)/s);
});

test('DESKTOP_CONTENT_TOP_GAP_USES_ONE_TOKEN=PASS', () => {
  assert.match(css, /--cr-desktop-content-top-gap:\s*32px/);
  assert.match(desktop, /\.cr-main,[\s\S]*?padding-top:\s*var\(--cr-desktop-content-top-gap\)/);
});

test('VISUAL_FOOTER_ABSENT_AND_WP_FOOTER_PRESERVED=PASS', () => {
  assert.doesNotMatch(footer, /<footer\b/i);
  assert.match(footer, /<\?php\s+wp_footer\(\);\s+\?>/);
});
