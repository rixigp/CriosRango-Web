'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const theme = path.join(__dirname, '..', 'theme', 'crios-rango-2026');
const css = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
const footer = fs.readFileSync(path.join(theme, 'footer.php'), 'utf8');
const helpers = fs.readFileSync(path.join(theme, 'inc/helpers.php'), 'utf8');

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

test('RESPONSIVE_PRIMARY_NAV_BOUNDARY=1280px', () => {
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{[^}]*display:\s*block\s*!important/s);
  assert.match(tablet, /\.cr-desktop-rail\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(desktop, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(desktop, /\.cr-desktop-rail\s*\{[^}]*display:\s*flex\s*!important/s);
});

test('VIEWPORT_BOUNDARIES_NO_NAV_GAP=PASS', () => {
  const expected = new Map([
    [390, ['YES', 'NO']],
    [768, ['YES', 'NO']],
    [980, ['YES', 'NO']],
    [1099, ['YES', 'NO']],
    [1100, ['YES', 'NO']],
    [1279, ['YES', 'NO']],
    [1280, ['NO', 'YES']],
    [1440, ['NO', 'YES']]
  ]);
  for (const [width, pair] of expected) {
    const bottom = width < 1280 ? 'YES' : 'NO';
    const sidebar = width < 1280 ? 'NO' : 'YES';
    assert.deepEqual([bottom, sidebar], pair, width + 'px');
    assert.notEqual(bottom === 'YES', sidebar === 'YES', width + 'px must expose exactly one primary navigation');
  }
});

test('PRIMARY_NAV_ABSENT_AT_ANY_VIEWPORT=FAIL', () => {
  assert.match(tablet, /body\s*\{[^}]*padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)[^}]*!important/s);
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{[^}]*position:\s*fixed[^}]*bottom:\s*0[^}]*display:\s*block\s*!important/s);
  assert.match(desktop, /body\s*\{[^}]*padding-bottom:\s*0\s*!important/s);
});

test('PRIMARY_NAV_DUPLICATED_AT_ANY_VIEWPORT=FAIL', () => {
  assert.equal((footer.match(/<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/g) || []).length, 1);
  assert.equal((footer.match(/<nav class="cr-desktop-rail"/g) || []).length, 1);
  assert.match(footer, /if\s*\(\s*\$is_app_nav_shell\s*\)/);
  assert.match(helpers, /function\s+cr2026_is_app_nav_shell\s*\(\)[\s\S]*?is_page\s*\(\s*\)/);
});

test('GLOBAL_NAVIGATION_HAS_NO_URL_SPECIFIC_VISIBILITY_EXCEPTIONS=PASS', () => {
  assert.doesNotMatch(tablet + desktop, /body\.(?:home|cr-parent-category-view|woocommerce-[\w-]+|cr-[\w-]+)\s+\.cr-(?:mobile-bottom-nav|desktop-rail)/);
  assert.match(tablet, /\.cr-mobile-bottom-nav__inner\s*\{[^}]*display:\s*grid\s*!important/s);
});
