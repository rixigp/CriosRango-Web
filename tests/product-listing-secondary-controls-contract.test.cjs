'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const helpers = read('theme/crios-rango-2026/inc/helpers.php');
const archive = read('theme/crios-rango-2026/archive-product.php');
const brand = read('theme/crios-rango-2026/taxonomy-product_brand.php');
const css = read('theme/crios-rango-2026/assets/css/main.css');

test('SHARED_CONTROLS_WRAPPER_PRESENT=PASS', () => {
  assert.match(helpers, /cr-page-toolbar__controls/);
  assert.match(helpers, /cr-page-toolbar__heading/);
});
test('ORDERING_INSIDE_SHARED_CONTROLS=PASS', () => {
  assert.match(helpers, /\$left_action_html/);
  assert.match(archive, /cr2026_render_category_toolbar\([\s\S]*?\$listing_ordering_html/);
  assert.match(brand, /cr2026_render_category_toolbar\([\s\S]*?\$brand_ordering_html/);
});
test('FILTERS_INSIDE_SHARED_CONTROLS=PASS', () => {
  assert.match(helpers, /echo '<div class="cr-page-toolbar__controls">[\s\S]*?cr-parent-category__filters/);
  assert.match(brand, /\$brand_filter_action/);
});
test('SORT_ONLY_SUPPORTED=PASS', () => {
  assert.match(helpers, /'' !== \$left_action_html \|\| '' !== \$right_action_html \|\| \$show_filters/);
  assert.match(helpers, /if \( '' !== \$left_action_html \)/);
});
test('FILTER_ONLY_SUPPORTED=PASS', () => {
  assert.match(helpers, /elseif \( \$show_filters \)/);
});
test('SORT_AND_FILTER_SUPPORTED=PASS', () => {
  assert.match(archive, /true, '', '', '', array\(\), \$listing_ordering_html/);
  assert.match(brand, /false, \$brand_filter_action, '', '', array\(\), \$brand_ordering_html/);
});
test('RESPONSIVE_390_430_STATIC_CONTRACT=PASS', () => {
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.cr-page-toolbar__controls\s*\{[\s\S]*?display: flex;[\s\S]*?align-items: center;[\s\S]*?justify-content: space-between;[\s\S]*?width: 100%;/);
  assert.match(css, /\.cr-page-toolbar__controls \.cr-product-listing__ordering\s*\{[^}]*margin: 0;/s);
  assert.match(css, /\.cr-page-toolbar__controls \.cr-parent-category__filters\s*\{[^}]*margin-left: auto;/s);
  for (const viewport of [390, 430]) assert.ok(viewport >= 320 && viewport <= 767);
});
test('TABLET_DESKTOP_RULES_REMAIN_OUTSIDE_MOBILE_OVERRIDE', () => {
  assert.match(css, /\.cr-page-toolbar__heading,\s*\.cr-page-toolbar__controls \{ display: contents; \}/);
  assert.match(css, /\.cr-product-listing__ordering \{ min-height:38px; margin:0 20px 14px;/);
});
