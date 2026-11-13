const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const theme = path.join(__dirname, '..', 'theme', 'crios-rango-2026');
const mainCss = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
const footer = fs.readFileSync(path.join(theme, 'footer.php'), 'utf8');

function canonicalMobileShell() {
  const marker = 'GLOBAL MOBILE APP SHELL — CANONICAL CONTRACT';
  const start = mainCss.lastIndexOf(marker);
  assert.notEqual(start, -1, 'canonical mobile shell policy must be present at the end of base CSS');
  const policy = mainCss.slice(start);
  assert.match(policy, /@media\s*\(max-width:\s*767px\)/);
  return policy;
}

test('GLOBAL_APP_CANVAS=YES and GLOBAL_SHELL_RAIL=YES: base shell owns mobile canvas and gutter', () => {
  assert.match(mainCss.slice(0, mainCss.indexOf('/* GLOBAL MOBILE APP SHELL')), /body\s*\{[^}]*background:\s*var\(--cr-app-canvas\)/s);
  const policy = canonicalMobileShell();
  assert.match(policy, /body\s*\{[^}]*background:\s*var\(--cr-app-canvas\)\s*!important/s);
  assert.match(policy, /\.cr-shell[^\{]*\{[^}]*width:\s*calc\(100%\s*-\s*40px\)\s*!important;[^}]*max-width:\s*1360px\s*!important/s);
});

test('GLOBAL_PAGE_SHELL=YES and GLOBAL_TOOLBAR_GEOMETRY=YES: canonical zero top spacing and toolbar dimensions', () => {
  const policy = canonicalMobileShell();
  assert.match(policy, /\.cr-page-shell\s*\{[^}]*padding-block:\s*0\s*!important/s);
  assert.match(policy, /\.cr-parent-category__toolbar[^\{]*\{[^}]*min-height:\s*64px\s*!important;[^}]*margin:\s*0 20px 14px\s*!important/s);
  assert.match(policy, /\.cr-parent-category__back\s*\{[^}]*width:\s*48px\s*!important;[^}]*height:\s*48px\s*!important/s);
  assert.match(policy, /\.cr-parent-category__title\s*\{[^}]*font:\s*300 21px\/28px Roboto/s);
});

test('GLOBAL_MOBILE_FOOTER_POLICY=YES and GLOBAL_BOTTOM_CLEARANCE=YES: mobile output suppresses desktop footer and reserves nav space globally', () => {
  assert.match(footer, /if \\( ! \\( function_exists\\( 'wp_is_mobile' \\) && wp_is_mobile\\(\\) \\) && ! \\$is_app_home/);
  const policy = canonicalMobileShell();
  assert.match(policy, /body\s*\{[^}]*padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)\s*!important/s);
  assert.match(policy, /\.cr-footer\s*\{\s*display:\s*none\s*!important/s);
  assert.match(policy, /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{\s*display:\s*block/s);
});

test('PAGE_SPECIFIC_BACKGROUND_OVERRIDES=0 and PAGE_SPECIFIC_BASE_TOP_PADDING_OVERRIDES=0 in canonical policy', () => {
  const policy = canonicalMobileShell();
  assert.doesNotMatch(policy, /body\.(?:woocommerce-cart|woocommerce-account|woocommerce-checkout|cr-account-information-page|cr-account-help-page)\s*\{/);
  assert.doesNotMatch(policy, /body\.[\w-]+\s+\.cr-page-shell\s*\{/);
});
