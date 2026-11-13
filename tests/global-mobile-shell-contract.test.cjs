const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const theme = path.join(__dirname, '..', 'theme', 'crios-rango-2026');
const mainCss = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
const footer = fs.readFileSync(path.join(theme, 'footer.php'), 'utf8');

function canonicalMobileShell() {
  const marker = 'GLOBAL MOBILE APP SHELL — CANONICAL CONTRACT';
  const start = mainCss.lastIndexOf(marker);
  assert.notEqual(start, -1);
  return mainCss.slice(start);
}

test('GLOBAL_APP_CANVAS=YES and GLOBAL_BOTTOM_CLEARANCE=YES', () => {
  const policy = canonicalMobileShell();
  assert.match(mainCss.slice(0, mainCss.indexOf('/* GLOBAL MOBILE APP SHELL')), /body\s*\{[^}]*background:\s*var\(--cr-app-canvas\)/s);
  assert.match(policy, /body\s*\{[^}]*background:\s*var\(--cr-app-canvas\)/s);
  assert.match(policy, /padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  assert.doesNotMatch(policy, /!important/);
});

test('GLOBAL_SHELL_RAIL=YES and GLOBAL_PAGE_SHELL=YES', () => {
  const policy = canonicalMobileShell();
  const shellBase = mainCss.match(/\.cr-shell\s*\{([^}]*)\}/);
  assert.ok(shellBase);
  assert.match(shellBase[1], /width:\s*min\(calc\(100%\s*-\s*40px\),\s*var\(--cr-shell\)\)/);
  assert.match(policy, /\.cr-page-shell\s*\{[^}]*padding-block:\s*0/);
  assert.doesNotMatch(policy, /\.cr-shell\s*\{/);
});

test('GLOBAL_TOOLBAR_GEOMETRY=YES', () => {
  const policy = canonicalMobileShell();
  assert.match(policy, /\.cr-parent-category__toolbar[^\{]*\{[^}]*min-height:\s*64px;[^}]*margin:\s*0 20px 14px;/s);
  assert.match(policy, /\.cr-parent-category__back\s*\{[^}]*grid-column:\s*1/);
  assert.match(mainCss, /\.cr-parent-category__back\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px;/s);
  assert.match(mainCss, /\.cr-parent-category__title\s*\{[^}]*font:\s*300 21px\/28px/s);
});

test('GLOBAL_MOBILE_FOOTER_POLICY=YES', () => {
  assert.match(footer, /if \( ! \( function_exists\( 'wp_is_mobile' \) && wp_is_mobile\(\) \) \) :/);
  assert.match(canonicalMobileShell(), /\.cr-footer\s*\{\s*display:\s*none;/);
  assert.match(canonicalMobileShell(), /\.cr-mobile-bottom-nav\.cr-app-bottom-nav\s*\{\s*display:\s*block;/);
});
