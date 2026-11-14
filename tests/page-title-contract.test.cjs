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
const productSkin = read('inc/product-skin.php');
const login = read('inc/login.php');
const notFound = read('404.php');
const woocommerce = read('inc/woocommerce.php');

const inventory = [
  ['Categorías','archive-product.php','cr2026_render_category_toolbar()',true],
  ['Subcategorías','archive-product.php','cr2026_render_category_toolbar()',true],
  ['Outlet','archive-product.php','cr2026_render_category_toolbar()',true],
  ['Marcas','page-marcas.php','cr2026_render_category_toolbar() with the brands index back link',true],
  ['Archivo de marca','taxonomy-product_brand.php','cr2026_render_category_toolbar() with the brands index back link',true],
  ['Búsqueda general','search.php','cr2026_render_category_toolbar() with the shop back link',true],
  ['Búsqueda de productos','search.php','cr2026_render_category_toolbar() with the shop back link',true],
  ['Carrito con productos','woocommerce/cart/cart.php','cr2026_render_category_toolbar()',true],
  ['Carrito vacío','woocommerce/cart/cart.php + cart-empty.php','toolbar canónica + h2 de estado',true],
  ['Checkout','inc/helpers.php','cr2026_render_category_toolbar()',true],
  ['Cuenta','woocommerce/myaccount/dashboard.php','cr2026_render_category_toolbar()',true],
  ['Pedidos','woocommerce/myaccount/orders.php','cr2026_render_category_toolbar() with the account back link',true],
  ['Detalle de pedido','inc/account-presentation.php','view-order endpoint toolbar',true],
  ['Cupones y promociones','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Perfil','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Datos personales','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Dirección de entrega','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Cambiar contraseña','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Ayuda','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Eliminar cuenta','inc/account-presentation.php','cr2026_render_category_toolbar()',true],
  ['Cambios y devoluciones','page.php','cr2026_render_category_toolbar() without a back link',true],
  ['Condiciones de contratación','page.php','cr2026_render_category_toolbar() without a back link',true],
  ['Política de privacidad','page.php','cr2026_render_category_toolbar() without a back link',true],
  ['Aviso legal','page.php','cr2026_render_category_toolbar() without a back link',true],
  ['Política de cookies','page.php','cr2026_render_category_toolbar() without a back link',true],
  ['Login','inc/login.php','WordPress wp-login screen; outside storefront mobile page shell',false],
  ['404','404.php','cr2026_render_category_toolbar() without a back link',true],
  ['Pago seguro (redirección Cecabank)','inc/woocommerce.php','transaction-status heading inside gateway card; not global page title',false],
];

test('complete inventory covers every known mobile page-title screen and documented system exclusions', () => {
  assert.equal(inventory.length, 28);
  assert.equal(inventory.filter(item => item[3]).length, 26);
  assert.equal(inventory.filter(item => !item[3]).length, 2);
  assert.equal(new Set(inventory.map(item => item[0])).size, inventory.length);
});

