'use strict';
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const css = file => fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css', file), 'utf8');

function mediaBlocks(source, query) {
  const blocks = [];
  let cursor = 0;
  const marker = query + ' {';
  while ((cursor = source.indexOf(marker, cursor)) !== -1) {
    const start = cursor + marker.length;
    let depth = 1, end = start;
    for (; end < source.length && depth; end++) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}') depth--;
    }
    assert.equal(depth, 0, 'media block braces must balance');
    blocks.push(source.slice(start, end - 1));
    cursor = end;
  }
  return blocks;
}
function desktop(file) {
  const blocks = mediaBlocks(css(file), '@media (min-width: 1280px)');
  assert.ok(blocks.length, file + ' must declare a desktop-only layer');
  return blocks.join('\n');
}

test('MOBILE_RULES_UNCHANGED=PASS — appended desktop layers are strictly gated at 1280px', () => {
  for (const file of ['main.css', 'account.css', 'controls.css', 'checkout.css']) {
    const source = css(file);
    const lastDesktop = source.lastIndexOf('@media (min-width: 1280px) {');
    assert.ok(lastDesktop >= 0, file + ' has desktop media layer');
    const appended = source.slice(lastDesktop);
    assert.match(appended, /^@media \(min-width: 1280px\) \{/);
    assert.doesNotMatch(appended, /@media\s*\(max-width\s*:/);
  }
});

test('DESKTOP_MAIN_RAIL_NOT_NARROW=PASS — one viewport-derived rail with 1440px cap', () => {
  const layer = desktop('main.css');
  assert.match(layer, /--cr-desktop-sidebar:\s*112px/);
  assert.match(layer, /--cr-desktop-gutter:\s*clamp\(32px,\s*3vw,\s*64px\)/);
  assert.match(layer, /--cr-desktop-content-max:\s*1440px/);
  assert.match(layer, /width:\s*min\(calc\(100vw - var\(--cr-desktop-sidebar\) - 2 \* var\(--cr-desktop-gutter\)\), var\(--cr-desktop-content-max\)\)/);
  assert.doesNotMatch(layer, /transform:\s*scale|\bzoom\s*:/);
});

test('DESKTOP_ACCOUNT_NO_720_CAP=PASS — shared nav/content grid replaces dashboard cap', () => {
  const layer = desktop('account.css');
  assert.match(layer, /grid-template-columns:\s*minmax\(220px,\s*250px\) minmax\(0,\s*1fr\)/);
  assert.match(layer, /\.cr-account-home[\s\S]*?max-width:\s*none\s*!important/);
  assert.match(layer, /woocommerce-MyAccount-content[\s\S]*?width:\s*100%\s*!important/);
  assert.doesNotMatch(layer, /max-width:\s*720px/);
});

test('DESKTOP_GRID_COLUMNS_RESPONSIVE=PASS — archive and category cards use flexible minimum tracks', () => {
  const layer = desktop('main.css');
  assert.match(layer, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(var\(--cr-desktop-card-min\),\s*1fr\)\)/);
  assert.match(layer, /--cr-desktop-card-min:\s*225px/);
  assert.match(layer, /cr-parent-category__grid[\s\S]*?repeat\(auto-fit,\s*minmax\(210px,\s*1fr\)\)/);
});

test('DESKTOP_FOOTER_CANONICAL_RAIL=PASS — footer inner rails consume the same token formula', () => {
  const layer = desktop('main.css');
  assert.match(layer, /width: min\(calc\(100vw - var\(--cr-desktop-sidebar\) - 2 \* var\(--cr-desktop-gutter\)\), var\(--cr-desktop-content-max\)\)/);
  assert.match(layer, /\.cr-footer__grid, \.cr-footer__bottom[\s\S]*?margin-left: calc\(var\(--cr-desktop-sidebar\) \+ max\(var\(--cr-desktop-gutter\)/);
});

test('DESKTOP_NO_HORIZONTAL_OVERFLOW=PASS — desktop shells and cards permit intrinsic shrink', () => {
  const layer = desktop('main.css');
  assert.match(layer, /\.cr-main,[\s\S]*?min-width:\s*0/);
  assert.match(layer, /\.cr-product-card[\s\S]*?min-width:\s*0/);
  assert.match(desktop('account.css'), /woocommerce-MyAccount-content[\s\S]*?min-width:\s*0/);
});

test('DESKTOP_CART_PAGE_SHELL_UNCAPPED=PASS — cart outer prose wrapper cannot inherit the 860px reading cap', () => {
  const layer = desktop('main.css');
  assert.match(layer, /body\.woocommerce-cart \.cr-page,[\s\S]*?body\.woocommerce-cart \.cr-page \.cr-prose[\s\S]*?width:\s*100%\s*!important[\s\S]*?max-width:\s*none\s*!important/);
});
