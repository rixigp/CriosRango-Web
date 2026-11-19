'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const theme = path.resolve(__dirname, '../theme/crios-rango-2026');
const read = relative => fs.readFileSync(path.join(theme, relative), 'utf8');
const archive = read('archive-product.php');
const category = read('taxonomy-product_cat.php');
const page = read('page.php');
const cart = read('woocommerce/cart/cart.php');
const helpers = read('inc/helpers.php');
const account = read('inc/account-presentation.php');
const dashboard = read('woocommerce/myaccount/dashboard.php');
const guestHome = read('woocommerce/myaccount/guest-home.php');
const orders = read('woocommerce/myaccount/orders.php');
const product = read('inc/product-skin.php');
const home = read('front-page.php');
const search = read('search.php');
const notFound = read('404.php');
const brands = read('page-marcas.php');
const brandArchive = read('taxonomy-product_brand.php');

const routeInventory = [
  { page: 'Categorías', template: 'archive-product.php + taxonomy-product_cat.php', usesCanonical: true, source: archive + category, pattern: /cr2026_render_category_toolbar\s*\(/ },
  { page: 'Outlet', template: 'archive-product.php (outlet context)', usesCanonical: true, source: archive, pattern: /cr2026_render_category_toolbar\s*\([\s\S]*?\$listing_title/ },
  { page: 'Carrito', template: 'page.php + woocommerce/cart/cart.php', usesCanonical: true, source: page + cart, pattern: /cr2026_render_category_toolbar\s*\([\s\S]*?__\( 'Tu carrito'/ },
  { page: 'Checkout', template: 'inc/helpers.php::cr2026_checkout_render_toolbar', usesCanonical: true, source: helpers, pattern: /function cr2026_checkout_render_toolbar[\s\S]*?cr2026_render_category_toolbar\s*\(\s*__\( 'Finalizar compra'/ },
  { page: 'Cuenta', template: 'dashboard.php + guest-home.php', usesCanonical: true, source: dashboard + guestHome, pattern: /cr2026_render_category_toolbar\s*\(\s*__\( 'Cuenta'/ },
  { page: 'Pedidos', template: 'orders.php → account endpoint renderer', usesCanonical: true, source: orders + account, pattern: /cr2026_account_render_endpoint_toolbar\s*\(\s*__\( 'Pedidos'/ },
  { page: 'Detalle pedido', template: 'inc/account-presentation.php::view-order endpoint', usesCanonical: true, source: account, pattern: /function cr2026_account_view_order_endpoint_toolbar[\s\S]*?cr2026_account_render_endpoint_toolbar/ },
  { page: 'Dirección', template: 'inc/account-presentation.php::edit-address endpoint', usesCanonical: true, source: account, pattern: /function cr2026_account_address_endpoint_toolbar[\s\S]*?cr2026_account_render_endpoint_toolbar/ },
  { page: 'Perfil', template: 'inc/account-presentation.php::edit-account endpoint', usesCanonical: true, source: account, pattern: /function cr2026_account_profile_endpoint_toolbar[\s\S]*?cr2026_account_render_endpoint_toolbar/ },
  { page: 'Recompensas', template: 'inc/account-presentation.php::loyalty_reward endpoint', usesCanonical: true, source: account, pattern: /function cr2026_account_loyalty_endpoint_toolbar[\s\S]*?cr2026_account_render_endpoint_toolbar/ },
  { page: 'Ayuda', template: 'inc/account-presentation.php::help content', usesCanonical: true, source: account, pattern: /function cr2026_account_help_content[\s\S]*?cr2026_account_render_endpoint_toolbar/ },
  { page: 'Product Detail', template: 'inc/product-skin.php::cr2026_product_skin_toolbar', usesCanonical: true, source: product, pattern: /function cr2026_product_skin_toolbar[\s\S]*?cr2026_render_category_toolbar/ },
  { page: 'Legales', template: 'page.php (generic WordPress page)', usesCanonical: true, source: page, pattern: /cr2026_render_category_toolbar\s*\(\s*get_the_title\(\),\s*\$page_back_url/ },
  { page: 'Búsqueda', template: 'search.php', usesCanonical: true, source: search, pattern: /cr2026_render_category_toolbar\s*\(\s*sprintf\(/ },
  { page: 'Marcas', template: 'page-marcas.php', usesCanonical: true, source: brands, pattern: /cr2026_render_category_toolbar\s*\(/ },
  { page: 'Archivo de marca', template: 'taxonomy-product_brand.php', usesCanonical: true, source: brandArchive, pattern: /cr2026_render_category_toolbar\s*\(/ },
  { page: '404', template: '404.php', usesCanonical: true, source: notFound, pattern: /cr2026_render_category_toolbar\s*\(/ },
];

test('ALL_STANDARD_ROUTES_USE_CANONICAL_PAGE_TOOLBAR=PASS', () => {
  assert.match(helpers, /\$toolbar_class = 'cr-page-toolbar cr-parent-category__toolbar'/,
    'the shared renderer must emit the canonical structural class');
  assert.match(account, /function cr2026_account_render_endpoint_toolbar[\s\S]*?cr2026_render_category_toolbar/,
    'all account endpoint headings must delegate to the same renderer');
  for (const route of routeInventory) {
    assert.equal(route.usesCanonical, true, route.page + ' must use the canonical component');
    assert.match(route.source, route.pattern, route.page + ' renderer missing from ' + route.template);
  }
  assert.match(page, /\$is_cart_page = function_exists\( 'is_cart' \) && is_cart\(\)/,
    'Cart page-level toolbar ownership must apply at every viewport');
  assert.match(page, /if \( \$is_cart_page \)/);
  assert.doesNotMatch(helpers, /cr-checkout-header-shell/,
    'Checkout must not retain a page-specific header wrapper');
  assert.match(notFound, /'cr-404-title'/, '404 uses the canonical toolbar title');
});

test('HOME_HERO_IS_THE_ONLY_DOCUMENTED_FULL_BLEED_HEADER_EXCEPTION', () => {
  assert.match(home, /cr-app-hero/);
  assert.doesNotMatch(home, /cr-page-toolbar|cr2026_render_category_toolbar/);
  assert.equal(routeInventory.filter(route => !route.usesCanonical).length, 0);
});

test('CANONICAL_DESKTOP_CONTEXT_GAP_HAS_ONE_SOURCE_AND_NO_ROUTE_OVERRIDES', () => {
  const visual = read('assets/css/visual-system.css');
  const main = read('assets/css/main.css');
  assert.match(visual, /@media \(min-width: 1280px\) \{\s*\.cr-page-toolbar\s*\{\s*margin: 30px 0 18px;/);
  assert.doesNotMatch(visual, /body\.cr-parent-category-view .*toolbar|body\.cr-product-listing-view .*toolbar|body\.woocommerce-account .*toolbar/);
  assert.match(main, /#primary:has\(\.cr-page-toolbar\)[\s\S]*?padding-top: 0 !important;/);
  assert.match(main, /#primary:has\(\.cr-page-toolbar\) \.cr-page-shell\s*\{[^}]*padding-top: 0 !important;/s);
  assert.match(visual, /--cr-page-top-gap: 32px;/);
  assert.match(visual, /@media \(max-width: 767px\) \{\s*:root\s*\{\s*--cr-page-top-gap: 0px;/);
  assert.match(main, /\.cr-parent-category__toolbar\s*\{[^}]*margin: 0 0 14px;/s,
    'mobile/tablet base spacing remains unchanged');
});

test('FILTER_ONLY_TOOLBAR_USES_ONE_SHARED_TITLE_AND_FILTERS_ROW', () => {
  assert.match(helpers, /\$filters_in_toolbar = \$show_filters && '' === \$ordering_html && '' === \$right_action_html/);
  assert.match(helpers, /if \( \$filters_in_toolbar \) \{\s*\$toolbar_class \.= ' cr-page-controls cr-page-toolbar--title-filters';/);
  assert.match(helpers, /if \( \$filters_in_toolbar \) \{\s*echo '<button type="button" class="cr-parent-category__filters"/);
  assert.doesNotMatch(helpers, /if \( \$filters_in_toolbar \) \{\s*echo '<div class="cr-page-controls">/,
    'filter-only markup must not create a nested second controls row');
  assert.match(helpers, /if \( '' !== \$ordering_html \|\| '' !== \$right_action_html \|\| \( \$show_filters && ! \$filters_in_toolbar \) \)/,
    'sort + filters must continue through the established secondary controls row');

  const main = read('assets/css/main.css');
  assert.match(main, /\.cr-page-toolbar--title-filters \{[^}]*display: flex;[^}]*align-items: center;[^}]*justify-content: space-between;[^}]*gap: 4px;/s);
  assert.match(main, /\.cr-page-toolbar--title-filters > a:first-child \{[^}]*flex: 0 0 48px;/s);
  assert.match(main, /\.cr-page-toolbar--title-filters \.cr-parent-category__title \{[^}]*flex: 1 1 auto;/s);
});