test('the existing canonical renderer and class contract remain the single source of truth', () => {
  assert.match(helpers, /function\s+cr2026_render_category_toolbar\s*\(/);
  assert.ok(helpers.includes("if ( '' !== $back_url )"), 'back link is conditional on an actual destination');
  assert.ok(helpers.includes("echo '<h1 class=\"cr-parent-category__title\"'"), 'renderer owns the canonical title element');
  for (const className of ['cr-parent-category__toolbar','cr-parent-category__back','cr-parent-category__title']) {
    assert.ok(helpers.includes(className), 'missing canonical class ' + className);
  }
  assert.match(helpers, /function cr2026_render_category_toolbar\( \$title, \$back_url = ''/);
  assert.match(helpers, /cr-parent-category__toolbar--no-back/);
  assert.match(mainCss, /\.cr-parent-category__title\s*\{[^}]*font:\s*300\s+21px\/28px\s+"Roboto",\s*Arial,\s*sans-serif/s);
  assert.match(mainCss, /\.cr-parent-category__back\s*\{[^}]*width:\s*48px/s);
  assert.match(mainCss, /\.cr-parent-category__toolbar\s*\{/);
  assert.match(mainCss, /\.cr-parent-category__toolbar--no-back\s*\{/);
});

test('catalog, cart, checkout and account canonical routes remain intact', () => {
  assert.equal((archiveProduct.match(/cr2026_render_category_toolbar\s*\(/g) || []).length, 2);
  assert.match(cart, /cr2026_render_category_toolbar\s*\(\s*__\( 'Tu carrito'/);
  assert.ok(cart.includes("wc_get_page_permalink( 'shop' )"), 'Cart back link returns to the shop');
  assert.match(emptyCart, /Tu carrito está vacío/);
  assert.match(helpers, /function\s+cr2026_checkout_render_toolbar/);
  assert.ok(helpers.includes("cr2026_render_category_toolbar( __( 'Finalizar compra'"));
  assert.ok(helpers.includes('wc_get_cart_url()'), 'Checkout back link returns to Cart');
  assert.match(dashboard, /cr2026_render_category_toolbar\s*\(\s*__\( 'Cuenta'/);
  assert.match(account, /cr2026_account_render_endpoint_toolbar/);
});

test('shipping address uses exactly one canonical delivery title', () => {
  assert.match(account, /function cr2026_account_address_endpoint_toolbar[\s\S]*?\$title = 'billing' === \$address_type[\s\S]*?__\( 'Dirección de entrega'/);
  assert.match(account, /cr2026_account_render_endpoint_toolbar\( \$title, wc_get_account_endpoint_url\( 'edit-account' \) \)/);
  assert.match(account, /function cr2026_account_edit_address_title[\s\S]*?return '';/);
});

test('Orders and order detail use the canonical title renderer', () => {
  assert.match(orders, /cr2026_render_category_toolbar\(\s*__\( 'Pedidos'/);
  assert.ok(orders.includes('$account_url'), 'Orders toolbar receives the account back destination');
  assert.doesNotMatch(orders, /cr-account-orders__toolbar/);
  assert.match(account, /woocommerce_account_view-order_endpoint/);
  assert.match(account, /cr2026_account_view_order_endpoint_toolbar/);
  assert.match(account, /cr2026_account_render_endpoint_toolbar\( \$title, wc_get_account_endpoint_url\( 'orders' \) \)/);
});

test('legal pages, both search modes, brands and 404 use the canonical mobile title', () => {
  assert.match(page, /cr2026_render_category_toolbar\(\s*get_the_title\(\),\s*''/);
  assert.match(page, /cr2026_render_category_toolbar\(\s*get_the_title\(\),\s*\$account_back_url/);
  assert.match(page, /cr2026_account_is_help_page/);
  assert.match(search, /cr2026_render_category_toolbar\(\s*sprintf\([\s\S]*?cr2026_shop_url\(\)/);
  assert.match(brandsIndex, /cr2026_render_category_toolbar\(\s*__\( 'Nuestras marcas'[\s\S]*?home_url\( '\/' \)/);
  assert.match(brandArchive, /cr2026_render_category_toolbar\(\s*\$brand_term->name,\s*\$brands_index_url/);
  assert.match(notFound, /cr2026_render_category_toolbar\(\s*__\( 'Página no encontrada'[\s\S]*?''/);
});

test('legacy page headings are hidden on mobile while their desktop presentation remains available', () => {
  assert.match(mainCss, /@media \(max-width: 767px\)[\s\S]*?\.cr-page__header \{ display: none/);
    assert.match(mainCss, /\.cr-empty-state > h1 \{ display: none/);
  assert.match(orders, /else\s*:\s*\?>[\s\S]*?cr-account-orders__desktop-toolbar/);
  assert.match(page, /<header class="cr-page__header">/);
  });

test('Account page template does not emit its generic page title on mobile Account endpoints', () => {
  assert.match(page, /if \( ! \$is_mobile_account \) : \?>[\s\S]*?<header class="cr-page__header">/);
  assert.match(account, /cr2026_account_render_endpoint_toolbar\( \$title/);
});

test('one mobile PAGE TITLE is emitted per route and Product Detail remains excluded', () => {
  assert.doesNotMatch(orders, /cr-account-orders__toolbar/);
  assert.match(page, /! cr2026_account_is_help_page\(\)/);
  assert.match(account, /woocommerce_account_view-order_endpoint/);
  assert.match(productSkin, /cr-parent-category__title/);
  assert.match(productSkin, /product_title entry-title/);
});

test('login and gateway status headings are documented non-page-title exclusions', () => {
  assert.match(login, /cr-login-welcome.*<h1>/s);
  assert.match(woocommerce, /cr-cecabank-redirect__title/);
});
