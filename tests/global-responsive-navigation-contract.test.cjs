'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const theme = path.join(__dirname, '..', 'theme', 'crios-rango-2026');
const css = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
const footer = fs.readFileSync(path.join(theme, 'footer.php'), 'utf8');
const header = fs.readFileSync(path.join(theme, 'header.php'), 'utf8');
const visual = fs.readFileSync(path.join(theme, 'assets/css/visual-system.css'), 'utf8');
const helpers = fs.readFileSync(path.join(theme, 'inc/helpers.php'), 'utf8');
const account = fs.readFileSync(path.join(theme, 'assets/css/account.css'), 'utf8');
const product = fs.readFileSync(path.join(theme, 'assets/css/product-detail-skin.css'), 'utf8');

function mediaBlock(source, query) {
  const marker = '@media (' + query + ') {';
  const start = source.lastIndexOf(marker);
  assert.notEqual(start, -1, 'missing canonical @media (' + query + ') block');
  const open = source.indexOf('{', start);
  let depth = 1;
  for (let i = open + 1; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(open + 1, i);
  }
  assert.fail('unclosed media block: ' + query);
}

const tablet = mediaBlock(css, 'max-width: 1279px');
const intermediateScale = mediaBlock(css, 'min-width: 768px) and (max-width: 1279px');
const desktop = mediaBlock(css, 'min-width: 1280px');

test('GLOBAL_SHELL_PRESENT_FOR_ALL_NORMAL_PUBLIC_REQUESTS=PASS', () => {
  assert.match(helpers, /function\s+cr2026_is_app_nav_shell\s*\(\)[\s\S]*?return\s+!\s*\(/);
  assert.match(footer, /<nav class="cr-desktop-rail"/);
  assert.match(footer, /<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/);
  assert.doesNotMatch(footer, /if\s*\(\s*\$is_app_nav_shell/);
  assert.equal((footer.match(/<nav class="cr-desktop-rail"/g) || []).length, 1);
  assert.equal((footer.match(/<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/g) || []).length, 1);
});

test('GLOBAL_PRIMARY_NAV_EXACTLY_ONE_MODE_AT_1280=PASS', () => {
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{[^}]*display:\s*block\s*!important/s);
  assert.match(tablet, /\.cr-desktop-rail\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*?\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*?\.cr-desktop-rail\s*\{[^}]*display:\s*flex\s*!important/s);
});

test('GLOBAL_VIEWPORT_MATRIX=390,768,980,1100,1279,1280,1440,1920', () => {
  for (const width of [390, 768, 980, 1100, 1279, 1280, 1440, 1920]) {
    const bottom = width < 1280;
    const sidebar = width >= 1280;
    assert.notEqual(bottom, sidebar, width + 'px must expose exactly one primary nav');
  }
});
test('ONE_CANONICAL_BOTTOM_NAV_COMPONENT_AND_SHARED_MOBILE_STYLES=PASS', () => {
  assert.equal((footer.match(/<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/g) || []).length, 1);
  assert.equal((footer.match(/class="cr-mobile-bottom-nav__inner"/g) || []).length, 1);
  assert.equal((footer.match(/data-cr-cart-count/g) || []).length, 2, 'one badge in bottom nav and one in desktop rail');
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*>\s*\.cr-mobile-bottom-nav__inner\s*>\s*a\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*>\s*\.cr-mobile-bottom-nav__inner\s*>\s*a\s*\{[^}]*text-decoration:\s*none\s*!important/s);
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s+\.cr-icon\s*\{[^}]*width:\s*22px[^}]*height:\s*22px/s);
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s+\.cr-cart-count\s*\{[^}]*top:\s*4px[^}]*right:\s*calc\(50%\s*-\s*25px\)/s);
  assert.match(tablet, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s+\.is-active\s*\{[^}]*color:\s*#111\s*!important/s);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*767px\)[\s\S]{0,1400}\.cr-mobile-bottom-nav\s+a\s*\{/);
});


