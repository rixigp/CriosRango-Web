'use strict';
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const css = file => fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css', file), 'utf8');
const footerTemplate = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/footer.php'), 'utf8');

function mediaBlocks(source, query) {
  const blocks = [];
  let cursor = 0;
  const marker = query + ' {';
  while ((cursor = source.indexOf(marker, cursor)) !== -1) {
    const start = cursor + marker.length;
    let depth = 1, end = start;
    for (; end < source.length && depth; end++) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}') depth--;
    }
    assert.equal(depth, 0, 'media block braces must balance');
    blocks.push(source.slice(start, end - 1));
    cursor = end;
  }
  return blocks;
}
function desktop(file) {
  const blocks = mediaBlocks(css(file), '@media (min-width: 1280px)');
  assert.ok(blocks.length, file + ' must declare a desktop-only layer');
  return blocks.join('\n');
}

test('MOBILE_RULES_UNCHANGED=PASS — appended desktop layers are strictly gated at 1280px', () => {
  for (const file of ['main.css', 'account.css', 'controls.css', 'checkout.css']) {
    const source = css(file);
    const lastDesktop = source.lastIndexOf('@media (min-width: 1280px) {');
    assert.ok(lastDesktop >= 0, file + ' has desktop media layer');
    const appended = source.slice(lastDesktop);
    assert.match(appended, /^@media \(min-width: 1280px\) \{/);
    assert.doesNotMatch(appended, /@media\s*\(max-width\s*:/);
  }
});

test('DESKTOP_MAIN_RAIL_NOT_NARROW=PASS — one viewport-derived rail with 1440px cap', () => {
  const layer = desktop('main.css');
  assert.match(layer, /--cr-desktop-sidebar:\s*112px/);
  assert.match(layer, /--cr-desktop-gutter:\s*clamp\(32px,\s*3vw,\s*64px\)/);
  assert.match(layer, /--cr-desktop-content-max:\s*1280px/);
  assert.match(layer, /width:\s*min\(calc\(100vw - var\(--cr-desktop-sidebar\) - 2 \* var\(--cr-desktop-gutter\)\), var\(--cr-desktop-content-max\)\)/);
  assert.doesNotMatch(layer, /transform:\s*scale|\bzoom\s*:/);
});

test('DESKTOP_SHELL_MAX_AND_HOME_HERO_SCALE=PASS', () => {
  const layer = desktop('main.css');
  assert.match(layer, /--cr-desktop-shell-max:\s*calc\(var\(--cr-desktop-sidebar\) \+ var\(--cr-desktop-content-max\)\)/);
  assert.match(layer, /\.cr-desktop-shell > #primary\.cr-home--app\s*\{[^}]*padding:\s*0\s*!important/s);
  assert.match(layer, /\.cr-app-hero__slides,[\s\S]*?aspect-ratio:\s*16\s*\/\s*6/);
  assert.match(layer, /\.cr-app-hero__image\s*\{[^}]*object-fit:\s*cover/s);
  assert.doesNotMatch(layer, /transform:\s*scale|\\bzoom\\s*:/);
});

test('DESKTOP_CONTENT_RAIL_IS_SINGLE_SOURCE=PASS — Home and Category consume one desktop inset', () => {
  const layer = desktop('main.css');
  const home = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/front-page.php'), 'utf8');
  assert.match(layer, /--cr-desktop-content-inset:\s*20px/);
  assert.match(layer, /padding-right:\s*var\(--cr-desktop-content-inset\)\s*!important/);
  assert.match(layer, /padding-left:\s*var\(--cr-desktop-content-inset\)\s*!important/);
  assert.match(layer, /\.cr-desktop-shell > #primary\.cr-home--app \.cr-desktop-content-rail\s*\{[\s\S]*?width:\s*calc\(100% - 2 \* var\(--cr-desktop-content-inset\)\)/);
  assert.match(layer, /\.cr-desktop-content-rail :is\([\s\S]*?\.cr-home-section__header[\s\S]*?padding-left:\s*0 !important/);
  assert.doesNotMatch(layer, /--cr-desktop-content-padding/);
  assert.equal((home.match(/class="[^"]*\bcr-desktop-content-rail\b/g) || []).length, 4);
  const heroEnd = home.indexOf('</section>', home.indexOf('class="cr-hero cr-app-hero"'));
  const categoriesStart = home.indexOf('<section id="categorias"');
  assert.ok(heroEnd > 0 && categoriesStart > heroEnd);
  assert.doesNotMatch(home.slice(0, categoriesStart), /cr-desktop-content-rail/);
});

test('DESKTOP_ACCOUNT_NO_720_CAP=PASS — Account shell and content use the canonical desktop rail', () => {
  const account = css('account.css');
  assert.match(account, /body\.woocommerce-account \.cr-account-shell[\s\S]*?max-width:\s*1280px/);
  assert.match(account, /body\.woocommerce-account \.cr-account-content[\s\S]*?width:\s*100%\s*!important/);
  assert.match(account, /\.cr-account-home[\s\S]*?max-width:\s*none\s*!important/);
  assert.doesNotMatch(account, /max-width:\s*720px/);
});

test('DESKTOP_GRID_COLUMNS_RESPONSIVE=PASS — archive and category cards use flexible minimum tracks', () => {
  const layer = desktop('main.css');
  assert.match(layer, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(var\(--cr-desktop-card-min\),\s*1fr\)\)/);
  assert.match(layer, /--cr-desktop-card-min:\s*225px/);
  assert.match(layer, /cr-parent-category__grid[\s\S]*?repeat\(auto-fit,\s*minmax\(210px,\s*1fr\)\)/);
});

test('DESKTOP_NO_HORIZONTAL_OVERFLOW=PASS — desktop shells and cards permit intrinsic shrink', () => {
  const layer = desktop('main.css');
  assert.match(layer, /\.cr-main,[\s\S]*?min-width:\s*0/);
  assert.match(layer, /\.cr-product-card[\s\S]*?min-width:\s*0/);
  assert.match(desktop('account.css'), /body\.woocommerce-account \.cr-account-content[\s\S]*?min-width:\s*0/);
});

test('DESKTOP_CART_PAGE_SHELL_UNCAPPED=PASS — cart outer prose wrapper cannot inherit the 860px reading cap', () => {
  const layer = desktop('main.css');
  assert.match(layer, /body\.woocommerce-cart \.cr-page,[\s\S]*?body\.woocommerce-cart \.cr-page \.cr-prose[\s\S]*?width:\s*100%\s*!important[\s\S]*?max-width:\s*none\s*!important/);
});



test('VISUAL_FOOTER_MOBILE_ABSENT=PASS — no footer visual markup or CSS', () => { assert.doesNotMatch(footerTemplate, /<footer\b|Críos\s*&amp;\s*Rango|Moda para crecer|Aviso legal|Privacidad|Cookies|©/i); assert.doesNotMatch(css('main.css'), /cr-footer/); });
test('VISUAL_FOOTER_TABLET_ABSENT=PASS — visual footer absent at tablet widths', () => { assert.doesNotMatch(footerTemplate, /<footer\b/i); assert.doesNotMatch(css('main.css'), /cr-footer/); });
test('VISUAL_FOOTER_DESKTOP_ABSENT=PASS — visual footer absent at desktop widths', () => { assert.doesNotMatch(footerTemplate, /<footer\b/i); assert.doesNotMatch(css('main.css'), /cr-footer/); });
test('WP_FOOTER_HOOK_PRESENT=PASS — technical WordPress hook retained', () => { assert.match(footerTemplate, /<\?php\s+wp_footer\(\);\s+\?>/); });


test('DESKTOP_GUEST_ACCOUNT_HOME_USES_CANONICAL_RAIL=PASS — guest landing has no inherited 720px cap', () => {
  const layer = desktop('account.css');
  assert.match(layer, /body\.woocommerce-account:not\(\.logged-in\):has\(\.cr-account-home\)\s+\.cr-account-home[\s\S]*?width:\s*100%\s*!important;[\s\S]*?max-width:\s*none\s*!important/);
  assert.match(layer, /body\.woocommerce-account\.logged-in\s+\.cr-account-shell[\s\S]*?max-width:\s*none\s*!important/);
  assert.doesNotMatch(layer, /grid-template-columns:\s*minmax\(220px,\s*250px\)\s+minmax\(0,\s*1fr\)/);
});


test('ACCOUNT_AUTH_DESKTOP_SINGLE_CONTENT_RAIL=PASS — legacy navigation column is absent', () => {
  const account = css('account.css');
  assert.match(account, /body\.woocommerce-account\.logged-in \.cr-account-shell[\s\S]*?width: 100% !important/);
  assert.match(account, /body\.woocommerce-account\.logged-in \.cr-account-content[\s\S]*?float: none !important[\s\S]*?min-width: 0/);
  assert.doesNotMatch(account, /\.cr-account-shell[\s\S]*?grid-template-columns:\s*minmax\(220px, 250px\) minmax\(0, 1fr\)/);
  assert.match(account, /cr-account-home__grid[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(account, /cr-account-home__identity strong[\s\S]*?word-break: normal/);
  assert.doesNotMatch(account, /flex-wrap:\s*wrap|transform:\s*scale|\bzoom\s*:/);
});


test('DESKTOP_SINGLE_OUTER_GEOMETRY=PASS — canonical selectors own desktop shell geometry', () => {
  const layer = desktop('main.css');
  assert.match(layer, /\.cr-desktop-shell \{[\s\S]*?display: grid/);
  assert.match(layer, /\.cr-desktop-shell > \.cr-desktop-rail \{[\s\S]*?position: sticky !important/);
  assert.match(layer, /\.cr-desktop-shell > \.cr-app-header \{[\s\S]*?position: absolute !important/);
  assert.match(layer, /\.cr-desktop-shell > #primary \{[\s\S]*?width: 100% !important[\s\S]*?min-width: 0/);
  assert.doesNotMatch(layer, /100vw[\s\S]{0,260}cr-parent-category__canvas|cr-parent-category__canvas[\s\S]{0,260}100vw/);
  assert.doesNotMatch(layer, /body\.(?:home|cr-parent-category-view|cr-app-nav-shell|cr-product-listing-view)\s+\.cr-app-header\s*\{[^}]*\bleft\s*:/);
  assert.doesNotMatch(layer, /body\.(?:home|cr-parent-category-view|cr-app-nav-shell)\s+\.cr-desktop-rail\s*\{/);
});

test('CATEGORY_CONTENT_USES_PRIMARY_WIDTH=PASS — canvas uses available primary width', () => {
  const layer = desktop('main.css');
  assert.match(layer, /\.cr-desktop-shell > #primary \.cr-parent-category__canvas \{[\s\S]*?width: 100% !important;[\s\S]*?min-width: 0 !important;[\s\S]*?margin: 0 !important;/);
  assert.doesNotMatch(layer, /cr-parent-category__canvas[\s\S]{0,420}100vw/);
});

test('PRODUCT_HEADER_USES_CANONICAL_DESKTOP_HEADER=PASS — sticky override is tablet-only', () => {
  const source = css('product-detail-skin.css');
  const blocks = mediaBlocks(source, '@media (min-width: 1280px)').join('\n');
  assert.doesNotMatch(blocks, /cr-app-header[\s\S]{0,120}position:\s*sticky/);
  assert.match(source, /@media \(max-width: 1279px\) \{\s*body\.cr-product-detail-app \.cr-app-header/);
});


test('DESKTOP_BODY_HAS_NO_GLOBAL_HEADER_OFFSET=PASS — non-Home pages do not push the desktop shell down', () => {
  const layer = desktop('main.css');
  assert.doesNotMatch(layer, /body\.cr-global-app-header:not\(\.home\)\s*\{[^}]*padding-top:/);
  assert.match(css('main.css'), /@media \(max-width: 1279px\)[\s\S]*?body\.cr-global-app-header:not\(\.home\)[\s\S]*?padding-top:/);
});
