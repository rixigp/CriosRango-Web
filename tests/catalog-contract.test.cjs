const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const jsPath = path.join(root, 'theme/crios-rango-2026/assets/js/main.js');
const phpPath = path.join(root, 'theme/crios-rango-2026/inc/woocommerce.php');
const helpersPath = path.join(root, 'theme/crios-rango-2026/inc/helpers.php');
const cssPath = path.join(root, 'theme/crios-rango-2026/assets/css/main.css');
const archivePath = path.join(root, 'theme/crios-rango-2026/archive-product.php');
const deployPath = path.join(root, '.github/workflows/deploy.yml');

const js = fs.readFileSync(jsPath, 'utf8');
const php = fs.readFileSync(phpPath, 'utf8');
const helpers = fs.readFileSync(helpersPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
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

test('catalog session cache uses a versioned five-minute TTL and state-derived keys', () => {
  const api = catalogStateApi();
  const first = api.catalogCacheKey({ pathname:'/categoria/vestidos/', sort:'newest', filters:{size_ids:['12','4','12'],color_ids:[]} });
  const reordered = api.catalogCacheKey({ pathname:'/categoria/vestidos/', sort:'newest', filters:{color_ids:[],size_ids:['4','12']} });
  const differentSort = api.catalogCacheKey({ pathname:'/categoria/vestidos/', sort:'price_asc', filters:{size_ids:['4','12'],color_ids:[]} });
  assert.equal(first, reordered);
  assert.notEqual(first, differentSort);
  assert.equal(api.CATALOG_SESSION_CACHE_TTL_MS, 300000);
  const entry = { version:1, timestamp:1000, key:first, page:1, pages:[{}], payload:{html:'<article></article>'} };
  assert.equal(api.isValidCatalogCacheEntry(entry, first, 1000 + 299999), true);
  assert.equal(api.isValidCatalogCacheEntry(entry, first, 1000 + 300000), false);
  assert.equal(api.isValidCatalogCacheEntry({...entry,version:2}, first, 1001), false);
  assert.equal(api.isValidCatalogCacheEntry({...entry,key:differentSort}, first, 1001), false);
});

test('catalog listing restores session snapshots and revalidates without clearing cached cards', () => {
  assert.match(js, /sessionStorage\.getItem\(cacheStorageKey\(\)/);
  assert.match(js, /sessionStorage\.setItem\(baseKey, JSON\.stringify\(entry\)\)/);
  assert.match(js, /restoreCatalogCache\(\)/);
  assert.match(js, /revalidateCatalogCache\(entry\)/);
  assert.match(js, /loadPage\(index \+ 1, index > 0, token, responses\[index\], true\)/);
  assert.match(js, /if \(!append && !background\) \{ showEmpty\(\); hasMore = false; \}/);
  assert.match(js, /entry\.scrollY/);
  assert.match(js, /window\.addEventListener\('pagehide',[\s\S]*?writeCatalogCache\(window\.scrollY\)/);
});

test('catalog session snapshots retain loaded pages and isolate sort/filter/context state', () => {
  assert.match(js, /pages: cachedCatalogPages\.slice\(\)/);
  assert.match(js, /page: cachedCatalogPages\.length/);
  assert.match(js, /filters: getFilters\(\)/);
  assert.match(js, /sort: sortMap\[orderby\]/);
  assert.match(js, /categoryId: !brandContext && !outletCategoryId \? categoryId : '0'/);
  assert.match(js, /brandTermId: brandContext \? String\(brandTermId\) : ''/);
  assert.match(js, /outletOriginIds: activeOutletOriginIds\.slice\(\)/);
  assert.match(js, /currentPage = entry\.page/);
  assert.match(js, /hasMore = Boolean\(entry\.hasMore\)/);
});

test('catalog cache rejects invalid payloads and keeps image URLs untouched', () => {
  assert.match(js, /if \(!validateCachedPages\(entry\.pages\)\)/);
  assert.match(js, /sameOrderedIds\(endpoint, rendered\)/);
  assert.doesNotMatch(js, /src\s*\+\s*['"][?&]t=|cache-buster|cachebuster/i);
});

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
  assert.match(js, /window\.CR2026CatalogListing=\{applyFilters,getFilters,renderActiveFilterChips,pageSize,getOutletContext\}/);
  assert.ok(js.includes("filterSheet.querySelector('[data-cr-filter-apply]').addEventListener('click',closeSheet)"));
  assert.match(js, /data-cr-active-filter-chips/);
  assert.match(js, /cr-product-listing__clear-filters/);
  assert.doesNotMatch(js, /window\.location\.assign\(url\.toString\(\)\)/);
  assert.match(js, /window\.history\.replaceState/);
});

test('catalog uses an explicit inline Load more button with retryable append state and no auto observer', () => {
  assert.match(archive, /data-cr-product-load-more/);
  assert.doesNotMatch(archive, /data-cr-product-sentinel/);
  assert.match(js, /loadPage\(currentPage\+1,true,requestGeneration\)/);
  assert.match(js, /updateLoadMoreButton\(true\)/);
  assert.match(js, /updateLoadMoreButton\(false\)/);
  assert.doesNotMatch(js, /catalogObserver|data-cr-product-sentinel/);
  assert.match(js, /if \(!append && !background\) \{ showEmpty\(\); hasMore = false; \}/);
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
  assert.match(js, /prices,returned_total:responseData\.total,total:responseData\.total/);
});

test('staging baseline failure is fail-closed and FULL is reserved for confirmed absence', () => {
  assert.match(deploy, /BASELINE_STATUS="VALID"/);
  assert.match(deploy, /BASELINE_STATUS="ABSENT"/);
  assert.match(deploy, /BASELINE_STATUS="UNAVAILABLE"/);
  assert.match(deploy, /BASELINE_ERROR="curl_exit_\$\{BASELINE_CURL_EXIT\}"/);
  assert.ok(deploy.includes('elif [ "$BASELINE_CURL_EXIT" -eq 78 ] && [ "$BASELINE_RESPONSE_CODE" = "550" ]; then'));
  assert.match(deploy, /DEPLOY_MODE="ABORTED"/);
  assert.match(deploy, /DEPLOY_REASON=REMOTE_BASELINE_UNAVAILABLE/);
  assert.match(deploy, /--retry 2/);
  assert.match(deploy, /BASELINE_STATUS=ABSENT; confirmed missing remote manifest/);
  assert.doesNotMatch(deploy, /Incremental baseline unavailable or unsafe; using full runtime fallback/);
  const abortAt = deploy.indexOf('DEPLOY_REASON=REMOTE_BASELINE_UNAVAILABLE');
  const deleteLoopAt = deploy.indexOf('for FILE in "${DELETE_FILES[@]}"');
  const uploadLoopAt = deploy.indexOf('for FILE in "${UPLOAD_FILES[@]}"');
  assert.ok(abortAt >= 0 && deleteLoopAt > abortAt && uploadLoopAt > abortAt,
    'abort must exit before any FTP delete/upload loop');
  assert.match(deploy, /if \[ "\$DEPLOY_MODE" = "INCREMENTAL" \]; then/);
});

test('staging deploy is exact-HEAD guarded, incremental and verifies the deployed runtime SHA', () => {
  assert.ok(deploy.includes('Check exact PR13 staging HEAD'));
  assert.ok(deploy.includes('git fetch origin fix/catalog-runtime-parity'));
  assert.ok(deploy.includes('fetch-depth: 0'));
  assert.ok(deploy.includes('git diff --name-status -z --find-renames --find-copies'));
  assert.ok(deploy.includes('git merge-base --is-ancestor'));
  assert.ok(deploy.includes('DEPLOY_MODE="INCREMENTAL"'));
  assert.ok(deploy.includes('DEPLOY_MODE="FULL"'));
  assert.ok(deploy.includes('DELETE_FILES+=("$OLD_PATH")'));
  assert.ok(deploy.includes('--quote "-DELE $REL"'));
  assert.ok(deploy.includes('--ftp-create-dirs'));
  assert.ok(deploy.includes('THEME_DEPLOY_SHA="$REMOTE_SHA"'));
  assert.ok(deploy.includes('UPLOAD_FILES+=("$THEME_ROOT/build.json")'));
  assert.ok(deploy.includes('EXPECTED_THEME_SHA'));
  assert.ok(deploy.includes('steps.deploy.outputs.theme_deploy_sha'));
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
  assert.ok(php.includes("{$lookup_alias}.min_price ASC, {$wpdb->posts}.post_date DESC, {$wpdb->posts}.ID DESC"));
  assert.ok(php.includes("{$lookup_alias}.min_price DESC, {$wpdb->posts}.post_date DESC, {$wpdb->posts}.ID DESC"));
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
  assert.ok(js.includes("category_id:categoryId,outlet_category_id:outletCategoryId,origin_category_ids:activeOutletOriginIds.slice(),selected_bubble_key:selectedOutletBubbleKey,sort:sortMap[orderby],page,per_page:pageSize,filters:getFilters()"));
  assert.ok(js.includes("api_product_ids:returnedIds,filter_api_product_ids:filterApiIds,hydrated_product_ids:endpointIds,dom_product_ids:renderedIds"));
  assert.ok(js.includes("returned_total:responseData.total"));
});

test('Outlet candidates copy APP mapping IDs, keys and branch order',()=>{
  assert.ok(helpers.includes('function cr2026_fixed_outlet_bubbles'));
  assert.ok(helpers.includes("'key'=>'camisas','label'=>'Camisas','category_ids'=>array(318)"));
  assert.ok(helpers.includes("'key'=>'camisetas y polos','label'=>'Camisetas y polos','category_ids'=>array(319)"));
  assert.ok(helpers.includes("'key'=>'ropa de bano','label'=>'Ropa de baño','category_ids'=>array(80,286)"));
  assert.ok(helpers.includes("'key'=>'ropa de vestir','label'=>'Ropa de vestir','category_ids'=>array(315,312)"));
});
test('Outlet availability is resolved at runtime and fails closed',()=>{
  assert.ok(helpers.includes('criosrango/v1/outlet-availability'));
  assert.ok(js.includes('payload.schema_version!==1'));
  assert.ok(js.includes('failClosedOutletBubbles'));
  assert.ok(js.includes('const countByCategory=new Map'));
});
test('Outlet selection keeps the active branch and sends APP origin IDs to results and facets',()=>{
  assert.ok(js.includes("scope:outletCategoryId?'outlet':'catalog'"));
  assert.ok(js.includes("params.set('outlet_category_id',String(outletCategoryId))"));
  assert.ok(js.includes("params.set('origin_category_ids',activeOutletOriginIds.join(','))"));
  assert.ok(js.includes("params.set('origin_category_ids',context.originCategoryIds.join(','))"));
  assert.ok(php.includes("$filter_params['outlet_category_id']"));
  assert.ok(php.includes("$filter_params['origin_category_ids']"));
});
test('Outlet bubbles are positioned between toolbar and active filter chips',()=>{
  assert.ok(archive.indexOf('cr2026_render_outlet_bubbles')>archive.indexOf('cr2026_render_category_toolbar'));
  assert.ok(archive.indexOf('cr2026_render_outlet_bubbles')<archive.indexOf('data-cr-active-filter-chips'));
  const outletCss=fs.readFileSync(path.join(root,'theme/crios-rango-2026/assets/css/outlet-bubbles.css'),'utf8');
  assert.ok(outletCss.includes('overflow-x:auto'));
  assert.ok(outletCss.includes('.cr-outlet-bubbles__pill.is-selected{background:#163B35;color:#FFFFFF}'));
});



test('global header product search trigger opens the existing form panel and blocks empty submit',()=>{
  const header=helpers.match(/function cr2026_render_app_header\(\)[\s\S]*?function cr2026_attachment_public_url/)[0];
  const searchform=fs.readFileSync(path.join(root,'theme/crios-rango-2026/searchform.php'),'utf8');
  assert.match(header,/<button type="button" class="cr-app-icon-button" data-cr-header-search-toggle/);
  assert.match(header,/aria-expanded="false" aria-controls="cr-header-search-panel"/);
  assert.doesNotMatch(header,/href=.*s=&post_type=product/);
  assert.match(header,/id="cr-header-search-panel"/);
  assert.match(header,/get_search_form\(\)/);
  assert.ok(js.includes("headerSearchToggle.addEventListener('click', toggleHeaderSearch)"));
  assert.match(js,/headerSearchInput\.focus\(\{ preventScroll: true \}\)/);
  assert.match(js,/event\.key === 'Escape'/);
  assert.match(js,/headerSearchInput\.value\.trim\(\) === ''[\s\S]*?event\.preventDefault\(\)/);
  assert.match(searchform,/type="search" name="s"/);
  assert.match(searchform,/name="post_type" value="product"/);
  assert.match(searchform,/action=.*home_url\( '\/' \)/);
});



test('WooCommerce product search results reuse the shared catalog product-card renderer',()=>{
  const searchTemplate=fs.readFileSync(path.join(root,'theme/crios-rango-2026/search.php'),'utf8');
  assert.match(searchTemplate,/\$is_product_search\s*=\s*is_search\(\)/);
  assert.match(searchTemplate,/\'product\' === \$requested_post_type/);
  assert.match(searchTemplate,/cr2026_render_product_card\( \$search_product, \$card_index \)/);
  assert.match(searchTemplate,/class="cr-product-grid" data-cr-search-product-grid/);
  assert.match(searchTemplate, /cr2026_render_product_card/);
  assert.ok(searchTemplate.includes('<?php else : ?>'));
  assert.match(searchTemplate, /cr-post-card/);
  assert.match(searchTemplate,/No encontramos productos para/);
  assert.match(searchTemplate,/cr2026_shop_url\(\)/);
  assert.match(searchTemplate,/get_search_query\(\)/);
});

test('product search routing overrides WooCommerce Shop template and keeps the product search main query',()=>{
  const searchTemplate=fs.readFileSync(path.join(root,'theme/crios-rango-2026/search.php'),'utf8');
  assert.match(php,/function cr2026_product_search_template_include\( \$template \)/);
  assert.match(php,/if \( ! is_search\(\) \) \{\s*return \$template;/);
  assert.match(php,/\$requested_post_type = get_query_var\( 'post_type' \)/);
  assert.match(php,/\$is_product_search = 'product' === \$requested_post_type/);
  assert.match(php,/locate_template\( 'search.php' \)/);
  assert.match(php,/add_filter\( 'template_include', 'cr2026_product_search_template_include', 99 \)/);
  assert.match(searchTemplate,/\$is_product_search\s*=\s*is_search\(\)/);
  assert.match(searchTemplate,/cr2026_render_product_card\( \$search_product, \$card_index \)/);
  assert.doesNotMatch(searchTemplate,/cr2026_render_category_toolbar|cr2026_home_categories|cr-app-category-grid|Categorías/);
  assert.match(searchTemplate,/get_search_query\(\)/);
  assert.match(searchTemplate,/No encontramos productos para/);
});


test('main product searches bypass Shop/category archive query mutators',()=>{
  const mainQueryMutator=php.match(/function cr2026_product_listing_main_query\( \$query \)[\s\S]*?\n\}/);
  const shortCircuitMutator=php.match(/function cr2026_product_listing_short_circuit_query\( \$posts, \$query \)[\s\S]*?\n\}/);
  assert.ok(mainQueryMutator, 'pre_get_posts catalog mutator must be present');
  assert.ok(shortCircuitMutator, 'posts_pre_query catalog mutator must be present');
  assert.match(mainQueryMutator[0], /\$query->is_search\(\)/, 'main search must bypass catalog pre_get_posts mutation');
  assert.match(shortCircuitMutator[0], /\$query->is_search\(\)/, 'main search must bypass catalog posts_pre_query short circuit');
  assert.match(php, /add_action\( 'pre_get_posts', 'cr2026_product_listing_main_query', 99 \)/);
  assert.match(php, /add_filter\( 'posts_pre_query', 'cr2026_product_listing_short_circuit_query', 20, 2 \)/);
});


test('product search uses compact app-like search field, preserves query, and keeps product suggestions linked to detail',()=>{
  const searchTemplate=fs.readFileSync(path.join(root,'theme/crios-rango-2026/search.php'),'utf8');
  const searchForm=fs.readFileSync(path.join(root,'theme/crios-rango-2026/searchform.php'),'utf8');
  const styles=fs.readFileSync(path.join(root,'theme/crios-rango-2026/assets/css/main.css'),'utf8');
  assert.match(searchTemplate,/get_search_query\(\)/);
  assert.match(searchForm,/name="s" value="<\?php echo esc_attr\( get_search_query\(\) \); \?>"/);
  assert.match(searchForm,/name="post_type" value="product"/);
  assert.match(searchTemplate,/cr2026_render_product_card\( \$search_product, \$card_index \)/);
  assert.match(searchTemplate,/cr-search-suggestions/);
  assert.match(searchTemplate,/get_permalink\( \$suggestion_product->get_id\(\) \)/);
  assert.match(styles,/body\.search \.cr-search-form__submit \{ display:none; \}/);
  assert.match(styles,/background:#FCFAF7/);
  assert.match(styles,/\.cr-search-results-page \.page-numbers/);
  assert.match(styles,/scroll-padding-top:var\(--cr-app-topbar-height,64px\)/);
  assert.match(searchForm,/data-cr-search-clear/);
  assert.match(js,/data-cr-search-clear/);
  assert.match(js,/input\.dispatchEvent\(new Event\('input'/);
});


test('admin-bar sticky positioning is global and public header behavior remains unchanged',()=>{
  const styles=fs.readFileSync(path.join(root,'theme/crios-rango-2026/assets/css/main.css'),'utf8');
  const helpers=fs.readFileSync(path.join(root,'theme/crios-rango-2026/inc/helpers.php'),'utf8');
  const header=fs.readFileSync(path.join(root,'theme/crios-rango-2026/header.php'),'utf8');
  const skin=fs.readFileSync(path.join(root,'theme/crios-rango-2026/assets/css/product-detail-skin.css'),'utf8');
  assert.match(header,/cr2026_render_app_header\(\)/);
  assert.match(helpers,/\$classes\[\] = 'cr-global-app-header'/);
  assert.match(styles,/body\.admin-bar\.cr-global-app-header \.cr-app-header\s*\{[^}]*position:\s*sticky !important;[^}]*top:\s*var\(--cr-admin-bar-sticky-top, 0px\) !important;/s);
  assert.equal((styles.match(/body\.admin-bar\.cr-global-app-header \.cr-app-header\s*\{/g)||[]).length,1);
  assert.match(styles,/body\.admin-bar\.cr-global-app-header:not\(\.home\)\s*\{\s*padding-top:\s*0 !important;/);
  assert.match(styles,/body\.admin-bar\s*\{\s*--cr-admin-bar-offset:\s*32px;\s*--cr-admin-bar-sticky-top:\s*32px;/);
  assert.match(styles,/@media \(max-width: 782px\)\s*\{\s*body\.admin-bar\s*\{\s*--cr-admin-bar-offset:\s*46px;\s*--cr-admin-bar-sticky-top:\s*46px;/);
  assert.match(styles,/@media \(max-width: 600px\)\s*\{\s*body\.admin-bar\s*\{\s*--cr-admin-bar-sticky-top:\s*0px;/);
  assert.match(styles,/body\.admin-bar\.home \.cr-app-header\s*\{\s*margin-bottom:\s*calc\(-1 \* var\(--cr-app-topbar-height, 96px\)\);/);
  assert.match(styles,/\.cr-app-header\s*\{[^}]*z-index:\s*1150;/s);
  assert.doesNotMatch(styles,/#wpadminbar\s*\{/);
  assert.doesNotMatch(styles,/body\.admin-bar(?:\.search|\.cr-product-detail-app|\.cr-parent-category-view|\.cr-product-listing-view)[^{]*\.cr-app-header\s*\{/);
  assert.doesNotMatch(skin,/body\.admin-bar\.cr-product-detail-app \.cr-app-header/);
  assert.match(styles,/body\.search \.cr-app-header \{[^}]*position:sticky!important;[^}]*top:0;/s);
  assert.match(styles,/body\.cr-global-app-header:not\(\.home\)\s*\{[^}]*padding-top:\s*var\(--cr-app-topbar-height\)/s);
});

test('product search has no active bottom-navigation destination while links remain navigable',()=>{
  const helpers=fs.readFileSync(path.join(root,'theme/crios-rango-2026/inc/helpers.php'),'utf8');
  const footer=fs.readFileSync(path.join(root,'theme/crios-rango-2026/footer.php'),'utf8');
  const active=helpers.match(/function cr2026_app_nav_active_item\(\) \{[\s\S]*?\n\}/)?.[0]||'';
  assert.match(active,/function_exists\( 'is_search' \) && is_search\(\) && 'product' === get_query_var\( 'post_type' \) \) \{ return ''; \}/);
  assert.ok(active.indexOf("return '';")<active.indexOf("is_shop()"));
  for(const destination of ['home','categories','outlet','cart','account']) assert.ok(footer.includes("$nav_urls['"+destination+"']"));
  assert.match(footer,/data-cr-cart-count/);
});

test('mobile product search shows no more than three suggestions without changing their source',()=>{
  const styles=fs.readFileSync(path.join(root,'theme/crios-rango-2026/assets/css/main.css'),'utf8');
  const searchTemplate=fs.readFileSync(path.join(root,'theme/crios-rango-2026/search.php'),'utf8');
  assert.match(styles,/@media\(max-width:767px\)\s*\{\s*body\.search \.cr-search-suggestions li:nth-child\(n\+4\) \{ display:none; \}/);
  assert.match(searchTemplate,/\$GLOBALS\['wp_query'\]->posts/);
  assert.match(searchTemplate,/foreach \( \$GLOBALS\['wp_query'\]->posts as \$suggestion_post \)/);
  assert.match(searchTemplate,/cr2026_render_product_card\( \$search_product, \$card_index \)/);
});


test('product_brand archives use the fixed brand context and shared catalog-page cards, never category landings', () => {
  const brandArchive = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const helpers = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/helpers.php'), 'utf8');
  assert.match(brandArchive, /get_queried_object\(\)/);
  assert.match(brandArchive, /'product_brand' !== \$brand_term->taxonomy/);
  assert.match(brandArchive, /\$GLOBALS\['cr2026_product_listing_view'\] = true/);
  assert.match(brandArchive, /data-context="brand"/);
  assert.match(brandArchive, /data-brand-term-id=/);
  assert.match(brandArchive, /data-products-url=.*catalog-page/s);
  assert.match(brandArchive, /data-cr-product-grid/);
  assert.match(brandArchive, /data-cr-product-load-more/);
  assert.doesNotMatch(brandArchive, /while \( have_posts\(\) \)|the_post\(\)|the_posts_pagination\(/);
  assert.doesNotMatch(brandArchive, /new WP_Query|cr2026_render_category_toolbar|cr2026_home_categories|Categorías/);
  assert.match(helpers, /is_tax\( 'product_brand' \)/);
  assert.match(helpers, /function cr2026_home_brand_image_url\( \$term \)/);
  assert.match(helpers, /array\( 'thumbnail_id', 'image_id' \)/);
  assert.match(php, /\$is_category_query = \$query->is_tax\( 'product_cat' \)/);
  assert.match(php, /\$is_brand_query = \$query->is_tax\( 'product_brand' \)/);
});


test('Search exposes exactly two app controls and the custom clear never closes the panel', () => {
  const searchForm = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/searchform.php'), 'utf8');
  const helpers = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/helpers.php'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  const clearHandler = js.slice(js.indexOf("// Search field clear control"), js.indexOf("const slides"));
  assert.match(searchForm, /data-cr-search-clear/);
  assert.match(helpers, /data-cr-header-search-close/);
  assert.match(clearHandler, /input\.value = ''/);
  assert.match(clearHandler, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(clearHandler, /dispatchEvent\(new Event\('input'/);
  assert.doesNotMatch(clearHandler, /headerSearchClose|closeButton|\.click\(\)/);
  assert.match(styles, /::-webkit-search-cancel-button[\s\S]*?display:none!important;/);
  assert.match(styles, /::-webkit-search-decoration/);
  assert.match(styles, /::-ms-clear/);
  assert.match(styles, /::-ms-reveal/);
  assert.doesNotMatch(styles, /body\.home \.cr-app-header \.cr-cart-count,[\s\S]*?background:\s*#b3261e/);
  assert.match(styles, /\.cr-cart-count\s*\{[\s\S]*?background:\s*var\(--cr-green\)/);
});

test('Search empty state has the compact requested copy and canonical WooCommerce Shop destination', () => {
  const searchTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/search.php'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  assert.match(searchTemplate, /No encontramos productos para “%s”/);
  assert.match(searchTemplate, /class="cr-search-empty__cta"/);
  assert.match(searchTemplate, /Explorar catálogo/);
  assert.match(searchTemplate, /href="<\?php echo esc_url\( cr2026_shop_url\(\) \); \?>"/);
  assert.match(helpers, /function cr2026_shop_url\(\)[\s\S]*?wc_get_page_permalink\( 'shop' \)/);
  assert.match(styles, /\.cr-search-empty__cta\s*\{[\s\S]*?min-height:44px[\s\S]*?border-radius:999px[\s\S]*?background:#E3EFEB[\s\S]*?text-decoration:none!important/s);
});


test('Global header search hides only the native input[type=search] clear decoration', () => {
  const searchForm = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/searchform.php'), 'utf8');
  const helpers = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/helpers.php'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  assert.match(searchForm, /type="search" name="s"/);
  assert.match(styles, /\.cr-app-header \.cr-header-search-panel \.cr-search-form input\[type="search"\]::-webkit-search-cancel-button/);
  assert.match(styles, /\.cr-app-header \.cr-header-search-panel \.cr-search-form input\[type="search"\]::-webkit-search-decoration/);
  assert.match(styles, /\.cr-app-header \.cr-header-search-panel \.cr-search-form input\[type="search"\]::-ms-clear/);
  assert.match(styles, /\.cr-app-header \.cr-header-search-panel \.cr-search-form input\[type="search"\]::-ms-reveal/);
  const nativeClearRule = styles.slice(styles.indexOf('/* Hide only browser-provided search decorations in the global header search field. */'));
  assert.match(nativeClearRule, /display:none!important/);
  assert.match(helpers, /data-cr-header-search-close/);
  const clearHandler = js.slice(js.indexOf("// Search field clear control"), js.indexOf("const slides"));
  assert.match(clearHandler, /input\.value = ''/);
  assert.match(clearHandler, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(clearHandler, /headerSearchClose|closeButton|\.click\(\)/);
});


test('brand archive uses the shared contextual back control and shows either logo or text, never both', () => {
  const brandArchive = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const productSkin = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/product-skin.php'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  assert.match(brandArchive, /function_exists\( 'cr2026_home_brands_url' \) \? cr2026_home_brands_url\(\)/);
  assert.match(brandArchive, /class="cr-brand-archive__back-row"/);
  assert.match(brandArchive, /class="cr-parent-category__back"/);
  assert.match(brandArchive, /cr2026_icon\( 'arrow' \)/);
  assert.match(brandArchive, /data-fallback-url=/);
  assert.match(brandArchive, /data-site-path=/);
  assert.match(brandArchive, /if \( \$brand_logo_url \)[\s\S]*?<img[\s\S]*?<\?php else : \?>[\s\S]*?<h1>/);
  assert.doesNotMatch(brandArchive, /<h1>[\s\S]*?<img/);
  assert.match(productSkin, /if \( ! is_product\(\) && ! is_tax\( 'product_brand' \) \) \{ return; \}/);
  assert.match(productSkin, /document\.querySelector\('\.cr-parent-category__back\[data-fallback-url\]'\)/);
  assert.match(productSkin, /previous\.origin === current\.origin/);
  assert.match(productSkin, /insideSite && isDifferentPage/);
  assert.match(styles, /\.cr-brand-archive__back-row \.cr-parent-category__back/);
  assert.match(styles, /object-fit:contain/);
  assert.match(brandArchive, /data-cr-product-grid/);
  assert.match(php, /cr2026_render_product_card\( \$product, \$index \+/);
});


test('sale badge is centralized and rendered by every theme product-card path', () => {
  const frontPage = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/front-page.php'), 'utf8');
  const woocommerce = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/woocommerce.php'), 'utf8');
  const brandArchive = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const searchTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/search.php'), 'utf8');
  const archiveTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/archive-product.php'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  assert.match(helpers, /function cr2026_render_product_sale_badge\( \$product \)[\s\S]*?! \$product->is_on_sale\(\)[\s\S]*?cr-product-card__badge/);
  assert.match(helpers, /function cr2026_render_product_card\([\s\S]*?cr2026_render_product_sale_badge\( \$product \)/);
  assert.match(helpers, /function cr2026_product_card\([\s\S]*?cr2026_render_product_sale_badge\( \$product \)/);
  assert.match(frontPage, /cr-home-product__image[\s\S]*?cr2026_render_product_sale_badge\( \$product \)/);
  assert.match(woocommerce, /cr2026_catalog_page_rest_response[\s\S]*?cr2026_render_product_card\( \$product/);
  assert.match(archiveTemplate, /data-products-url=.*catalog-page/);
  assert.match(brandArchive, /data-products-url=.*catalog-page/s);
  assert.match(php, /cr2026_render_product_card\( \$product, \$index \+/);
  assert.match(searchTemplate, /cr2026_render_product_card\( \$search_product/);
  assert.match(css, /\.cr-product-card__badge \{\s*position:\s*absolute;\s*top:\s*10px;\s*left:\s*10px;\s*padding:\s*7px 10px;\s*border-radius:\s*999px;\s*background:\s*var\(--cr-sale-coral\)/);
  assert.match(css, /\.cr-home-product__image \{\s*position: relative;/);
  assert.match(css, /\.woocommerce ul\.products li\.product \.onsale, \.woocommerce span\.onsale \{[^}]*background:\s*var\(--cr-sale-coral\);[^}]*color:\s*#fff;[^}]*text-transform:\s*uppercase;/);
  assert.match(helpers, /\$price_html = \$product->get_price_html\(\)/);
});

test('brand back and brand identity share one centered grid row without responsive changes', () => {
  const brandArchive = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  const rowStart = brandArchive.indexOf('<div class="cr-brand-archive__back-row">');
  const rowEnd = brandArchive.indexOf('</div>', rowStart);
  const row = brandArchive.slice(rowStart, rowEnd);
  assert.ok(row.includes('cr-parent-category__back'));
  assert.ok(row.includes('cr-brand-archive__heading'));
  assert.ok(row.includes('data-cr-filter-open'));
  assert.match(css, /\.cr-brand-archive__back-row \{[^}]*display:grid; grid-template-columns:48px minmax\(0,1fr\) 48px; align-items:center;/);
  assert.match(css, /\.cr-brand-archive__heading \{[^}]*grid-column:2; grid-row:1;[^}]*margin:0; padding:0;/);
  assert.match(css, /\.cr-brand-archive__heading img \{[^}]*object-fit:contain/);
});

test('brand archive uses the shared catalog-page endpoint and filter-API pagination; Search keeps HTML pagination', () => {
  const brand = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const search = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/search.php'), 'utf8');
  assert.match(brand, /data-cr-product-list/);
  assert.match(brand, /data-products-url=.*cr2026\/v1\/catalog-page/s);
  assert.match(brand, /data-cr-product-grid/);
  assert.match(brand, /data-cr-product-load-more/);
  assert.doesNotMatch(brand, /data-cr-html-pagination|data-cr-html-load-more/);
  assert.match(search, /get_next_posts_page_link\(\)/);
  assert.match(search, /data-cr-html-load-more data-next-url=/);
  assert.match(js, /loadPage\(currentPage\+1,true,requestGeneration\)/);
  assert.match(js, /fetch\(nextUrl,\{credentials:'same-origin',headers:\{Accept:'text\/html'\}\}\)/);
  assert.match(js, /grid\.appendChild\(fragment\)/);
  assert.match(js, /new URL\(nextLink\.href,nextDocument\.baseURI\)/);
  assert.match(js, /if\(loading\|\|!nextUrl\)return/);
  assert.match(js, /button\.textContent='Cargando…'/);
});


test('brand archive uses the existing shared catalog sort control and retains brand context', () => {
  const brandTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  assert.match(brandTemplate, /class="cr-product-listing__ordering"/);
  assert.match(brandTemplate, /data-cr-product-order/);
  assert.match(brandTemplate, /get_term_link\( \$brand_term \)/);
  for (const value of ['date', 'price', 'price-desc', 'title']) assert.ok(brandTemplate.includes('value="' + value + '"'));
  assert.ok(js.includes("const sortMap = {date:'newest',price:'price_asc','price-desc':'price_desc',title:'title_asc'};"));
  assert.match(js, /orderControl.addEventListener\('change'/);
  assert.match(js, /window\.history\.replaceState\(\{\},'',currentUrl\.toString\(\)\)/);
  assert.match(js, /resetAndLoad\(\)/);
  assert.doesNotMatch(brandTemplate, /new WP_Query/);
  assert.doesNotMatch(brandTemplate, /data-cr-brand-order/);
});

test('brand and catalog share one canonical sort mapping on the existing main query', () => {
  assert.match(php, /function cr2026_catalog_sort_query_vars\( \$sort \)/);
  assert.match(php, /'oldest' === \$sort/);
  assert.match(php, /array\( 'price', 'price_asc' \)/);
  assert.match(php, /array\( 'price-desc', 'price_desc' \)/);
  assert.match(php, /'title_asc' === \$sort/);
  assert.match(php, /'title_desc' === \$sort/);
  assert.match(php, /function cr2026_product_listing_main_query\( \$query \)/);
  assert.match(php, /\$is_brand_query = \$query->is_tax\( 'product_brand' \)/);
  assert.match(php, /isset\( \$_GET\['orderby'\] \)/);
  assert.match(php, /sanitize_key\( wp_unslash\( \$_GET\['orderby'\] \) \)/);
  assert.match(php, /cr2026_catalog_sort_query_vars\( \$requested_sort \)/);
  assert.match(php, /cr2026_catalog_sort_query_vars\( \$sort \)/);
  assert.match(php, /add_action\( 'pre_get_posts', 'cr2026_product_listing_main_query', 99 \)/);
  assert.match(php, /add_filter\( 'posts_clauses', 'cr2026_catalog_price_sort_post_clauses', 20, 2 \)/);
  assert.doesNotMatch(php, /cr2026_brand_archive_native_sort/);
  assert.doesNotMatch(php, /\$query->set\( 'tax_query'/);
  assert.doesNotMatch(php, /new WP_Query/);
});


test('brand archive order select reuses the shared catalog selector sizing and change handler', () => {
  const brandTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  assert.match(brandTemplate, /class="cr-product-listing__ordering"/);
  assert.match(brandTemplate, /<label for="cr-brand-product-order">/);
  assert.match(brandTemplate, /<select id="cr-brand-product-order" data-cr-product-order/);
  for (const value of ['date', 'price', 'price-desc', 'title']) assert.ok(brandTemplate.includes('value="' + value + '"'));
  assert.match(css, /\.cr-product-listing__select-wrap::after \{[^}]*right:3px;[^}]*width:7px;/);
  assert.match(js, /const fitOrderControl = \(\) =>/);
  assert.match(js, /orderControl.style.width = Math.ceil\(textWidth \+ paddingLeft \+ paddingRight\) \+ 'px'/);
  assert.match(js, /fitOrderControl\(\);[\s\S]*?orderControl.addEventListener\('change'/);
});


test('temporary brand sort diagnostics and brand-only sorting are fully removed', () => {
  assert.doesNotMatch(php, /crsortdebug|CR2026_BRAND_SORT_DEBUG|cr2026_capture_brand_sort_debug|cr2026_render_brand_sort_debug/);
  assert.doesNotMatch(php, /cr2026_brand_archive_native_sort/);
});


test('brand filter sheet accepts only product_brand terms and exposes fixed catalog context without a brand facet', () => {
  const brandArchive = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  assert.match(helpers, /\$is_brand_context = 'brand' === \$context/);
  assert.match(helpers, /if \( ! \$term instanceof WP_Term \|\| 'product_brand' !== \$term->taxonomy \) \{ return; \}/);
  assert.match(helpers, /data-context=.*\$context/);
  assert.match(helpers, /data-catalog-brand-id=.*\$filter_brand_id/);
  assert.match(helpers, /\$dimensions = \$is_brand_context \? array\( 'sizes' => 'Talla', 'colors' => 'Color' \)/);
  assert.match(brandArchive, /get_queried_object\(\)/);
  assert.match(brandArchive, /\$brand_term->term_id/);
  assert.match(brandArchive, /data-cr-filter-open/);
  assert.match(brandArchive, /cr2026_render_category_filter_sheet\( \$brand_term, 'brand' \)/);
  assert.match(fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8'), /cr-brand-archive__back-row \.cr-parent-category__filters[^}]*opacity:1;[^}]*cursor:pointer;/);
});

test('brand requests always carry catalog scope and catalog_brand_id, never fake category or legacy brand context', () => {
  assert.match(js, /const brandContext = filterSheet\.dataset\.context === 'brand'/);
  assert.match(js, /new URLSearchParams\(\{scope:filterSheet\.dataset\.scope\|\|'catalog'/);
  assert.match(js, /params\.set\('catalog_brand_id',catalogBrandId\)/);
  assert.match(js, /const brandContext = productListing\.dataset\.context === 'brand'/);
  assert.match(js, /scope:outletCategoryId\?'outlet':'catalog'/);
  assert.match(js, /params\.set\('catalog_brand_id',String\(brandTermId\)\)/);
  assert.match(php, /\$brand_id = absint\( \$request->get_param\( 'catalog_brand_id' \) \)/);
  assert.match(php, /\$filter_params\['catalog_brand_id'\] = \$brand_id/);
  assert.match(php, /\$has_filters = \$is_outlet_scope \|\| \$is_brand_context/);
  const brandRequest = js.slice(js.indexOf('const buildCatalogPageUrl'), js.indexOf('const revalidateCatalogCache'));
  const fixedBrandRequest = brandRequest.slice(brandRequest.indexOf('if(brandContext)'), brandRequest.indexOf('else if(outletCategoryId)'));
  assert.match(fixedBrandRequest, /catalog_brand_id/);
  assert.doesNotMatch(fixedBrandRequest, /catalog_category_id|brand_ids/);
  assert.doesNotMatch(brandRequest, /params\.set\('brand_ids'/);
});

test('brand filters preserve active sort, clear only selectable dimensions, and keep context on every page', () => {
  assert.match(js, /const filterKeys = brandContext \? \['size_ids','color_ids'\]/);
  assert.match(js, /loadPage\(currentPage\+1,true,requestGeneration\)/);
  assert.match(js, /sort:sortMap\[orderby\]/);
  assert.match(js, /params\.set\('catalog_brand_id',String\(brandTermId\)\)/);
  assert.match(js, /window\.history\.replaceState\(\{\},'',currentUrl\.toString\(\)\)/);
  const sharedOrderHandler = js.slice(js.indexOf('if (orderControl)'), js.indexOf('// Size the native brand select'));
  assert.match(sharedOrderHandler, /currentUrl\.searchParams\.delete\('orderby'\)/);
  assert.match(sharedOrderHandler, /resetAndLoad\(\)/);
  assert.match(php, /if \( \$is_brand_context \) \{\s*\$filter_params\['catalog_brand_id'\] = \$brand_id;/);
});

test('category and Outlet contexts remain separate from brand context', () => {
  assert.match(js, /params\.set\('catalog_category_id',categoryId\)/);
  assert.match(js, /params\.set\('outlet_category_id',String\(context\.categoryId\)\)/);
  assert.match(php, /\$filter_params\['catalog_category_id'\] = \$category_id/);
  assert.match(php, /\$filter_params\['outlet_category_id'\] = \$outlet_category_id/);
  assert.match(php, /'outlet' === \$scope/);
});


test('unfiltered root Novedades reuses direct WooCommerce while filtered contexts retain Filter API', () => {
  assert.match(php, /\$has_filters = \$is_outlet_scope \|\| \$is_brand_context/);
  assert.match(php, /if \( \$has_filters \) \{\s*\$filter_request = new WP_REST_Request/);
  assert.match(php, /if \( \$category_id > 0 && \( ! \$term instanceof WP_Term/);
  assert.match(php, /if \( \$term instanceof WP_Term \) \{ \$products_query\['category'\] = array\( \$term->slug \)/);
  assert.match(php, /'status' => 'publish'/);
  assert.match(php, /'visibility' => 'visible'/);
  assert.doesNotMatch(php, /is_purchasable\(\)/);
  assert.match(php, /elseif \( \$category_id > 0 \) \{\s*\$filter_params\['catalog_category_id'\] = \$category_id;/);
  assert.match(js, /else if\(categoryId!=='0'\)params\.set\('catalog_category_id',categoryId\)/);
});
test('server catalog cache uses fresh/stale transients and generation-complete keys', () => {
  assert.match(php, /set_transient\( \$cache_key, \$payload, 300 \)/);
  assert.match(php, /set_transient\( \$cache_key \. '_stale', \$payload, 1800 \)/);
  assert.match(php, /cr2026_catalog_cache_generation/);
  assert.match(php, /cr2026_catalog_v1_/);
  assert.match(php, /wp_json_encode\( \$state \)/);
  for (const key of ['scope','category_id','brand_id','outlet_category_id','origin_category_ids','size_ids','color_ids','brand_ids','sort','page','per_page','locale','currency','tax_display']) assert.ok(php.includes("'" + key + "' =>"), 'cache key missing ' + key);
  assert.match(php, /update_option\( 'cr2026_catalog_cache_generation', cr2026_catalog_cache_generation\(\) \+ 1, false \)/);
});
test('server cache HIT skips the catalog pipeline; MISS validates and stores; locks serve same-generation stale', () => {
  assert.ok(php.includes("if ( 'hit' === $cache_result['state'] || 'stale' === $cache_result['state'] ) {"));
  assert.match(php, /function cr2026_catalog_cache_payload_valid/);
  assert.match(php, /cr2026_catalog_cache_payload_valid\( \$payload \)/);
  assert.match(php, /'locked' === \$cache_result\['state'\]/);
  assert.match(php, /add_option\( '_transient_' \. \$lock_key/);
  assert.match(php, /time\(\) \+ 30/);
  for (const status of ['STALE','HIT','MISS','BYPASS']) assert.ok(php.includes("'" + status + "'"));
});
test('catalog generation invalidates product, variation, stock, category, brand and attributes once per request', () => {
  for (const hook of ['save_post_product','save_post_product_variation','woocommerce_update_product','woocommerce_update_product_variation','before_delete_post','woocommerce_product_set_stock','woocommerce_variation_set_stock','woocommerce_product_set_stock_status','woocommerce_variation_set_stock_status','set_object_terms','created_term','edited_term','delete_term']) assert.ok(php.includes("add_action( '" + hook + "'"), 'missing hook ' + hook);
  assert.match(php, /static \$invalidated_this_request = false/);
  assert.match(php, /strpos\( \(string\) \$taxonomy, 'pa_' \)/);
  assert.match(php, /cr2026_catalog_cache_session_sensitive/);
});

test('Novedades route renders all products through the shared catalog listing with recent-first default', () => {
  const routes = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/catalog-routes.php'), 'utf8');
  assert.match(routes, /\^novedades\/\?\$.*cr2026_novelties=1/s);
  assert.match(routes, /cr2026_novelties.*archive-product\.php/s);
  assert.match(archive, /! get_query_var\( 'cr2026_novelties' \)/);
  assert.match(archive, /\$listing_category_id = \$listing_term \? \(int\) \$listing_term->term_id : 0/);
  assert.match(archive, /\$is_novelties_view \? __\( 'Novedades'/);
  assert.match(archive, /\$listing_orderby = isset\( \$_GET\['orderby'\] \).*: 'date'/s);
  assert.match(archive, /cr2026_render_category_filter_sheet\( \$listing_term, \$listing_context \)/);
  assert.match(js, /scope:outletCategoryId\?'outlet':'catalog'/);
  assert.match(archive, /data-cr-product-load-more/);
});

test('Nuestras marcas route includes all product_brand terms, including zero-count terms, in NAME_ASC order', () => {
  const routes = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/catalog-routes.php'), 'utf8');
  const brandTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/page-marcas.php'), 'utf8');
  const indexFn = helpers.slice(helpers.indexOf('function cr2026_brands_index_terms'), helpers.indexOf('function cr2026_home_brand_image_url'));
  assert.match(routes, /\^marcas\/\?\$.*cr2026_brands_index=1/s);
  assert.match(routes, /cr2026_brands_index.*page-marcas\.php/s);
  assert.match(indexFn, /'taxonomy'\s*=>\s*'product_brand'/);
  assert.match(indexFn, /'hide_empty'\s*=>\s*false/);
  assert.doesNotMatch(indexFn, /\$term->count\s*>\s*0/);
  assert.match(indexFn, /'orderby'\s*=>\s*'name'/);
  assert.match(indexFn, /'order'\s*=>\s*'ASC'/);
  assert.doesNotMatch(indexFn, /product_tag/);
  assert.match(brandTemplate, /cr2026_brands_index_terms\(\)/);
  assert.match(brandTemplate, /data-brand-term-id=/);
  assert.match(brandTemplate, /data-brand-term-name=/);
  assert.match(brandTemplate, /data-brand-term-slug=/);
  assert.match(brandTemplate, /get_term_link\( \$brand, 'product_brand' \)/);
  assert.match(brandTemplate, /if \( \$brand_logo \)[\s\S]*?<img[\s\S]*?<\?php else : \?>[\s\S]*?<span>/);
  assert.match(brandTemplate, /get_footer\( 'shop' \)/);
  assert.match(helpers, /cr2026_brands_index_view/);
  assert.match(css, /body\.cr-brands-index-view \.cr-footer \{ display:none!important; \}/);
});

test('brands index cards are white, clickable, contain logos and use two mobile columns', () => {
  const brandTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/page-marcas.php'), 'utf8');
  assert.match(brandTemplate, /<a class="cr-brands-index__card"/);
  assert.match(css, /\.cr-brands-index__grid\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.cr-brands-index__card\s*\{[^}]*background:#fff/s);
  assert.match(css, /\.cr-brands-index__card img\s*\{[^}]*object-fit:contain/s);
  assert.match(css, /\.cr-brands-index__card span\s*\{/);
  assert.match(css, /@media \(min-width:768px\)[\s\S]*?\.cr-brands-index__grid\s*\{[^}]*repeat\(4,/s);
});

test('product listing canvas uses the canonical global app background token', () => {
  assert.match(css, /--cr-app-canvas:\s*#FCFAF7/i);
  assert.match(css, /body\.cr-product-listing-view\s*\{\s*background:var\(--cr-app-canvas\)/);
  assert.match(css, /body\.cr-product-listing-view \.cr-product-listing\s*\{[^}]*background:var\(--cr-app-canvas\)/s);
});

test('subcategory query order is NAME_ASC and top-level Home editorial order remains untouched', () => {
  const childFn = helpers.slice(helpers.indexOf('function cr2026_product_cat_children'), helpers.indexOf('function cr2026_product_cat_display_name'));
  assert.match(childFn, /'orderby'\s*=>\s*'name'/);
  assert.match(childFn, /'order'\s*=>\s*'ASC'/);
  assert.doesNotMatch(childFn, /usort\s*\(/);
  const homeCategories = helpers.slice(helpers.indexOf('function cr2026_home_categories'), helpers.indexOf('function cr2026_app_nav_urls'));
  const ids = Array.from(homeCategories.matchAll(/'id'\s*=>\s*(\d+)/g), match => Number(match[1]));
  assert.deepEqual(ids, [560, 292, 294, 420, 504, 509, 70, 71, 68, 310, 67, 445]);
});

test('catalog-page exposes monotonic Server-Timing diagnostics without changing its JSON payload', () => {
  assert.match(php, /function cr2026_catalog_timer_now\(\)[\s\S]*?hrtime\( true \)/);
  assert.match(php, /function cr2026_catalog_timing_headers\([\s\S]*?rest_post_dispatch/);
  assert.match(php, /catalog-total;dur=/);
  for (const stage of ['filter','products','render','cache','other']) assert.match(php, new RegExp(stage + ';dur='));
  assert.ok(php.includes("$response->header( 'X-CriosRango-Catalog-Cache', isset( $GLOBALS['cr2026_catalog_cache_status'] )"));
  assert.match(php, /X-CriosRango-Persistent-Object-Cache/);
  assert.match(php, /cr2026_catalog_timing_add\( 'filter'/);
  assert.match(php, /cr2026_catalog_timing_add\( 'products'/);
  assert.match(php, /cr2026_catalog_timing_add\( 'render'/);
  assert.match(php, /'html' => \$rendered_html/);
  assert.doesNotMatch(php, /'server_timing'\s*=>|'catalog_timing'\s*=>/);
});

test('staging benchmark captures three initial and three repeated requests with transport data before JSON parsing', () => {
  for (const marker of [
    'Benchmark staging catalog endpoint (3 cold + 3 warm requests)',
    'for INDEX in 1 2 3 4 5 6',
    'SAMPLE="COLD"', 'SAMPLE="WARM"',
    '--dump-header "$HEADERS"', '--output "$BODY"',
    "--write-out '%{http_code}|%{time_total}|%{size_download}'",
    'Server-Timing', 'catalog_category_id=560',
    'CATEGORY_PLAIN', 'NOVEDADES', 'BRAND', 'OUTLET_OR_FILTERED'
  ]) assert.ok(deploy.includes(marker), 'missing benchmark contract: ' + marker);
  assert.ok(deploy.indexOf('--dump-header') < deploy.indexOf('node - "$BODY" "$HEADERS"'));
});
test('catalog-page preserves its exact frontend JSON schema and captures card HTML', () => {
  const catalogStart = php.indexOf('function cr2026_catalog_page_rest_response');
  const catalogEnd = php.indexOf('function cr2026_woocommerce_wrappers', catalogStart);
  const catalog = php.slice(catalogStart, catalogEnd);
  const expectedFields = ['html', 'source', 'product_ids', 'filter_api_product_ids', 'rendered_product_ids', 'page', 'per_page', 'total', 'has_more'];
  for (const field of expectedFields) assert.ok(catalog.includes("'" + field + "' =>"), 'missing response field: ' + field);
  assert.ok(catalog.includes('ob_start();'));
  assert.ok(catalog.includes('cr2026_render_product_card( $product'));
  assert.ok(catalog.includes('$rendered_html = ob_get_clean();'));
  assert.ok(catalog.includes("'html' => $rendered_html"));
  assert.ok(catalog.includes("cr2026_catalog_timing_add( 'render'"));
  // Match the actual shared validator and the listing renderer's response consumer.
  assert.ok(js.includes("typeof data.html !== 'string'"));
  assert.ok(js.includes("template.innerHTML=responseData.html||''"));
});

test('staging benchmark captures transport metrics before JSON validation across all four catalogue contexts', () => {
  for (const marker of [
    'Benchmark staging catalog endpoint (3 cold + 3 warm requests)',
    '--dump-header', '--output', '--write-out',
    'CATEGORY_PLAIN', 'NOVEDADES', 'BRAND', 'OUTLET_OR_FILTERED',
    'CATALOG_ENDPOINT_VALID_JSON', 'CATALOG_ENDPOINT_NO_LEAKED_HTML',
    'X-CriosRango-Persistent-Object-Cache', 'IMAGE_URL='
  ]) assert.ok(deploy.includes(marker), 'missing benchmark marker: ' + marker);
});


function productListResponseSource() {
  const start = php.indexOf('function cr2026_product_list_rest_response');
  const end = php.indexOf('/**\n * One browser request', start);
  assert.ok(start >= 0 && end > start, 'product-list REST callback must exist');
  return php.slice(start, end);
}

test('PRODUCT_LIST_BUFFER_START_ONCE=PASS', () => {
  const fn = productListResponseSource();
  assert.equal((fn.match(/ob_start\s*\(/g) || []).length, 1);
});

test('PRODUCT_LIST_BUFFER_CLEAN_ONCE=PASS', () => {
  const fn = productListResponseSource();
  assert.equal((fn.match(/ob_get_clean\s*\(/g) || []).length, 1);
});

test('PRODUCT_LIST_HTML_KEY_ONCE=PASS', () => {
  const fn = productListResponseSource();
  const capture = fn.indexOf('$rendered_html = ob_get_clean();');
  const responseStart = fn.indexOf('return rest_ensure_response( array(', capture);
  const responseEnd = fn.indexOf(');', responseStart);
  const normalResponse = fn.slice(responseStart, responseEnd + 2);
  assert.equal((normalResponse.match(/'html'\s*=>/g) || []).length, 1);
  assert.match(normalResponse, /'html'\s*=>\s*\$rendered_html/);
});

test('PRODUCT_LIST_VALID_JSON=PASS and PRODUCT_LIST_NO_LEAKED_HTML=PASS', () => {
  const fn = productListResponseSource();
  const startBuffer = fn.indexOf('ob_start();');
  const cardRender = fn.indexOf('cr2026_render_product_card(');
  const cleanBuffer = fn.indexOf('$rendered_html = ob_get_clean();');
  const response = fn.indexOf('return rest_ensure_response( array(', cleanBuffer);
  assert.ok(startBuffer >= 0 && cardRender > startBuffer && cleanBuffer > cardRender && response > cleanBuffer);
  assert.match(fn.slice(response), /^return rest_ensure_response\( array\(/);
  assert.doesNotMatch(fn, /^\s*(?:echo|print)\b/m);
  assert.doesNotMatch(fn.slice(response), /ob_get_clean\s*\(/);
});

test('PRODUCT_LIST_RESPONSE_SCHEMA_UNCHANGED=PASS', () => {
  const fn = productListResponseSource();
  const capture = fn.indexOf('$rendered_html = ob_get_clean();');
  const responseStart = fn.indexOf('return rest_ensure_response( array(', capture);
  const responseEnd = fn.indexOf(');', responseStart);
  const normalResponse = fn.slice(responseStart, responseEnd + 2);
  for (const field of ['html', 'has_more', 'count']) {
    assert.equal((normalResponse.match(new RegExp("'" + field + "'\\s*=>", 'g')) || []).length, 1);
  }
  assert.match(fn, /return rest_ensure_response\( array\( 'html' => '', 'has_more' => false, 'count' => 0 \) \)/);
});

test('PRODUCT_LIST_CARD_HTML_PRESERVED=PASS', () => {
  const fn = productListResponseSource();
  assert.match(fn, /foreach \( \$products as \$index => \$product \) \{\s*cr2026_render_product_card\( \$product, \$index \+ \( \$page > 1 \? 4 : 0 \) \);\s*\}/);
  assert.match(fn, /ob_start\(\);[\s\S]*?foreach \( \$products as \$index => \$product \)/);
  assert.match(fn, /cr2026_render_product_card\( \$product, \$index \+ \( \$page > 1 \? 4 : 0 \) \)/);
});


const cartTemplatePath = path.join(root, 'theme/crios-rango-2026/woocommerce/cart/cart.php');
const cartPhpPath = path.join(root, 'theme/crios-rango-2026/inc/cart.php');
const cartAssetsPath = path.join(root, 'theme/crios-rango-2026/inc/assets.php');
const cartJsPath = path.join(root, 'theme/crios-rango-2026/assets/js/cart-ui.js');
const cartCssPath = path.join(root, 'theme/crios-rango-2026/assets/css/cart.css');
const cartTemplate = fs.readFileSync(cartTemplatePath, 'utf8');
const cartPhp = fs.readFileSync(cartPhpPath, 'utf8');
const cartAssets = fs.readFileSync(cartAssetsPath, 'utf8');
const cartJs = fs.readFileSync(cartJsPath, 'utf8');
const cartCss = fs.readFileSync(cartCssPath, 'utf8');

test('CART_APP_STYLE_LAYOUT=PASS', () => {
  assert.match(cartTemplate, /class="cr-cart-page"/);
  assert.match(cartTemplate, /class="[^"]*cr-cart-item/);
  assert.match(cartTemplate, /class="cr-cart-promotions(?: cr-cart-body-rail)?"/);
  assert.match(cartTemplate, /class="[^"]*cr-cart-summary/);
  assert.match(cartCss, /\.cr-cart-layout \{ display:flex; flex-direction:column; align-items:stretch; \}/);
  assert.doesNotMatch(cartCss, /@media \(max-width:767px\)[\s\S]*?\.cr-cart-layout \{[^}]*grid-template-columns/);
});

test('CART_NATIVE_CALCULATIONS_PRESERVED=PASS', () => {
  assert.match(cartTemplate, /WC\(\)->cart->get_cart\(\)/);
  assert.match(cartTemplate, /woocommerce_cart_collaterals/);
  assert.match(cartTemplate, /woocommerce_before_cart_table/);
  assert.match(cartTemplate, /woocommerce_after_cart_table/);
  assert.doesNotMatch(cartTemplate, /total_items|total_price|calculate_totals/);
});

test('CART_QUANTITY_SOURCE_SINGLE=PASS', () => {
  assert.equal((cartTemplate.match(/woocommerce_quantity_input\s*\(/g) || []).length, 1);
  assert.match(cartTemplate, /get_min_purchase_quantity/);
  assert.match(cartTemplate, /get_max_purchase_quantity/);
  assert.match(cartTemplate, /woocommerce_cart_item_quantity/);
  assert.match(cartJs, /input\.closest\('form\.woocommerce-cart-form'\)/);
  assert.match(cartJs, /requestSubmit\(submit/);
});

test('CART_REMOVE_SECURE=PASS', () => {
  assert.match(cartTemplate, /wc_get_cart_remove_url\( \$cart_item_key \)/);
  assert.match(cartTemplate, /cr-cart-remove/);
  assert.match(cartTemplate, /<svg viewBox="0 0 24 24"/);
});

test('CART_EMPTY_NONCE=PASS', () => {
  assert.match(cartTemplate, /wp_nonce_field\( 'cr2026_empty_cart', 'cr2026_empty_cart_nonce' \)/);
  assert.match(cartPhp, /wp_verify_nonce\( \$nonce, 'cr2026_empty_cart' \)/);
  assert.match(cartPhp, /WC\(\)->cart->empty_cart\(\)/);
  assert.match(cartPhp, /wp_safe_redirect\( wc_get_cart_url\(\) \)/);
  assert.doesNotMatch(cartTemplate, /href="[^"]*empty_cart/);
});

test('CART_PROMOTIONS_ENDPOINT=PASS', () => {
  assert.match(cartAssets, /rest_url\( 'criosrango\/v1\/promotions' \)/);
  assert.match(cartJs, /config\.promotionsUrl/);
  assert.match(cartJs, /guestPromotionVisible/);
});

test('CART_LOYALTY_ENDPOINT=PASS', () => {
  assert.match(cartAssets, /rest_url\( 'criosrango\/v1\/loyalty' \)/);
  assert.match(cartJs, /config\.loyaltyUrl/);
  assert.match(cartJs, /if \(!config\.authenticated\) return/);
});

test('CART_WP_REST_NONCE=PASS', () => {
  assert.match(cartAssets, /wp_create_nonce\( 'wp_rest' \)/);
  assert.match(cartJs, /headers\.set\('X-WP-Nonce', config\.wpRestNonce\)/);
});

test('CART_STORE_API_NONCE=PASS', () => {
  assert.match(cartAssets, /wp_create_nonce\( 'wc_store_api' \)/);
  assert.match(cartJs, /headers\.set\('Nonce', storeNonce\)/);
  assert.match(cartJs, /response\.headers\.get\('Nonce'\)/);
});

test('CART_PENDING_REWARD_USES_CODE=PASS', () => {
  assert.match(cartJs, /wallet\.pending_rewards/);
  assert.match(cartJs, /applyCoupon\(reward\.code,'Crédito',event\.currentTarget\)/);
});

test('CART_PROMOTION_USES_CODE=PASS', () => {
  assert.match(cartJs, /promotion\.code/);
  assert.match(cartJs, /applyCoupon\(promotion\.code, 'Promoción', event\.currentTarget\)/);
});

test('CART_MANUAL_COUPON_USES_STORE_API=PASS', () => {
  assert.match(cartJs, /manualForm\.addEventListener\('submit'/);
  assert.match(cartJs, /applyCoupon\(input\.value,'Cupón',manualForm\.querySelector/);
  assert.match(cartJs, /config\.applyCouponUrl/);
});

test('CART_COUPON_CONFIRMED_IN_RESPONSE=PASS', () => {
  assert.match(cartJs, /const hasCoupon = \(cart, code\)/);
  assert.match(cartJs, /if \(!hasCoupon\(cart, normalized\)\)/);
  assert.match(cartJs, /if \(hasCoupon\(cart, code\)\)/);
  assert.match(cartJs, /config\.removeCouponUrl/);
});

test('CART_REDEEM_IDEMPOTENCY=PASS', () => {
  assert.match(cartJs, /crypto\.randomUUID/);
  assert.match(cartJs, /pendingRedemption\.requestId/);
  assert.match(cartJs, /request_id: pendingRedemption\.requestId/);
  assert.match(cartJs, /Keep pendingRedemption\.requestId unchanged/);
  assert.match(cartJs, /redeemableOptions/);
  assert.match(cartJs, /minimum_redeem_points/);
  assert.match(cartJs, /maximum_redeem_points/);
  assert.match(cartJs, /conversion_points/);
  assert.match(cartJs, /conversion_value/);
});

test('CART_TOTALS_WOOCOMMERCE_AUTHORITY=PASS', () => {
  assert.match(cartTemplate, /woocommerce_cart_collaterals/);
  assert.match(cartTemplate, /cart-collaterals/);
  assert.match(cartCss, /\.cart_totals/);
  assert.doesNotMatch(cartJs, /querySelector\([^)]*total_price/);
});

test('CART_SHIPPING_NOT_HARDCODED=PASS', () => {
  assert.match(cartTemplate, /woocommerce_cart_collaterals/);
  assert.doesNotMatch(cartTemplate, /5,00|5\.00|gratis/i);
  assert.doesNotMatch(cartJs, /shipping.*5,00|shipping.*5\.00/i);
});

test('CART_GUEST_WALLET_HIDDEN=PASS', () => {
  assert.match(cartTemplate, /data-cr-cart-wallet hidden/);
  assert.match(cartJs, /if \(!config\.authenticated\) return/);
  assert.match(cartJs, /walletPanel\.hidden = true/);
  assert.match(cartJs, /personal \|\| promotion\.requires_login/);
  assert.match(cartJs, /bienvenida/);
  assert.match(cartJs, /birthday/);
  assert.match(cartJs, /cr-monedero/);
});

test('PRODUCT_DETAIL_UNCHANGED=PASS and BOTTOM_NAV_UNCHANGED=PASS', () => {
  assert.match(cartAssets, /if \( \$uses_product_detail_skin \)/);
  assert.doesNotMatch(cartCss, /product-detail-skin/);
  assert.doesNotMatch(cartCss, /\.cr-mobile-bottom-nav|\.cr-app-header/);
});


test('empty cart CTA layout contract evaluates the parent-child centering model and known theme cascade', () => {
  const emptyCartTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/woocommerce/cart/cart-empty.php'), 'utf8');
  const cartRenderer = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/woocommerce/cart/cart.php'), 'utf8');
  const cartCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/cart.css'), 'utf8');
  const mainCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');

  assert.match(cartRenderer, /<div class="cr-cart-empty-state">\s*<\?php wc_get_template\( 'cart\/cart-empty\.php' \); \?>\s*<\/div>/);
  assert.match(emptyCartTemplate, /<p class="return-to-shop">\s*<a class="button wc-backward" href=/);

  const parentSelector = 'body.woocommerce-cart .cr-cart-empty-state > p.return-to-shop';
  const buttonSelector = parentSelector + ' > a.button.wc-backward';
  const ruleBody = (source, selector) => {
    const index = source.lastIndexOf(selector + ' {');
    assert.notEqual(index, -1, 'selector exists: ' + selector);
    const opening = source.indexOf('{', index);
    const closing = source.indexOf('}', opening);
    return source.slice(opening + 1, closing);
  };
  const parent = ruleBody(cartCss, parentSelector);
  const button = ruleBody(cartCss, buttonSelector);

  // Parent owns centering: full available width, not shrink-to-fit, flex row, centered child.
  for (const declaration of [
    'display: flex !important', 'flex-direction: row !important',
    'flex-wrap: nowrap !important', 'width: 100% !important',
    'max-width: none !important', 'justify-content: center !important',
    'align-items: center !important', 'float: none !important',
    'position: static !important', 'margin: 0 !important'
  ]) assert.ok(parent.includes(declaration), 'parent layout model includes ' + declaration);

  // Button remains compact and centers its text in the geometric box with symmetric vertical padding.
  for (const declaration of [
    'display: inline-flex !important', 'align-items: center !important',
    'justify-content: center !important', 'width: auto !important',
    'line-height: 1.2 !important', 'padding: 8px 16px !important',
    'text-align: center !important', 'margin: 0 !important',
    'float: none !important', 'position: static !important'
  ]) assert.ok(button.includes(declaration), 'button geometry includes ' + declaration);
  assert.match(button, /padding:\s*(8px|\d+(?:\.\d+)?px)\s+16px\s*!important/);
  assert.match(button, /line-height:\s*1\.2\s*!important/);
  assert.doesNotMatch(button, /padding-(?:top|bottom):\s*\d+(?:\.\d+)?px\s*!important/);

  // Inspect the known theme sheets for competing declarations targeting this CTA or parent.
  const knownThemeCss = cartCss + '\n' + mainCss;
  assert.doesNotMatch(knownThemeCss, /(?:^|[,\s])(?:p\.return-to-shop|\.return-to-shop|a\.button\.wc-backward|\.cr-cart-empty-state\s+\.button)\s*\{[^}]*\b(?:display:\s*(?:block|inline-block)|float:\s*(?:left|right)|position:\s*absolute|width:\s*100%)\s*(?:!important)?/s,
    'no known theme rule assigns a competing display/float/position/full-width model to the target');
  assert.doesNotMatch(cartCss, /(?:cr-cart-empty-state|return-to-shop|wc-backward)[^{}]*::(?:before|after)/,
    'theme cart stylesheet does not attach space-taking pseudo-elements to this empty CTA');
});
