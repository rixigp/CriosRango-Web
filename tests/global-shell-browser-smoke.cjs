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

    // Compare actual scrollbar states at one identical desktop viewport.
    await page.setViewportSize({width:1440,height:1300});
    const geometryRoutes=[
      ['CATEGORY',discovered.category],
      ['OUTLET',discovered.outlet],
      ['ACCOUNT',ACCOUNT_URL],
      ['PRODUCT',discovered.product],
      ['LEGAL',LEGAL_URL]
    ];
    const geometry=[];
    for(const [name,url] of geometryRoutes){
      await navigate(page,url);
      const metrics=await page.evaluate(()=>{
        const root=document.documentElement, scrolling=document.scrollingElement;
        const bounds=selector=>{
          const el=document.querySelector(selector);if(!el)return null;
          const rect=el.getBoundingClientRect();return {left:rect.left,right:rect.right};
        };
        return {
          scrollingElement:scrolling?scrolling.tagName:'NONE',
          isRootScrollingElement:scrolling===root,
          scrollbarGutter:getComputedStyle(root).scrollbarGutter,
          innerWidth:window.innerWidth,
          clientWidth:root.clientWidth,
          bodyWidth:document.body.getBoundingClientRect().width,
          scrollHeight:scrolling?scrolling.scrollHeight:0,
          clientHeight:scrolling?scrolling.clientHeight:0,
          hasVerticalScroll:!!scrolling&&scrolling.scrollHeight>scrolling.clientHeight+1,
          shell:bounds('.cr-desktop-shell'),
          sidebar:bounds('.cr-desktop-rail'),
          primary:bounds('#primary')
        };
      });
      assert.equal(metrics.isRootScrollingElement,true,name+' scrolling element must be HTML');
      assert.equal(metrics.scrollbarGutter,'stable',name+' root gutter must be stable');
      for(const part of ['shell','sidebar','primary'])assert.ok(metrics[part],name+' '+part+' geometry missing');
      geometry.push({name,metrics});
      console.log('SCROLLBAR_ROUTE_'+name+'='+JSON.stringify(metrics));
    }
    const withScroll=geometry.find(x=>x.metrics.hasVerticalScroll);
    const withoutScroll=geometry.find(x=>!x.metrics.hasVerticalScroll);
    assert.ok(withScroll,'at least one real route must have vertical scroll');
    assert.ok(withoutScroll,'at least one real route must not have vertical scroll');
    assert.equal(new Set(geometry.map(x=>x.metrics.innerWidth)).size,1,'window.innerWidth must remain fixed');
    assert.ok(withScroll.metrics.clientWidth<withoutScroll.metrics.clientWidth,'clientWidth should reflect the visible classic scrollbar on the overflowing route');

    const edges=[['shell','left'],['shell','right'],['sidebar','left'],['sidebar','right'],['primary','left'],['primary','right']];
    let shellShift=0;
    for(const [part,edge] of edges)shellShift=Math.max(shellShift,Math.abs(withScroll.metrics[part][edge]-withoutScroll.metrics[part][edge]));
    console.log('SCROLLING_ELEMENT=HTML(document.documentElement)');
    console.log('ROUTE_WITH_SCROLL='+withScroll.name);
    console.log('ROUTE_WITHOUT_SCROLL='+withoutScroll.name);
    console.log('WINDOW_INNER_WIDTH='+withScroll.metrics.innerWidth);
    console.log('DOCUMENT_ELEMENT_CLIENT_WIDTH_WITH_SCROLL='+withScroll.metrics.clientWidth);
    console.log('DOCUMENT_ELEMENT_CLIENT_WIDTH_WITHOUT_SCROLL='+withoutScroll.metrics.clientWidth);
    console.log('SCROLLBAR_CLIENT_WIDTH_DELTA='+(withoutScroll.metrics.clientWidth-withScroll.metrics.clientWidth));
    console.log('BODY_LAYOUT_WIDTH_WITH_SCROLL='+withScroll.metrics.bodyWidth.toFixed(2));
    console.log('BODY_LAYOUT_WIDTH_WITHOUT_SCROLL='+withoutScroll.metrics.bodyWidth.toFixed(2));
    console.log('SHELL_LEFT_WITH_SCROLL='+withScroll.metrics.shell.left.toFixed(2));
    console.log('SHELL_LEFT_WITHOUT_SCROLL='+withoutScroll.metrics.shell.left.toFixed(2));
    console.log('SHELL_RIGHT_WITH_SCROLL='+withScroll.metrics.shell.right.toFixed(2));
    console.log('SHELL_RIGHT_WITHOUT_SCROLL='+withoutScroll.metrics.shell.right.toFixed(2));
    console.log('SIDEBAR_LEFT_WITH_SCROLL='+withScroll.metrics.sidebar.left.toFixed(2));
    console.log('SIDEBAR_RIGHT_WITH_SCROLL='+withScroll.metrics.sidebar.right.toFixed(2));
    console.log('PRIMARY_LEFT_WITH_SCROLL='+withScroll.metrics.primary.left.toFixed(2));
    console.log('PRIMARY_RIGHT_WITH_SCROLL='+withScroll.metrics.primary.right.toFixed(2));
    console.log('SHELL_SHIFT_DUE_TO_SCROLLBAR='+shellShift.toFixed(2)+'px');
    assert.ok(shellShift<=1,'shell/sidebar/primary geometry shifted '+shellShift+'px');
    console.log('SCROLLBAR_GEOMETRY_STABILITY=PASS');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
