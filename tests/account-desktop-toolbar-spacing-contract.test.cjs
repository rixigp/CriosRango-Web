'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const theme = path.resolve(__dirname, '../theme/crios-rango-2026');
const visual = fs.readFileSync(path.join(theme, 'assets/css/visual-system.css'), 'utf8');
const account = fs.readFileSync(path.join(theme, 'assets/css/account.css'), 'utf8');

test('all contextual desktop toolbars share the Category 30px top and 18px bottom spacing source', () => {
  const desktop = visual.match(/@media \(min-width: 1280px\) \{([\s\S]*?)\n\}/);
  assert.ok(desktop, 'desktop toolbar spacing media block exists');
  assert.match(desktop[1], /body\.cr-parent-category-view \.cr-parent-category__toolbar/);
  assert.match(desktop[1], /body\.woocommerce-account :is\(\.cr-account-shell__content, \.cr-account-orders\) > \.cr-parent-category__toolbar/);
  assert.match(desktop[1], /margin:\s*30px 0 18px;/);
});

test('Account and Orders no longer override desktop toolbar top spacing', () => {
  assert.doesNotMatch(account, /body\.woocommerce-account \.cr-account-orders > \.cr-parent-category__toolbar\s*\{[^}]*margin-top:\s*0/s);
  assert.doesNotMatch(account, /body\.woocommerce-account \.cr-account-shell__content > \.cr-parent-category__toolbar\s*\{\s*margin-bottom:\s*(?:18|24)px;/);
});

test('mobile and tablet Account toolbar bottom spacing remains unchanged', () => {
  assert.match(account, /@media \(max-width:1279px\)\s*\{\s*body\.woocommerce-account \.cr-account-shell__content > \.cr-parent-category__toolbar \{ margin-bottom:18px; \}\s*\}/);
  assert.match(account, /@media \(min-width:768px\) and \(max-width:1279px\)\s*\{\s*body\.woocommerce-account \.cr-account-shell__content > \.cr-parent-category__toolbar \{ margin-bottom:24px; \}\s*\}/);
});
