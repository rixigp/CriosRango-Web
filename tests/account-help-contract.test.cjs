const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '../theme/crios-rango-2026');
const presentation = fs.readFileSync(path.join(root, 'inc/account-presentation.php'), 'utf8');
const helpers = fs.readFileSync(path.join(root, 'inc/helpers.php'), 'utf8');
const page = fs.readFileSync(path.join(root, 'page.php'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'woocommerce/myaccount/dashboard.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/account.css'), 'utf8');
const footer = fs.readFileSync(path.join(root, 'footer.php'), 'utf8');

test('MOBILE_HELP_REPLACES_UNPROCESSED_PAGE_BUILDER_CONTENT', () => {
  assert.match(page, /the_content\(\)/);
  assert.match(presentation, /wp_is_mobile\(\)/);
  assert.match(presentation, /return ob_get_clean\(\);/);
  assert.doesNotMatch(presentation, /return \$panel \. \$content/);
  assert.match(presentation, /add_filter\( 'the_content', 'cr2026_account_help_content', 20 \)/);
  assert.match(presentation, /cr2026_render_category_toolbar\( \$title, wc_get_page_permalink\( 'myaccount' \), 'parent', false \)/);
  assert.match(dashboard, /cr2026_render_category_toolbar\( __\( 'Cuenta'/);
});

test('HELP_CONTACTS_USE_ONE_CENTRAL_CONFIGURATION_AND_REAL_ACTIONS', () => {
  assert.match(presentation, /function cr2026_account_help_config\(\)/);
  assert.match(presentation, /'number' => '34633246788'/);
  assert.match(presentation, /'number' => '\+34969091236'/);
  assert.match(presentation, /'address' => 'criosrango@criosrango\.es'/);
  assert.match(presentation, /https:\/\/wa\.me\/' \. \$whatsapp\['number'\]/);
  assert.match(presentation, /'tel:' \. \$phone\['number'\]/);
  assert.match(presentation, /'mailto:' \. \$email\['address'\]/);
  assert.match(presentation, /'label' => __\( 'Llamar'/);
});

test('HELP_CONTACT_ICONS_ARE_OWNED_OUTLINE_SVGS_NOT_TEXT_GLYPHS', () => {
  const svgs = [...presentation.matchAll(/<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1\.7" stroke-linecap="round" stroke-linejoin="round">([\s\S]*?)<\/svg>/g)];
  assert.equal(svgs.length, 3);
  assert.match(svgs[0][1], /<path d="M20 11\.5/);
  assert.match(svgs[0][1], /<path d="M8\.8 8\.4/);
  assert.match(svgs[1][1], /<path d="M7 3h3/);
  assert.match(svgs[2][1], /<rect x="3" y="5" width="18" height="14"/);
  assert.doesNotMatch(presentation, /cr-account-help__icon[^<]*>WA|cr-account-help__icon[^<]*>☎|cr-account-help__icon[^<]*>@/);
});

test('HELP_HAS_SEVEN_EXACT_WEEKLY_HOURS_AND_REQUIRED_HEADINGS', () => {
  for (const day of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
    assert.ok(presentation.includes("__( '" + day + "'"), day);
  }
  assert.equal((presentation.match(/'time' => '10:00–13:30 · 17:30–21:00'/g) || []).length, 5);
  assert.match(presentation, /'time' => '10:00–13:30'/);
  assert.match(presentation, /'time' => __\( 'Cerrado'/);
  assert.match(presentation, /Contacta con nosotros/);
  assert.match(presentation, /Horario de atención/);
  assert.doesNotMatch(presentation, /Horario de tienda/);
});

test('HELP_NAV_AND_FOOTER_ARE_MOBILE_SCOPED', () => {
  assert.match(helpers, /is_page\( array\( 'ayuda', 'preguntas-frecuentes', 'contacto' \) \)\s*&& function_exists\( 'wp_is_mobile' \) && wp_is_mobile\(\)/);
  assert.match(footer, /cr-mobile-bottom-nav cr-app-bottom-nav/);
  assert.match(css, /body\.cr-account-help-page \.cr-footer \{ display: none !important; \}/);
  assert.match(css, /body\.cr-account-help-page \.cr-parent-category__toolbar/);
  assert.doesNotMatch(css, /\.cr-account-endpoint-toolbar|\.cr-account-home__toolbar/);
  const helpShell = css.match(/body\.cr-account-help-page \.cr-main > \.cr-shell\.cr-page-shell \{([\s\S]*?)\n  \}/);
  assert.ok(helpShell, 'Help page shell CSS exists');
  assert.match(helpShell[1], /padding-block-end:\s*0;/);
  assert.doesNotMatch(helpShell[1], /calc\(88px|safe-area-inset-bottom/);
  assert.match(css, /\.cr-account-help__card--whatsapp/);
  assert.match(css, /\.cr-account-help__card--phone/);
  assert.match(css, /\.cr-account-help__card--email/);
  assert.match(css, /\.cr-account-help__hours-row/);
});

test('MOBILE_ACCOUNT_AND_HELP_SHELLS_SHARE_OUTLET_TOP_SPACING', () => {
  const accountShell = css.match(/body\.woocommerce-account \.cr-main > \.cr-shell\.cr-page-shell \{([\s\S]*?)\n  \}/);
  const helpShell = css.match(/body\.cr-account-help-page \.cr-main > \.cr-shell\.cr-page-shell \{([\s\S]*?)\n  \}/);
  assert.ok(accountShell, 'Shared Account shell CSS exists');
  assert.ok(helpShell, 'Help shell CSS exists');
  assert.match(accountShell[1], /padding-block-start:\s*0;/);
  assert.match(helpShell[1], /padding-block-start:\s*0;/);
});


test('MOBILE_ACCOUNT_BOTTOM_NAV_USES_ONE_SEMANTIC_ACCOUNT_CONTEXT', () => {
  const accountContext = helpers.match(/function cr2026_is_account_context\(\) \{([\s\S]*?)\n\}/);
  assert.ok(accountContext, 'Account context helper exists');
  assert.match(accountContext[1], /is_account_page\(\)/);
  assert.match(accountContext[1], /is_wc_endpoint_url\( 'loyalty_reward' \)/);
  assert.match(accountContext[1], /is_page\( array\( 'ayuda', 'preguntas-frecuentes', 'contacto' \) \)/);
  assert.match(accountContext[1], /wp_is_mobile\(\)/);
  assert.match(footer, /\$is_mobile_account_active = cr2026_is_account_context\(\);/);
  const mobileNav = footer.split('<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"')[1];
  assert.ok(mobileNav, 'Mobile bottom navigation exists');
  assert.match(mobileNav, /\$is_mobile_account_active \? 'is-active' : ''/);
  assert.match(mobileNav, /\$is_mobile_account_active \? 'account-filled' : 'account-outlined'/);
  assert.match(mobileNav, /\$is_mobile_account_active \? ' aria-current="page"' : ''/);
});

test('ACCOUNT_ACTIVE_SOURCE_PRESERVES_OTHER_NAV_DESTINATIONS', () => {
  assert.match(helpers, /if \( is_front_page\(\) \) \{ return 'home'; \}/);
  assert.match(helpers, /if \( function_exists\( 'is_cart' \) && is_cart\(\) \) \{ return 'cart'; \}/);
  assert.match(helpers, /if \( function_exists\( 'is_product_category' \) && is_product_category\(\) \)/);
  assert.match(footer, /\$is_app_home = 'home' === \$active_nav_item;/);
  assert.match(footer, /\$is_categories_active = 'categories' === \$active_nav_item;/);
  assert.match(footer, /\$is_outlet_active = 'outlet' === \$active_nav_item;/);
  assert.match(footer, /\$is_cart_active = 'cart' === \$active_nav_item;/);
  const desktopRail = footer.split('<nav class="cr-desktop-rail"')[1].split('</nav>')[0];
  assert.match(desktopRail, /\$is_account_active \? 'is-active' : ''/);
});
