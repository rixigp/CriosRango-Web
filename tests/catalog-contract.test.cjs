const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const jsPath = path.join(root, 'theme/crios-rango-2026/assets/js/main.js');
const phpPath = path.join(root, 'theme/crios-rango-2026/inc/woocommerce.php');
const helpersPath = path.join(root, 'theme/crios-rango-2026/inc/helpers.php');
const archivePath = path.join(root, 'theme/crios-rango-2026/archive-product.php');
const deployPath = path.join(root, '.github/workflows/deploy.yml');

const js = fs.readFileSync(jsPath, 'utf8');
const php = fs.readFileSync(phpPath, 'utf8');
const helpers = fs.readFileSync(helpersPath, 'utf8');
const archive = fs.readFileSync(archivePath, 'utf8');
const deploy = fs.readFileSync(deployPath, 'utf8');

function catalogStateApi() {
  const window = {};
  const document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { classList: { contains: () => false } }
  };
  vm.runInNewContext(js, { window, document, console, URL, URLSearchParams, Intl, Set, Map, Date, Number, String, Array, Object });
  return window.CR2026CatalogState;
}

test('select then deselect restores the exact selected term IDs', () => {
  const api = catalogStateApi();
  const initial = ['12', '18', '9'];
  const selected = api.toggleFacetSelection(initial, ['4']);
  const restored = api.toggleFacetSelection(selected, ['4']);
  assert.deepEqual(Array.from(restored), initial);
});

test('facet toggling does not mutate the caller selection array', () => {
  const api = catalogStateApi();
  const initial = ['12', '18'];
  const before = initial.slice();
  api.toggleFacetSelection(initial, ['4']);
  assert.deepEqual(initial, before);
});

test('catalog order comparison is positional and rejects missing or reordered IDs', () => {
  const api = catalogStateApi();
  assert.equal(api.sameOrderedIds(['1', '2', '3'], [1, 2, 3]), true);
  assert.equal(api.sameOrderedIds(['1', '2', '3'], ['1', '3', '2']), false);
  assert.equal(api.sameOrderedIds(['1', '2'], ['1']), false);
});

test('facet responses update availability without replacing the option universe or pruning selections', () => {
  assert.match(js, /facetAvailability\[affected\[index\]\]\s*=\s*new Set/);
  assert.doesNotMatch(js, /sanitizeSelected/);
  assert.doesNotMatch(js, /rowsByDimension\[dimension\]\s*=\s*rowsByDimension\[dimension\]\.filter/);
});

test('every category page, including page one, uses the same catalog-page endpoint', () => {
  assert.match(js, /loadPage\(1,false,requestGeneration\)/);
  assert.doesNotMatch(archive, /\$wp_query->posts/);
  assert.match(archive, /data-products-url=.*cr2026\/v1\/catalog-page/s);
});