test('CANONICAL_BOTTOM_NAV_INTERMEDIATE_SCALE_ONLY=PASS', () => {
  assert.match(intermediateScale, /--cr-bottom-nav:\s*88px/);
  assert.match(intermediateScale, /padding:\s*8px\s+8px\s+env\(safe-area-inset-bottom\)/);
  assert.match(intermediateScale, /min-height:\s*68px/);
  assert.match(intermediateScale, /font-size:\s*13px/);
  assert.match(intermediateScale, /line-height:\s*16px/);
  assert.match(intermediateScale, /gap:\s*5px/);
  assert.match(intermediateScale, /column-gap:\s*8px/);
  assert.match(intermediateScale, /width:\s*28px[\s\S]*?height:\s*28px/);
  assert.match(intermediateScale, /min-width:\s*22px[\s\S]*?height:\s*22px[\s\S]*?font-size:\s*12px/);
  assert.match(intermediateScale, /top:\s*2px[\s\S]*?right:\s*calc\(50%\s*-\s*32px\)/);
  assert.match(intermediateScale, /padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  assert.match(intermediateScale, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav/);
  assert.doesNotMatch(intermediateScale, /tablet-bottom-nav|intermediate-bottom-nav|desktop-bottom-nav/);
});

test('ACCOUNT_INTERNAL_DESKTOP_NAV_STARTS_AT_1280=PASS', () => {
  assert.match(account, /@media\s*\(max-width:\s*1279px\)\s*\{[\s\S]*?woocommerce-MyAccount-navigation\s*\{\s*display:\s*none\s*!important/s);
  assert.match(account, /@media\s*\(min-width:\s*1280px\)\s*\{[\s\S]*?woocommerce-MyAccount-navigation\s*\{/s);
});

test('PRODUCT_TWO_COLUMN_LAYOUT_STARTS_AT_1280=PASS', () => {
  const tabletProduct = product.slice(product.indexOf('@media (min-width: 768px)'), product.indexOf('@media (min-width: 1280px)'));
  assert.doesNotMatch(tabletProduct, /flex:\s*0\s+1\s+52%|width:\s*52%|grid-template-columns:/);
  assert.match(product, /@media\s*\(min-width:\s*1280px\)\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*\.92fr\)/s);
});

test('DESKTOP_CONTENT_TOP_GAP_USES_ONE_TOKEN=PASS', () => {
  assert.match(css, /--cr-desktop-content-top-gap:\s*32px/);
  assert.match(css, /\.cr-main,[\s\S]*?padding-top:\s*var\(--cr-desktop-content-top-gap\)/);
});

test('VISUAL_FOOTER_ABSENT_AND_WP_FOOTER_PRESERVED=PASS', () => {
  assert.doesNotMatch(footer, /<footer\b/i);
  assert.match(footer, /<\?php\s+wp_footer\(\);\s+\?>/);
});




test('DESKTOP_SIDEBAR_AND_CONTENT_SHARE_ONE_CENTERED_SHELL=PASS', () => {
  assert.match(header, /<div class="cr-desktop-shell" data-cr-desktop-shell>/);
  assert.match(footer, /<nav class="cr-desktop-rail"[\s\S]*?<\/nav>\s*<\/div>\s*<nav class="cr-mobile-bottom-nav/);
  assert.match(css, /\.cr-desktop-shell\s*\{\s*display:\s*contents\s*;?\s*\}/);
  assert.match(css, /grid-template-columns:\s*var\(--cr-desktop-sidebar\)\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /column-gap:\s*0/);
  assert.match(css, /width:\s*min\(calc\(100vw - 2 \* var\(--cr-desktop-shell-outer\)\),\s*var\(--cr-desktop-shell-max\)\)/);
  assert.match(css, /\.cr-desktop-shell > #primary\s*\{[\s\S]*?grid-column:\s*2[\s\S]*?padding-left:\s*var\(--cr-desktop-content-inset\)/);
  assert.match(css, /\.cr-desktop-shell > \.cr-desktop-rail\s*\{[^}]*grid-column:\s*1/);
  assert.match(css, /\.cr-desktop-shell > \.cr-desktop-rail\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /--cr-desktop-content-inset:\s*20px/);
});

test('DESKTOP_LOGO_OWNERSHIP_AND_MOBILE_HOME_IDENTITY=PASS', () => {
  assert.match(footer, /<a class="cr-desktop-rail__brand"[\s\S]*?home_logo\.png/);
  assert.match(css, /\.cr-desktop-shell > \.cr-app-header \.cr-home-mark\s*\{\s*display:\s*none\s*!important/);
  assert.match(visual, /body\.home \.cr-app-header\.is-home-hero \.cr-home-mark\s*\{/);
  assert.match(css, /\.cr-desktop-rail\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /\.cr-desktop-shell > \.cr-desktop-rail[\s\S]*?display:\s*flex\s*!important/);
  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*?\.cr-desktop-shell\s*\{/);
});
