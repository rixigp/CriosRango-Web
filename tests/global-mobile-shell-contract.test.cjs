const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const root=path.join(__dirname,'..','theme','crios-rango-2026');
const main=fs.readFileSync(path.join(root,'assets/css/main.css'),'utf8');
const visual=fs.readFileSync(path.join(root,'assets/css/visual-system.css'),'utf8');
const footer=fs.readFileSync(path.join(root,'footer.php'),'utf8');
const header=fs.readFileSync(path.join(root,'header.php'),'utf8');
const helpers=fs.readFileSync(path.join(root,'inc/helpers.php'),'utf8');
test('GLOBAL_HEADER_SOURCE_COUNT=1',()=>{
 assert.equal((header.match(/cr2026_render_app_header\s*\(\s*\)\s*;/g)||[]).length,1);
 assert.equal((helpers.match(/function\s+cr2026_render_app_header\s*\(/g)||[]).length,1);
});
test('GLOBAL_BACKGROUND_SOURCE=body canvas token',()=>{
 const body=main.match(/body\s*\{([^}]*)\}/); assert.ok(body);
 assert.match(body[1],/background:\s*var\(--cr-app-canvas\)/);
 assert.equal((main.match(/body\s*\{[^}]*background:\s*var\(--cr-app-canvas\)/g)||[]).length,1);
});
test('GLOBAL_MOBILE_PAGE_GUTTER_SOURCE_COUNT=1',()=>{
 const shell=main.match(/\.cr-shell\s*\{([^}]*)\}/); assert.ok(shell);
 assert.equal((main.match(/(?:^|\n)\s*\.cr-shell\s*\{/g)||[]).length,1);
 assert.match(shell[1],/width:\s*min\(calc\(100%\s*-\s*40px\),\s*var\(--cr-shell\)\)/);
});
test('GLOBAL_TOOLBAR_GEOMETRY_SOURCE_COUNT=1',()=>{
 for(const selector of ['.cr-parent-category__toolbar','.cr-parent-category__back','.cr-parent-category__title']){
  const escaped=selector.split('.').join('\\.');
  assert.equal((main.match(new RegExp(escaped+'\\s*\\{','g'))||[]).length,1,selector);
 }
 assert.match(main,/\.cr-parent-category__toolbar\s*\{[^}]*min-height:\s*64px;[^}]*margin:\s*0 0 14px;/s);
 assert.match(main,/\.cr-parent-category__back\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px;/s);
 assert.match(main,/\.cr-parent-category__title\s*\{[^}]*font:\s*300 21px\/28px/s);
});
test('GLOBAL_BOTTOM_NAV_MARKUP_SOURCE_COUNT=1 and GLOBAL_VISUAL_FOOTER_ABSENT=1',()=>{
 assert.equal((footer.match(/<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/g)||[]).length,1);
 assert.doesNotMatch(footer,/wp_is_mobile/);
 assert.doesNotMatch(footer,/<footer\b/i);
 assert.doesNotMatch(main, /\.cr-footer\b/);
 assert.match(footer, /<\?php\s+wp_footer\(\);\s+\?>/);
 assert.match(main,/padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
});

test('MOBILE_TOP_SPACING_HAS_ONE_CANONICAL_SOURCE_AND_CATEGORY_DOES_NOT_RESERVE_HEADER_TWICE',()=>{
 assert.ok(main.includes('padding-top: var(--cr-app-topbar-height);'));
 assert.ok(visual.includes('--cr-page-top-gap: 20px;'));
 assert.ok(visual.includes('.cr-page-shell {\n  padding-top: var(--cr-page-top-gap);'));
 assert.ok(visual.includes('.cr-main--woocommerce:not(.cr-main--product-detail) {\n  padding-top: var(--cr-page-top-gap);'));
 assert.equal(main.includes('padding-top: var(--cr-app-topbar-height); box-sizing: border-box;'),false);
 assert.ok(main.includes('body.cr-parent-category-view .cr-parent-category__canvas {\n    padding-top: 0;'));
 assert.ok(main.includes('body.cr-app-nav-shell:not(.home):not(.cr-parent-category-view) .cr-category-hub {\n    padding-top: 0;'));
 assert.match(visual, /@media \(min-width: 1280px\) \{[\s\S]*?body\.cr-parent-category-view \.cr-parent-category__toolbar,[\s\S]*?margin-top: 30px;/);
});