test('ordered IDs are validated at API, card endpoint and DOM boundaries', () => {
  assert.match(php, /'orderby'\s*=>\s*'include'/);
  assert.match(php, /'paginate'\s*=>\s*true/);
  assert.match(php, /\$total\s*=\s*isset\( \$catalog_result->total \)/);
  assert.match(php, /'rendered_product_ids'\s*=>/);
  assert.match(php, /cr2026_catalog_duplicate_ids/);
  assert.match(php, /cr2026_catalog_missing_cards/);
  assert.match(js, /sameOrderedIds\(returnedIds,endpointIds\)/);
  assert.match(js, /sameOrderedIds\(endpointIds,renderedIds\)/);
  assert.match(js, /Catalog duplicate product IDs across pages/);
  assert.match(js, /Catalog total mismatch/);
  assert.doesNotMatch(php, /usort\s*\(/);
});

test('product cards expose their real product IDs and EUR uses a non-breaking space', () => {
  assert.match(helpers, /data-product-id=/);
  assert.match(helpers, /return '%2\$s&nbsp;%1\$s'/);
  assert.match(helpers, /woocommerce_price_format/);
});

test('web catalog page size is sourced from the audited app paginator contract', () => {
  const pageSizeMatch = php.match(/define\(\s*'CR2026_CATALOG_PAGE_SIZE',\s*(\d+)\s*\)/);
  assert.ok(pageSizeMatch, 'PHP must define the canonical page size');
  assert.equal(Number(pageSizeMatch[1]), 12);
  assert.match(archive, /data-page-size=.*CR2026_CATALOG_PAGE_SIZE/s);
  assert.match(php, /\$per_page = CR2026_CATALOG_PAGE_SIZE/);
  assert.match(js, /per_page:String\(pageSize\)/);
  assert.match(js, /Number\(responseData\.per_page\)!==pageSize/);
});

test('category filter selection is live, chips are actionable, and Apply only closes', () => {
  assert.match(js, /publishLiveFilters\(\);scheduleDependentRefresh\(dimension\)/);
  assert.match(js, /window\.CR2026CatalogListing=\{applyFilters,getFilters,renderActiveFilterChips,pageSize\}/);
  assert.ok(js.includes("filterSheet.querySelector('[data-cr-filter-apply]').addEventListener('click',closeSheet)"));
  assert.match(js, /data-cr-active-filter-chips/);
  assert.match(js, /cr-product-listing__clear-filters/);
  assert.doesNotMatch(js, /window\.location\.assign\(url\.toString\(\)\)/);
  assert.match(js, /window\.history\.replaceState/);
});

test('catalog automatically paginates through an observer sentinel without a visible Load more button', () => {
  assert.match(archive, /data-cr-product-sentinel/);
  assert.doesNotMatch(archive, /data-cr-product-load-more/);
  assert.match(js, /new IntersectionObserver/);
  assert.match(js, /catalogObserver\.observe\(sentinel\)/);
  assert.match(js, /rootMargin:'0px 0px 900px 0px'/);
});

test('product card image source and crop match app responsive source selection and ContentScale.Crop', () => {
  assert.match(helpers, /wp_get_attachment_image\(\s*\$image_id, 'full'/);
  assert.match(helpers, /'sizes'\s*=>/);
  assert.match(helpers, /data-product-id=/);
  const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  assert.match(css, /cr-product-card__media \{[^}]*aspect-ratio:\.78;[^}]*border-radius:14px;[^}]*background:#FFFFFF/s);
  assert.match(css, /cr-product-card__image \{ display:block; width:100%; height:100%; object-fit:cover; object-position:center; \}/);
  assert.match(css, /cr-category-filter-sheet__option:disabled \{ opacity:\.42!important; cursor:not-allowed!important; \}/);
});

test('price monotonicity validation includes previous pages plus the incoming page', () => {
  assert.match(js, /const priceNodes=append\?Array\.from\(grid\.querySelectorAll\('\[data-product-id\]'\)\)\.concat\(Array\.from\(template\.content\.querySelectorAll/);
  assert.match(js, /PRICE_ASC=FAIL/);
  assert.match(js, /PRICE_DESC=FAIL/);
});

test('catalog endpoint echoes page size and staging debug exposes all ID layers plus prices', () => {
  assert.match(php, /'per_page' => \$per_page/);
  assert.match(js, /api_product_ids:returnedIds/);
  assert.match(js, /hydrated_product_ids:endpointIds/);
  assert.match(js, /dom_product_ids:renderedIds/);
  assert.match(js, /prices,total:responseData\.total/);
});

test('staging deploy is exact-HEAD guarded and verifies remote build.json SHA', () => {
  assert.ok(deploy.includes('Check exact PR13 staging HEAD'));
  assert.ok(deploy.includes('git fetch origin fix/catalog-runtime-parity'));
  assert.ok(deploy.includes('Generate staging build manifest'));
  assert.ok(deploy.includes('BUILD_SHA: $' + '{{ github.sha }}'));
  assert.ok(deploy.includes('Verify remote staging build.json SHA'));
  assert.ok(deploy.includes('console.log("STAGING_BUILD_SHA="+manifest.sha)'));
  assert.ok(deploy.includes('/public/prueba/wp-content/themes/crios-rango-2026/'));
  assert.doesNotMatch(deploy, /--delete/);
});

test('web sort options reproduce app enum mapping including Name A-Z', () => {
  assert.match(archive, /value="title".*Nombre A-Z/s);
  assert.match(js, /title:'title_asc'/);
  assert.match(js, /orderby=\['date','price','price-desc','title'\]/);
  assert.match(php, /'title_asc' === \$sort/);
});

test('price ASC and DESC fail on nonnumeric values and every adjacent pair across pages', () => {
  assert.match(js, /prices\.some\(price=>!Number\.isFinite\(price\)\)/);
  assert.match(js, /prices\.some\(\(price,index\)=>index>0&&prices\[index-1\]>price\)/);
  assert.match(js, /prices\.some\(\(price,index\)=>index>0&&prices\[index-1\]<price\)/);
  assert.match(js, /concatenated page sequence/);
});

test('catalog debug diagnostics are enabled only on staging /prueba or non-production WP environments', () => {
  assert.match(archive, /REQUEST_URI[\s\S]*?\/prueba\//);
  assert.match(archive, /data-debug=.*\$listing_debug/s);
});

test('price monotonicity reads the current sale amount rather than the struck regular amount', () => {
  assert.match(js, /const saleAmount=priceContainer\?\.querySelector\('ins \.amount, ins bdi'\)/);
  assert.match(js, /const amountNode=saleAmount\|\|priceContainer\?\.querySelector\('\.amount, bdi'\)/);
});

test('staging page diagnostics run only after the concatenated prices array is computed', () => {
  const pricesIndex = js.indexOf('const prices=priceNodes.map');
  const diagnosticsIndex = js.indexOf("if(debug)console.debug('[CR2026 catalog] page'");
  assert.ok(pricesIndex >= 0 && diagnosticsIndex > pricesIndex);
});



test('price sorting uses scoped WooCommerce lookup-table SQL order without changing result-set predicates', () => {
  assert.ok(php.includes("$orderby = 'cr2026_price_asc'"));
  assert.ok(php.includes("$orderby = 'cr2026_price_desc'"));
  assert.doesNotMatch(php, /orderby = 'price';\s*order = '(?:ASC|DESC)'/);
  assert.ok(php.includes("function cr2026_catalog_price_sort_post_clauses( $clauses, $query )"));
  assert.ok(php.includes("LEFT JOIN {$lookup_table} AS {$lookup_alias} ON {$wpdb->posts}.ID = {$lookup_alias}.product_id"));
  assert.ok(php.includes("{$lookup_alias}.min_price ASC, {$lookup_alias}.product_id ASC"));
  assert.ok(php.includes("{$lookup_alias}.max_price DESC, {$lookup_alias}.product_id DESC"));
  assert.ok(php.includes("wc_product_meta_lookup"));
  assert.ok(php.includes("CASE WHEN {$lookup_alias}.product_id IS NULL OR {$lookup_alias}.min_price <= 0 THEN 1 ELSE 0 END ASC"));
  assert.ok(php.includes("CASE WHEN {$lookup_alias}.product_id IS NULL OR {$lookup_alias}.max_price <= 0 THEN 1 ELSE 0 END ASC"));
  assert.ok(php.includes("'category' => array( $term->slug )"));
  assert.ok(php.includes("'status' => 'publish'"));
  assert.ok(php.includes("'visibility' => 'visible'"));
  assert.ok(php.includes("'paginate' => true"));
});

test('canonical price sort tokens remain unchanged on the Filter API path with filter dimensions intact', () => {
  assert.ok(js.includes("price:'price_asc','price-desc':'price_desc'"));
  assert.ok(php.includes("'sort' => $sort"));
  assert.ok(php.includes("foreach ( $filter_keys as $filter_key )"));
  assert.ok(php.includes("$filter_params[ $filter_key ] = $value"));
});

test('order selector measures selected option content width and shows focus ring only for keyboard focus', () => {
  assert.ok(js.includes("const fitOrderControl = () =>"));
  assert.ok(js.includes("context.measureText(selectedText).width"));
  assert.ok(js.includes("orderControl.style.width = Math.ceil(textWidth + paddingLeft + paddingRight) + 'px'"));
  const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  assert.ok(css.includes(".cr-product-listing__select-wrap::after { content:\"\"; position:absolute; right:3px"));
  assert.match(css, /cr-product-listing__ordering select:focus-visible \{ outline:2px solid/);
  assert.ok(css.includes(".cr-product-listing__ordering select:focus { outline:none; }"));
});

test('facet refresh keeps existing availability in-flight and removes visible updating status', () => {
  assert.ok(!js.includes("Actualizando…"));
  assert.ok(!js.includes("facetAvailability[d]=null"));
  assert.ok(js.includes("Keep existing availability/options rendered until a current response is accepted"));
  assert.ok(js.includes("activeControllers.forEach(controller=>controller.abort())"));
  assert.ok(js.includes("generation++;const token=generation"));
});

test('staging sort diagnostics record category, exact sort/page size, filters, totals and all ID layers', () => {
  assert.ok(js.includes("category_id:categoryId,sort:sortMap[orderby],page,per_page:pageSize,filters:getFilters()"));
  assert.ok(js.includes("api_product_ids:returnedIds,filter_api_product_ids:filterApiIds,hydrated_product_ids:endpointIds,dom_product_ids:renderedIds"));
  assert.ok(js.includes("returned_total:responseData.total"));
});
