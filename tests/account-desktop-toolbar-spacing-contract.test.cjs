'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const theme = path.resolve(__dirname, '../theme/crios-rango-2026');
const visual = fs.readFileSync(path.join(theme, 'assets/css/visual-system.css'), 'utf8');
const account = fs.readFileSync(path.join(theme, 'assets/css/account.css'), 'utf8');

function mediaBlocks(source) {
  const blocks = [];
  const re = /@media\s*([^\{]+)\{/g;
  let match;
  while ((match = re.exec(source))) {
    let depth = 1;
    let end = re.lastIndex;
    for (; end < source.length && depth; end++) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}') depth--;
    }
    if (depth === 0) blocks.push({ query: match[1].trim(), body: source.slice(re.lastIndex, end - 1), start: match.index, end });
    re.lastIndex = end;
  }
  return blocks;
}

function stripNarrowMedia(source) {
  const ranges = mediaBlocks(source)
    .filter(block => /max-width\s*:\s*(?:1279|12[0-7]\d|1[01]\d\d|\d{1,3})px/i.test(block.query))
    .map(block => [block.start, block.end]);
  let result = source;
  for (const [start, end] of ranges.reverse()) result = result.slice(0, start) + ' '.repeat(end - start) + result.slice(end);
  return result;
}

function rules(source) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(source))) {
    const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    const declarations = match[2].split(';').map(value => value.trim()).filter(Boolean).map(value => {
      const index = value.indexOf(':');
      return index < 0 ? null : { property: value.slice(0, index).trim().toLowerCase(), value: value.slice(index + 1).trim() };
    }).filter(Boolean);
    out.push({ selector, declarations });
  }
  return out;
}

test('DESKTOP_SHARED_TOOLBAR_MARGIN=30px 0 18px for every contextual route', () => {
  const desktop = mediaBlocks(visual).find(block => /min-width\s*:\s*1280px/i.test(block.query));
  assert.ok(desktop, 'the >=1280px desktop media query exists');
  assert.match(desktop.body, /\.cr-page-toolbar\s*\{\s*margin:\s*30px 0 18px;/);
  assert.doesNotMatch(desktop.body, /body\.cr-parent-category-view|body\.cr-product-listing-view|body\.woocommerce-account/);
});

test('ACCOUNT_DESKTOP_TOP_OVERRIDE=ABSENT and ORDERS_DESKTOP_TOP_OVERRIDE=ABSENT', () => {
  const desktopAccountRules = rules(stripNarrowMedia(account));
  const toolbarSelectors = [
    'body.woocommerce-account .cr-account-shell__content > .cr-parent-category__toolbar',
    'body.woocommerce-account .cr-account-orders > .cr-parent-category__toolbar',
  ];
  for (const selector of toolbarSelectors) {
    const declarations = desktopAccountRules
      .filter(rule => rule.selector === selector)
      .flatMap(rule => rule.declarations);
    assert.equal(
      declarations.some(declaration => ['margin', 'margin-top'].includes(declaration.property)),
      false,
      selector + ' must not override shared desktop top spacing'
    );
  }
});

test('mobile and tablet Account toolbar bottom spacing remains unchanged', () => {
  assert.match(account, /@media \(max-width:1279px\)\s*\{\s*body\.woocommerce-account \.cr-account-shell__content > \.cr-parent-category__toolbar \{ margin-bottom:18px; \}\s*\}/);
  assert.match(account, /@media \(min-width:768px\) and \(max-width:1279px\)\s*\{\s*body\.woocommerce-account \.cr-account-shell__content > \.cr-parent-category__toolbar \{ margin-bottom:24px; \}\s*\}/);
});
