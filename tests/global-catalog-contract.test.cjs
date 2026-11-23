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

test('Novedades freezes newest-24 IDs, sorts only those hydrated products, then paginates', () => {
  assert.ok(php.includes('function cr2026_novelties_cohort_ids( $generation )'));
  assert.ok(php.includes("'limit' => 24"));
  assert.ok(php.includes("'return' => 'ids'"));
  assert.ok(php.includes("'orderby' => 'date'"));
  assert.ok(php.includes('function cr2026_novelties_sort_cohort_products( $products, $sort )'));
  assert.ok(php.includes('usort( $products, static function ( $left, $right ) use ( $sort )'));
  assert.ok(php.includes("'include' => $novelties_cohort_ids"));
  assert.ok(php.includes("'orderby' => 'include'"));
  assert.ok(php.includes("$cohort_id_lookup = array_fill_keys( $novelties_cohort_ids, true );"));
  assert.ok(php.includes("return $product instanceof WC_Product && isset( $cohort_id_lookup[ absint( $product->get_id() ) ] );"));
  assert.ok(php.includes("$hydrated_cohort_ids !== $expected_cohort_ids"));
  assert.ok(php.includes("$cohort_products = cr2026_novelties_sort_cohort_products( $cohort_products, $sort );"));
  assert.ok(php.includes("'novelties_cohort_hash' =>"));
  assert.ok(php.includes("$products = array_slice( $cohort_products, $page_offset, $page_limit );"));
  assert.ok(php.includes("$has_more = ( $page_offset + count( $products ) ) < $total;"));
  assert.ok(js.includes("title:'title_asc','title-desc':'title_desc'"));
  assert.ok(js.includes("'title-desc'"));
  assert.ok(js.includes("if(!totalLimit&&orderby==='price'"), 'Novedades must trust server-side cohort price sorting, not client text parsing');
  assert.ok(archive.includes('value="title-desc"'));
  for (const marker of [
    'INITIAL_NOVELTY_IDS=',
    'SORT_NEWEST_SET_MATCH',
    'SORT_NAME_ASC_SET_MATCH',
    'SORT_NAME_DESC_SET_MATCH',
    'SORT_PRICE_ASC_SET_MATCH',
    'SORT_PRICE_DESC_SET_MATCH',
    'SORTED_NOVELTY_IDS=',
    'OUTSIDE_INITIAL_COHORT=',
    'MISSING_FROM_INITIAL_COHORT=',
    'SORTED_COHORT_AFTER_RELOAD=PASS',
    'SORTED_COHORT_AFTER_BACK=PASS',
    'MAX_PRODUCTS=',
    'CATALOG_PRODUCTS_LEAKED='
  ]) assert.ok(browser.includes(marker), 'missing cohort sort browser assertion/log: ' + marker);
});

test('empty catalog session-cache entries cannot override a current non-empty catalog response', () => {
  assert.ok(js.includes('const hasCatalogCacheProducts = pages => Array.isArray(pages)'));
  assert.ok(js.includes('if (!hasCatalogCacheProducts(entry.pages))'));
  assert.ok(js.includes('sessionStorage.removeItem(entry.baseKey)'));
  const restoreStart = js.indexOf('const restoreCatalogCache = () =>');
  const restoreEnd = js.indexOf('const buildCatalogPageUrl', restoreStart);
  const restore = js.slice(restoreStart, restoreEnd);
  assert.ok(restore.indexOf('hasCatalogCacheProducts(entry.pages)') < restore.indexOf('grid.replaceChildren(template.content)'),
    'empty cache must be rejected before restoring any cached grid state');
  const loadStart = js.indexOf('const loadPage = async');
  const loadEnd = js.indexOf('const resetAndLoad', loadStart);
  const load = js.slice(loadStart, loadEnd);
  const catchStart = load.indexOf('} catch (error) {');
  const finallyStart = load.indexOf('} finally {', catchStart);
  assert.ok(catchStart >= 0 && finallyStart > catchStart);
  assert.doesNotMatch(load.slice(catchStart, finallyStart), /showEmpty\(\)/,
    'network/validation errors must not clear products or masquerade as a valid empty result');
  assert.match(load, /if \(!returnedIds\.length\) \{\s*if \(!append\) showEmpty\(\);/,
    'empty-state is reserved for a validated response containing no product IDs');
});

test('facet fetch cancellation and generation are isolated from the product listing request', () => {
  const facetStart = js.indexOf('// Dependent facets:');
  const listingStart = js.indexOf('// Category catalog:');
  assert.ok(facetStart >= 0 && listingStart > facetStart);
  const facets = js.slice(facetStart, listingStart);
  assert.match(facets, /const controllers=affected\.map\(\(\)=>new AbortController\(\)\)/);
  assert.match(facets, /generation\+\+;const token=generation/);
  assert.doesNotMatch(facets, /requestGeneration|activeRequest/,
    'facet requests must not abort or invalidate product listing requests');
  assert.ok(js.includes("categoryId: !brandContext && !outletCategoryId ? categoryId : '0'"));
  assert.ok(js.includes('const cacheStorageKey = () => catalogCacheKey(cacheBaseState(cacheState()))'));
});
