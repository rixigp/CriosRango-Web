'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
const outletCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/outlet-bubbles.css'), 'utf8');
const browser = fs.readFileSync(path.join(root, 'tests/desktop-targeted-browser.cjs'), 'utf8');

test('OUTLET_DESKTOP_GRID_IS_ALWAYS_FOUR_FIXED_COLUMNS', () => {
  const rule = css.match(/body\.cr-product-listing-view \.cr-product-grid\s*\{([^}]*)\}/s);
  assert.ok(rule, 'shared desktop product grid rule exists');
  assert.match(rule[1], /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.doesNotMatch(rule[1], /auto-fit|auto-fill/);
});

test('OUTLET_BUBBLE_TRACK_MATCHES_ORDERING_GUTTER_AT_EACH_BREAKPOINT', () => {
  assert.match(outletCss, /@media \(min-width:768px\) and \(max-width:1279px\)\{\.cr-outlet-bubbles\{padding-inline:32px\}\}/);
  assert.match(outletCss, /@media \(min-width:1280px\)\{\.cr-outlet-bubbles\{padding-inline:0\}\}/);
  assert.match(browser, /async function outletListingGeometry\(page, branchUrl\)/);
  assert.match(browser, /OUTLET_NORMAL_/);
  assert.match(browser, /OUTLET_BUBBLES_SORT_ALIGNMENT_/);
  assert.match(browser, /390, 430, 768, 820, 900, 980, 1100, 1200, 1279, 1280, 1440, 1920/);
  assert.match(browser, /OUTLET_VIEWPORT_/);
  assert.match(browser, /OUTLET_SELECTED_RESULT_COUNT/);
  assert.match(browser, /OUTLET_PROBE_/);
});
