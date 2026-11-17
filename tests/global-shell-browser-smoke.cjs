'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = (process.env.STAGING_BASE_URL || 'https://criosrango.es/prueba').replace(/\/+$/, '');
const WIDTHS = [390, 768, 980, 1100, 1279, 1280, 1440, 1920];
const ACCOUNT_URL = new URL('mi-cuenta/', BASE_URL + '/').toString();
const LEGAL_URL = new URL('cambios-y-devoluciones/', BASE_URL + '/').toString();

async function navigate(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  assert.ok(response && response.status() < 400, 'route failed: ' + url + ' status=' + (response && response.status()));
  await page.waitForTimeout(450);
}

async function inspect(page, routeName, width) {
  const state = await page.evaluate(() => {
    const visible = selector => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const root = document.documentElement;
    const product = document.querySelector('body.cr-product-detail-app .cr-main--woocommerce div.product');
    const internalAccountNav = document.querySelector('body.woocommerce-account .woocommerce-MyAccount-navigation');
    return {
      sidebarCount: document.querySelectorAll('.cr-desktop-rail').length,
      bottomCount: document.querySelectorAll('.cr-mobile-bottom-nav.cr-app-bottom-nav').length,
      sidebarVisible: visible('.cr-desktop-rail'),
      bottomVisible: visible('.cr-mobile-bottom-nav.cr-app-bottom-nav'),
      headerCount: document.querySelectorAll('.cr-app-header').length,
      visualFooter: !!document.querySelector('.cr-footer, .site-footer, #colophon'),
      overflow: Math.max(root.scrollWidth, document.body ? document.body.scrollWidth : 0) > root.clientWidth + 1,
      scrollingElementIsRoot: document.scrollingElement === root,
      scrollbarGutter: getComputedStyle(root).scrollbarGutter,
      accountInternalNavVisible: !!internalAccountNav && visible('body.woocommerce-account .woocommerce-MyAccount-navigation'),
      productDisplay: product ? getComputedStyle(product).display : null,
      productFound: !!product
    };
  });
  assert.equal(state.sidebarCount, 1, routeName + ' must render one global desktop sidebar');
  assert.equal(state.bottomCount, 1, routeName + ' must render one global bottom nav');
  assert.equal(state.headerCount, 1, routeName + ' must render one global header');
  assert.equal(state.sidebarVisible, width >= 1280, routeName + ' sidebar at ' + width);
  assert.equal(state.bottomVisible, width < 1280, routeName + ' bottom nav at ' + width);
  assert.equal(state.visualFooter, false, routeName + ' visual footer absent');
  assert.equal(state.overflow, false, routeName + ' no horizontal overflow at ' + width);
  assert.equal(state.scrollingElementIsRoot, true, routeName + ' document scrolling element is html');
  assert.equal(state.scrollbarGutter, 'stable', routeName + ' reserves the root scrollbar gutter');
  if (routeName === 'account' && width < 1280) {
    assert.equal(state.accountInternalNavVisible, false, 'account internal desktop nav hidden below 1280');
  }
  if (routeName === 'product') {
    assert.equal(state.productFound, true, 'product detail marker found');
    assert.equal(state.productDisplay === 'grid', width >= 1280, 'product 2-column grid starts at 1280');
  }
  console.log('GLOBAL_SHELL_' + routeName.toUpperCase() + '_' + width + '=PASS');
}

(async () => {
  const browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'], args: ['--disable-features=OverlayScrollbar'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await navigate(page, BASE_URL + '/');
    const discovered = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
      return {
        category: links.find(href => /\/categoria-producto\//i.test(new URL(href).pathname)),
        outlet: links.find(href => /\/outlet(?:\/|$)/i.test(new URL(href).pathname)),
        product: links.find(href => /\/producto\//i.test(new URL(href).pathname))
      };
    });
    assert.ok(discovered.category, 'homepage must expose a product category route');
    assert.ok(discovered.outlet, 'homepage must expose the Outlet route');
    assert.ok(discovered.product, 'homepage must expose a product detail route');
    const routes = [
      ['home', BASE_URL + '/'],
      ['category', discovered.category],
      ['outlet', discovered.outlet],
      ['product', discovered.product],
      ['account', ACCOUNT_URL],
      ['legal', LEGAL_URL]
    ];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [name, url] of routes) {
        await navigate(page, url);
        await inspect(page, name, width);
      }
    }

    // Validate the one canonical desktop shell at the three requested widths on every public smoke route.
    const desktopWidths=[1280,1440,1920];
    const geometryRoutes=[
      ['HOME',BASE_URL+'/'],
      ['CATEGORY',discovered.category],
      ['OUTLET',discovered.outlet],
      ['PRODUCT',discovered.product],
      ['ACCOUNT',ACCOUNT_URL],
      ['LEGAL',LEGAL_URL]
    ];
    const shellWidths=new Map();
    for(const width of desktopWidths){
      await page.setViewportSize({width,height:1300});
      for(const [name,url] of geometryRoutes){
        await navigate(page,url);
        const metrics=await page.evaluate(()=>{
          const rect=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};};
          const root=document.documentElement;
          return {innerWidth:window.innerWidth,clientWidth:root.clientWidth,overflow:Math.max(root.scrollWidth,document.body.scrollWidth)>root.clientWidth+1,shell:rect('.cr-desktop-shell'),sidebar:rect('.cr-desktop-rail'),primary:rect('#primary'),scrollbarGutter:getComputedStyle(root).scrollbarGutter};
        });
        assert.equal(metrics.scrollbarGutter,'stable',name+' root stable gutter at '+width);
        assert.equal(metrics.overflow,false,name+' no horizontal overflow at '+width);
        for(const part of ['shell','sidebar','primary'])assert.ok(metrics[part],name+' '+part+' geometry missing at '+width);
        const expectedShell=Math.min(width-48,1232),expectedPrimary=1120,expectedMargin=(width-expectedShell)/2;
        assert.ok(Math.abs(metrics.shell.width-expectedShell)<=1,name+' shell width '+metrics.shell.width+' expected '+expectedShell+' at '+width);
        assert.ok(Math.abs(metrics.primary.width-expectedPrimary)<=1,name+' primary width '+metrics.primary.width+' expected '+expectedPrimary+' at '+width);
        assert.ok(Math.abs(metrics.sidebar.width-112)<=1,name+' sidebar width '+metrics.sidebar.width+' expected 112 at '+width);
        assert.ok(Math.abs(metrics.shell.left-expectedMargin)<=1,name+' outer margin '+metrics.shell.left+' expected '+expectedMargin+' at '+width);
        assert.ok(Math.abs(metrics.shell.right-(width-expectedMargin))<=1,name+' right outer margin at '+width);
        shellWidths.set(width+':'+name,metrics.shell.width);
        console.log('DESKTOP_GEOMETRY_'+width+'_'+name+'='+JSON.stringify(metrics));
      }
      const widths=geometryRoutes.map(([name])=>shellWidths.get(width+':'+name));
      assert.ok(widths.every(value=>Math.abs(value-1232)<=1),'all desktop routes share one 1232px shell at '+width);
      console.log('ALL_DESKTOP_ROUTES_SHARE_SAME_SHELL_WIDTH_'+width+'=PASS');
    }
    console.log('PRIMARY_MAX=1120px');
    console.log('SHELL_MAX=1232px');
    console.log('SIDEBAR_WIDTH=112px');
    console.log('NO_HORIZONTAL_OVERFLOW=PASS');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
