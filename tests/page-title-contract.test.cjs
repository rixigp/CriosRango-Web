const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const read = relative => fs.readFileSync(path.join(theme, relative), 'utf8');
const helpers = read('inc/helpers.php');
const account = read('inc/account-presentation.php');
const dashboard = read('woocommerce/myaccount/dashboard.php');
const orders = read('woocommerce/myaccount/orders.php');
const cart = read('woocommerce/cart/cart.php');
const emptyCart = read('woocommerce/cart/cart-empty.php');
const page = read('page.php');
const search = read('search.php');
const brandsIndex = read('page-marcas.php');
const brandArchive = read('taxonomy-product_brand.php');
const archiveProduct = read('archive-product.php');
const mainCss = read('assets/css/main.css');
const accountCss = read('assets/css/account.css');
const productSkin = read('inc/product-skin.php');
const login = read('inc/login.php');
const notFound = read('404.php');
const woocommerce = read('inc/woocommerce.php');

const inventory = [
  ['Categorías','archive-product.php','cr2026_render_category_toolbar()',true],
  ['Subcategorías','archive-product.php','cr2026_render_category_toolbar()',true],
  ['Outlet','archive-product.php','cr2026_render_category_toolbar()',true],
  ['Marcas','page-marcas.php','.cr-brands-index__toolbar h1',false],
  ['Archivo de marca','taxonomy-product_brand.php','.cr-brand-archive__heading h1 / logo',false],
  ['Búsqueda general','search.php','.cr-page__header h1',false],
  ['Búsqueda de productos','search.php','sin PAGE TITLE',false],
  ['Carrito con productos','woocommerce/cart/cart.php','cr2026_render_category_toolbar()',true],
  ['Carrito vacío','woocommerce/cart/cart.php + cart-empty.php','toolbar canónica + h2 de estado',true],
  ['Checkout','inc/helpers.php','cr2026_render_category_toolbar()',true],
  ['Cuenta','woocommerce/myaccount/dashboard.php','cr2026_render_category_toolbar()',true],
  ['Pedidos','woocommerce/myaccount/orders.php','.cr-account-orders__toolbar h1',false],
  ['Detalle de pedido','WooCommerce account endpoint (sin override)','sin toolbar theme-owned',false],
  ['Cupones y promociones','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Perfil','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Datos personales','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Dirección de entrega','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Cambiar contraseña','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Ayuda','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Eliminar cuenta','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Cambios y devoluciones','page.php','.cr-page__header h1',false],
  ['Condiciones de contratación','page.php','.cr-page__header h1',false],
  ['Política de privacidad','page.php','.cr-page__header h1',false],
  ['Aviso legal','page.php','.cr-page__header h1',false],
  ['Política de cookies','page.php','.cr-page__header h1',false],
  ['Login','inc/login.php','.cr-login-welcome h1',false],
  ['404','404.php','h1 propio',false],
  ['Pago seguro (redirección Cecabank)','inc/woocommerce.php','.cr-cecabank-redirect__title',false],
];

test('audit inventory is exhaustive for known mobile page-title screens', () => {
  assert.equal(inventory.length, 28);
  assert.equal(inventory.filter(item => item[3]).length, 14);
  assert.equal(inventory.filter(item => !item[3]).length, 14);
  assert.equal(new Set(inventory.map(item => item[0])).size, inventory.length);
});

test('the existing canonical renderer and class contract are present', () => {
  assert.match(helpers, /function\s+cr2026_render_category_toolbar\s*\(/);
  for (const className of ['cr-parent-category__toolbar','cr-parent-category__back','cr-parent-category__title']) {
    assert.ok(helpers.includes(className), 'missing canonical class ' + className);
  }
  assert.match(mainCss, /\.cr-parent-category__title\s*\{[^}]*font:\s*300\s+21px\/28px\s+"Roboto",\s*Arial,\s*sans-serif/s);
  assert.match(mainCss, /\.cr-parent-category__back\s*\{[^}]*width:\s*48px/s);
});

test('catalog, cart, checkout and account canonical routes are identified', () => {
  assert.equal((archiveProduct.match(/cr2026_render_category_toolbar\s*\(/g) || []).length, 2);
  assert.match(cart, /cr2026_render_category_toolbar\s*\(\s*__\( 'Tu carrito'/);
  assert.match(emptyCart, /Tu carrito está vacío/);
  assert.match(helpers, /function\s+cr2026_checkout_render_toolbar/);
  assert.match(dashboard, /cr2026_render_category_toolbar\s*\(\s*__\( 'Cuenta'/);
  assert.match(account, /cr2026_account_render_endpoint_toolbar/);
});

test('audit confirms known noncanonical templates before refactoring', () => {
  assert.match(orders, /cr-account-orders__toolbar/);
  assert.match(orders, /cr-account-orders-title/);
  assert.match(accountCss, /\.cr-account-orders__toolbar h1/);
  assert.match(page, /\.cr-page__header/);
  assert.match(search, /\.cr-page__header/);
  assert.match(brandsIndex, /\.cr-brands-index__toolbar/);
  assert.match(brandArchive, /\.cr-brand-archive__heading/);
});

test('special headings and explicit Product Detail exclusion are inventoried', () => {
  assert.match(login, /cr-login-welcome.*<h1>/s);
  assert.match(notFound, /<h1>/);
  assert.match(woocommerce, /cr-cecabank-redirect__title/);
  assert.match(productSkin, /cr-parent-category__title/);
  assert.match(productSkin, /product_title entry-title/);
});

test('account detail endpoint has no theme-owned view-order template', () => {
  assert.equal(fs.existsSync(path.join(theme, 'woocommerce/myaccount/view-order.php')), false);
});
