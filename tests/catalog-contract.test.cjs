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
  assert.match(js, /if \(!append\) \{ showEmpty\(\); hasMore = false; \}/);
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


test('product_brand archives render the native main query with shared product cards, never category landings', () => {
  const brandArchive = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const helpers = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/helpers.php'), 'utf8');
  assert.match(brandArchive, /get_queried_object\(\)/);
  assert.match(brandArchive, /'product_brand' !== \$brand_term->taxonomy/);
  assert.match(brandArchive, /\$GLOBALS\['cr2026_product_listing_view'\] = true/);
  assert.match(brandArchive, /while \( have_posts\(\) \)/);
  assert.match(brandArchive, /the_post\(\)/);
  assert.match(brandArchive, /cr2026_render_product_card\( \$brand_product, \$brand_card_index \)/);
  assert.match(brandArchive, /the_posts_pagination\(/);
  assert.match(brandArchive, /data-brand-term-id=/);
  assert.match(brandArchive, /data-brand-term-slug=/);
  assert.doesNotMatch(brandArchive, /new WP_Query|cr2026_render_category_toolbar|cr2026_render_category_filter_sheet|cr2026_home_categories|Categorías/);
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
  assert.match(brandArchive, /cr2026_render_product_card\( \$brand_product, \$brand_card_index \)/);
  assert.match(brandArchive, /while \( have_posts\(\) \)/);
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
  assert.match(brandArchive, /cr2026_render_product_card\( \$brand_product/);
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
  assert.ok(row.includes('cr-brand-archive__back-spacer'));
  assert.match(css, /\.cr-brand-archive__back-row \{[^}]*display:grid; grid-template-columns:48px minmax\(0,1fr\) 48px; align-items:center;/);
  assert.match(css, /\.cr-brand-archive__heading \{[^}]*grid-column:2; grid-row:1;[^}]*margin:0; padding:0;/);
  assert.match(css, /\.cr-brand-archive__heading img \{[^}]*object-fit:contain/);
});

test('brand and product Search Load more use the WordPress next-page URL and append server-rendered shared cards', () => {
  const brand = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const search = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/search.php'), 'utf8');
  assert.match(brand, /get_next_posts_page_link\(\)/);
  assert.match(brand, /data-cr-html-load-more data-next-url=/);
  assert.match(search, /get_next_posts_page_link\(\)/);
  assert.match(search, /data-cr-html-load-more data-next-url=/);
  assert.match(js, /fetch\(nextUrl,\{credentials:'same-origin',headers:\{Accept:'text\/html'\}\}\)/);
  assert.match(js, /grid\.appendChild\(fragment\)/);
  assert.match(js, /new URL\(nextLink\.href,nextDocument\.baseURI\)/);
  assert.match(js, /if\(loading\|\|!nextUrl\)return/);
  assert.match(js, /button\.textContent='Cargando…'/);
});


test('brand archive native sorting preserves its taxonomy URL and existing GET parameters', () => {
  const brandTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  assert.match(brandTemplate, /class="cr-product-listing__ordering"[^>]*data-cr-brand-order-form/);
  assert.match(brandTemplate, /get_term_link\( \$brand_term \)/);
  assert.match(brandTemplate, /foreach \( \$_GET as \$brand_query_key => \$brand_query_value \)/);
  assert.match(brandTemplate, /name="orderby" data-cr-brand-order/);
  assert.match(brandTemplate, /value="date"/);
  assert.match(brandTemplate, /value="price"/);
  assert.match(brandTemplate, /value="price-desc"/);
  assert.match(brandTemplate, /value="title"/);
  assert.match(js, /brandOrderControl\.addEventListener\('change'/);
  assert.match(js, /form\.requestSubmit\(\)/);
  assert.doesNotMatch(brandTemplate, /new WP_Query/);
});

test('brand and catalog share one canonical sort mapping on the existing main query', () => {
  assert.match(php, /function cr2026_catalog_sort_query_vars\( \$sort \)/);
  assert.match(php, /'oldest' === \$sort/);
  assert.match(php, /array\( 'price', 'price_asc' \)/);
  assert.match(php, /array\( 'price-desc', 'price_desc' \)/);
  assert.match(php, /array\( 'title', 'title_asc' \)/);
  assert.match(php, /'title_desc' === \$sort/);
  assert.match(php, /function cr2026_product_listing_main_query\( \$query \)/);
  assert.match(php, /\$is_brand_query = \$query->is_tax\( 'product_brand' \)/);
  assert.match(php, /cr2026_catalog_sort_query_vars\( \$query->get\( 'orderby' \) \)/);
  assert.match(php, /cr2026_catalog_sort_query_vars\( \$sort \)/);
  assert.match(php, /add_action\( 'pre_get_posts', 'cr2026_product_listing_main_query', 99 \)/);
  assert.match(php, /add_filter\( 'posts_clauses', 'cr2026_catalog_price_sort_post_clauses', 20, 2 \)/);
  assert.doesNotMatch(php, /cr2026_brand_archive_native_sort/);
  assert.doesNotMatch(php, /\$query->set\( 'tax_query'/);
  assert.doesNotMatch(php, /new WP_Query/);
});


test('brand archive order select sizes to the selected option and keeps its native submit behavior', () => {
  const brandTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/taxonomy-product_brand.php'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
  assert.match(brandTemplate, /class="cr-product-listing__ordering"[^>]*data-cr-brand-order-form/);
  assert.match(brandTemplate, /<label for="cr-brand-product-order">/);
  assert.match(brandTemplate, /<select id="cr-brand-product-order" name="orderby" data-cr-brand-order/);
  for (const value of ['date', 'price', 'price-desc', 'title']) assert.ok(brandTemplate.includes('value="' + value + '"'));
  assert.match(css, /\.cr-product-listing__select-wrap::after \{[^}]*right:3px;[^}]*width:7px;/);
  assert.ok(css.includes('.cr-brand-archive [data-cr-brand-order-form] select { padding-right:14px; }'));
  assert.match(js, /const fitBrandOrderControl = \(\) =>/);
  assert.match(js, /context\.measureText\(selectedText\)\.width/);
  assert.match(js, /brandOrderControl\.style\.width = Math\.ceil\(textWidth \+ paddingLeft \+ paddingRight\) \+ 'px'/);
  assert.match(js, /fitBrandOrderControl\(\);[\s\S]*?brandOrderControl\.addEventListener\('change'/);
  assert.match(js, /form\.requestSubmit\(\)/);
});


test('temporary brand sort diagnostics and brand-only sorting are fully removed', () => {
  assert.doesNotMatch(php, /crsortdebug|CR2026_BRAND_SORT_DEBUG|cr2026_capture_brand_sort_debug|cr2026_render_brand_sort_debug/);
  assert.doesNotMatch(php, /cr2026_brand_archive_native_sort/);
});
