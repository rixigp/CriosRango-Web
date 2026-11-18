'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const browser = fs.readFileSync(path.join(root, 'tests/global-shell-browser-smoke.cjs'), 'utf8');
const contract = fs.readFileSync(path.join(root, 'tests/global-catalog-contract.test.cjs'), 'utf8');

test('NOVEDADES_PRICE_ASC_AND_DESC_VERIFY_THE_SAME_FROZEN_24_ID_SET', () => {
  assert.match(browser, /\['price_asc','price','SORT_PRICE_ASC_SET_MATCH'\]/);
  assert.match(browser, /\['price_desc','price-desc','SORT_PRICE_DESC_SET_MATCH'\]/);
  assert.match(browser, /SORTED_COHORT_AFTER_RELOAD=PASS/);
  assert.match(browser, /SORTED_COHORT_AFTER_BACK=PASS/);
  assert.match(browser, /assert\.deepEqual\(new Set\(sortedAfterReload\), new Set\(sortedBeforeReload\)/);
  assert.match(browser, /assert\.deepEqual\(new Set\(sortedAfterHistory\), new Set\(sortedBeforeReload\)/);
  assert.match(contract, /SORT_PRICE_ASC_SET_MATCH/);
  assert.match(contract, /SORT_PRICE_DESC_SET_MATCH/);
  assert.ok(browser.indexOf('// Novedades total cap:') < browser.indexOf("await navigate(mobilePage, ACCOUNT_URL)"),
    'Novedades cohort checks must run before independent shell routes');
});
