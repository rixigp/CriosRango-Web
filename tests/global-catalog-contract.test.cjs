'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const archive = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/archive-product.php'), 'utf8');
const php = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/woocommerce.php'), 'utf8');
const js = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/js/main.js'), 'utf8');
const browser = fs.readFileSync(path.join(root, 'tests/global-shell-browser-smoke.cjs'), 'utf8');

test('Novedades has a route-specific 24-product cap; normal catalog page size remains 12', () => {
  assert.ok(archive.includes("data-total-limit=\"<?php echo $is_novelties_view ? '24' : '0'; ?>\""));
  assert.ok(php.includes("$is_novelties = 1 === absint( $request->get_param( 'novelties' ) );"));
  assert.ok(php.includes("$novelties_limit = $is_novelties ? 24 : 0;"));
  assert.ok(php.includes("$page_limit = $is_novelties ? max( 0, min( $per_page, $novelties_limit - $page_offset ) ) : $per_page;"));
  assert.ok(php.includes("'novelties_limit' => max( 0, absint( $novelties_limit ) )"));
  assert.ok(php.includes("$product_ids = array_slice( $normalized_product_ids, 0, $page_limit );"));
  assert.ok(php.includes("$products = array_slice( $products, 0, $page_limit );"));
  assert.ok(php.includes("$has_more = $has_more && ( $page * $per_page < $novelties_limit );"));
  assert.ok(js.includes("const totalLimit = Number(productListing.dataset.totalLimit || 0);"));
  assert.ok(js.includes("params.set('novelties','1')"));
  assert.ok(js.includes("const normalizeCatalogPages = pages =>"));
  assert.ok(js.includes("entry.pages = normalizeCatalogPages(entry.pages)"));
  assert.ok(js.includes("loadedBefore + ids.length < totalLimit"));
  assert.ok(js.includes("(page - 1) * pageSize >= totalLimit"));
  assert.ok(js.includes("event.persisted"));
  assert.ok(js.includes("window.CR2026CatalogListing={applyFilters,getFilters,renderActiveFilterChips,pageSize,totalLimit,getOutletContext}"));
  const pageSize = php.match(/define\(\s*'CR2026_CATALOG_PAGE_SIZE',\s*(\d+)\s*\)/);
  assert.ok(pageSize, 'canonical catalog page size must remain configured');
  assert.equal(Number(pageSize[1]), 12);
});

test('Novedades Playwright coverage includes fresh load, pagination, reload, history and five-page legacy cache restore', () => {
  for (const marker of [
    'NOVEDADES_FRESH_COUNT=',
    'NOVEDADES_AFTER_LOAD_MORE=',
    'NOVEDADES_AFTER_RELOAD=',
    'NOVEDADES_AFTER_BACK=',
    'NOVEDADES_AFTER_FORWARD_BACK=',
    'CACHE_PAGES_BEFORE=',
    'NOVEDADES_AFTER_CACHE_RESTORE=',
    'CACHE_PAGES_AFTER=',
    'EXPECTED_MAX=24'
  ]) assert.ok(browser.includes(marker), 'missing browser assertion/log: ' + marker);
  assert.ok(browser.includes('pages.length < 5'));
  assert.ok(browser.includes('cacheAfter.pages <= 2 && cacheAfter.products <= 24'));
});
