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

const js = fs.readFileSync(jsPath, 'utf8');
const php = fs.readFileSync(phpPath, 'utf8');
const helpers = fs.readFileSync(helpersPath, 'utf8');
const archive = fs.readFileSync(archivePath, 'utf8');

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
  assert.match(js, /loadPage\(1,false\)/);
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
