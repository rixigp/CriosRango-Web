const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {test}=require('node:test');
const root=path.join(__dirname,'..','theme','crios-rango-2026'),cssDir=path.join(root,'assets','css');
const css=Object.fromEntries(['main.css','account.css','cart.css','checkout.css','product-detail-skin.css','login.css','outlet-bubbles.css'].map(n=>[n,fs.readFileSync(path.join(cssDir,n),'utf8')]));
const main=css['main.css'],account=css['account.css'];
test('GLOBAL_HEADER_SOURCE_COUNT=1 and GLOBAL_BOTTOM_NAV_MARKUP_SOURCE_COUNT=1',()=>{
 const header=fs.readFileSync(path.join(root,'header.php'),'utf8'),footer=fs.readFileSync(path.join(root,'footer.php'),'utf8'),helpers=fs.readFileSync(path.join(root,'inc/helpers.php'),'utf8');
 assert.equal((header.match(/cr2026_render_app_header\s*\(\s*\)\s*;/g)||[]).length,1);
 assert.equal((helpers.match(/function\s+cr2026_render_app_header\s*\(/g)||[]).length,1);
 assert.equal((footer.match(/<nav class="cr-mobile-bottom-nav cr-app-bottom-nav"/g)||[]).length,1);
});
test('GLOBAL_MOBILE_PAGE_GUTTER_SOURCE_COUNT=1',()=>{
 const shell=main.match(/\.cr-shell\s*\{([^}]*)\}/);assert.ok(shell);
 assert.equal((main.match(/\.cr-shell\s*\{/g)||[]).length,1);
 assert.match(shell[1],/width:\s*min\(calc\(100%\s*-\s*40px\),\s*var\(--cr-shell\)\)/);
});
test('GLOBAL_TOOLBAR_GEOMETRY_SOURCE_COUNT=1',()=>{
 for(const selector of ['.cr-parent-category__toolbar','.cr-parent-category__back','.cr-parent-category__title']){
  const escaped=selector.split('.').join('\\.');
  assert.equal((main.match(new RegExp(escaped+'\\s*\\{','g'))||[]).length,1,selector);
 }
 assert.doesNotMatch(Object.values(css).join('\n'),/\.cr-brands-index__toolbar\b|\.cr-brand-archive__back-row\b/);
});
test('GLOBAL_MOBILE_FOOTER_POLICY_COUNT=1 and safe-area clearance is global',()=>{
 const footer=fs.readFileSync(path.join(root,'footer.php'),'utf8');
 assert.doesNotMatch(footer,/wp_is_mobile/);
 assert.equal((main.match(/\.cr-footer\s*\{\s*display:\s*none;/g)||[]).length,1);
 assert.match(main,/padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\)/);
});
test('ACCOUNT_EXTRA_OUTER_GUTTERS=0',()=>{
 assert.doesNotMatch(account,/width:\s*min\(calc\(100%\s*-\s*40px\)/);
 assert.doesNotMatch(account,/width:min\(calc\(100%\s*-\s*40px\)/);
 assert.match(account,/\.cr-account-content,[\s\S]*?width:\s*100%/);
});
test('CATALOG_EXTRA_OUTER_GUTTERS=0',()=>{
 const archive=fs.readFileSync(path.join(root,'archive-product.php'),'utf8'),cat=fs.readFileSync(path.join(root,'taxonomy-product_cat.php'),'utf8'),brand=fs.readFileSync(path.join(root,'taxonomy-product_brand.php'),'utf8'),brands=fs.readFileSync(path.join(root,'page-marcas.php'),'utf8');
 assert.match(archive,/cr-category-hub__shell cr-shell/);assert.match(archive,/cr-product-listing__shell cr-shell/);
 assert.match(cat,/cr-parent-category__canvas cr-shell/);assert.match(brand,/cr-brand-archive__shell cr-shell/);assert.match(brands,/cr-brands-index__shell cr-shell/);
 assert.match(main,/\.cr-product-grid \{ width:100%; margin:0;/);
 assert.match(main,/\.cr-product-listing__empty \{ width:100%; margin:36px 0;/);
});
test('PRODUCT_DETAIL_EXTRA_OUTER_GUTTERS=0',()=>{
 assert.match(fs.readFileSync(path.join(root,'index.php'),'utf8'),/cr-shell cr-page-shell/);
 assert.doesNotMatch(css['product-detail-skin.css'],/width:\s*calc\(100%\s*-\s*40px\)/);
});
test('SEARCH_EXTRA_OUTER_GUTTERS=0; scroll-padding remains functional',()=>{
 assert.match(fs.readFileSync(path.join(root,'search.php'),'utf8'),/cr-shell cr-page-shell/);
 assert.match(main,/body\.search\s*\{\s*scroll-padding-top:\s*var\(--cr-app-topbar-height,64px\)/);
 const searchForm=main.match(/body\.search \.cr-search-form\s*\{([^}]*)\}/);
 assert.ok(searchForm);
 assert.match(searchForm[1],/width:\s*100%/);
 assert.doesNotMatch(searchForm[1],/width:\s*calc\(100%\s*-/);
 assert.match(main,/body\.search\s*\{\s*scroll-padding-top:\s*var\(--cr-app-topbar-height,64px\)/);
});
test('CART_EXTRA_OUTER_GUTTERS=0',()=>{
 assert.match(fs.readFileSync(path.join(root,'page.php'),'utf8'),/cr-shell cr-page-shell/);
 assert.doesNotMatch(css['cart.css'],/width:\s*calc\(100%\s*-\s*40px\)/);
 assert.match(css['cart.css'],/\.cr-cart-content\{width:100%/);
});
test('CHECKOUT_EXTRA_OUTER_GUTTERS=0 and shared toolbar is used',()=>{
 assert.match(fs.readFileSync(path.join(root,'page.php'),'utf8'),/cr-shell cr-page-shell/);
 assert.doesNotMatch(css['checkout.css'],/width:\s*calc\(100%\s*-\s*40px\)/);
 const helpers=fs.readFileSync(path.join(root,'inc/helpers.php'),'utf8');
 assert.match(helpers,/cr2026_render_category_toolbar\( __\( 'Finalizar compra'/);
});
test('INFORMATION_EXTRA_OUTER_GUTTERS=0 and generic fallbacks use shell',()=>{
 assert.match(fs.readFileSync(path.join(root,'page.php'),'utf8'),/cr-shell cr-page-shell/);
 for(const file of ['index.php','404.php']) assert.match(fs.readFileSync(path.join(root,file),'utf8'),/cr-shell cr-page-shell/);
 assert.match(account,/\.cr-account-content,[\s\S]*?width:\s*100%/);
});
test('FUNCTIONAL_FULL_BLEED exception is documented',()=>assert.match(main,/FUNCTIONAL_FULL_BLEED: Home hero carousel/));
