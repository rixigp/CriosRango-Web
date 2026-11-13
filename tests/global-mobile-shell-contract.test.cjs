const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const theme = path.join(__dirname, '..', 'theme', 'crios-rango-2026');
const mainCss = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
const footer = fs.readFileSync(path.join(theme, 'footer.php'), 'utf8');
function policy() {
  const marker = 'GLOBAL MOBILE APP SHELL — CANONICAL CONTRACT';
  const i = mainCss.lastIndexOf(marker);
  assert.notEqual(i, -1);
  return mainCss.slice(i);
}
test('GLOBAL_APP_CANVAS=YES and GLOBAL_BOTTOM_CLEARANCE=YES', () => {
  const p = policy();
  assert.match(mainCss.slice(0, mainCss.indexOf('/* GLOBAL MOBILE APP SHELL')), /body\s*\{[^}]*background:\s*var\(--cr-app-canvas\)/s);
  assert.match(p, /body\s*\{[^}]*background:\s*var\(--cr-app-canvas\)/s);
  assert.match(p, /padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  assert.doesNotMatch(p, /!important/);
});
test('GLOBAL_SHELL_RAIL=YES and GLOBAL_PAGE_SHELL=YES', () => {
  const p = policy();
  const shell = mainCss.match(/\.cr-shell\s*\{([^}]*)\}/);
  assert.ok(shell);
  assert.equal(mainCss.split('.cr-shell {').length - 1, 1);
  assert.equal(mainCss.split('.cr-parent-category__toolbar {').length - 1, 1);
  assert.match(shell[1], /width:\s*min\(calc\(100%\s*-\s*40px\),\s*var\(--cr-shell\)\)/);
  assert.match(p, /\.cr-page-shell\s*\{[^}]*padding-block:\s*0/);
  assert.doesNotMatch(p, /\.cr-shell\s*\{/);
});
test('GLOBAL_TOOLBAR_GEOMETRY=YES', () => {
  const p = policy();
  assert.match(p, /\.cr-parent-category__toolbar[^\{]*\{[^}]*min-height:\s*64px;[^}]*margin:\s*0 20px 14px;/s);
  assert.match(p, /\.cr-parent-category__back\s*\{[^}]*grid-column:\s*1/);
  assert.match(mainCss, /\.cr-parent-category__back\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px;/s);
  assert.match(mainCss, /\.cr-parent-category__title\s*\{[^}]*font:\s*300 21px\/28px/s);
});
test('GLOBAL_MOBILE_FOOTER_POLICY=YES', () => {
  assert.ok(footer.includes("if ( ! ( function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) ) :"));
  assert.match(policy(), /\.cr-footer\s*\{\s*display:\s*none;/);
  assert.match(policy(), /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{\s*display:\s*block;/);
});
