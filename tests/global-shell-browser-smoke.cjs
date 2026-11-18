'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = (process.env.STAGING_BASE_URL || 'https://criosrango.es/prueba').replace(/\/+$/, '');
const WIDTHS = [390, 430, 768, 980, 1100, 1200, 1279, 1280, 1440];
const ACCOUNT_URL = new URL('mi-cuenta/', BASE_URL + '/').toString();
const LEGAL_URL = new URL('cambios-y-devoluciones/', BASE_URL + '/').toString();
const NAV_METRICS_BY_ROUTE = new Map();

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
      globalNavigationScale: (() => {
        const nav = document.querySelector('.cr-mobile-bottom-nav.cr-app-bottom-nav');
        const inner = nav?.querySelector('.cr-mobile-bottom-nav__inner');
        const navLink = inner?.querySelector(':scope > a');
        const navIcon = navLink?.querySelector('.cr-icon');
        const headerButtons = Array.from(document.querySelectorAll('.cr-app-header .cr-app-icon-button'));
        const searchButton = headerButtons[0] || null;
        const cartButton = headerButtons.find(button => button.querySelector('.cr-cart-count')) || headerButtons[headerButtons.length - 1] || null;
        const searchIcon = searchButton?.querySelector('.cr-icon');
        const cartIcon = cartButton?.querySelector('.cr-icon');
        const badge = cartButton?.querySelector('.cr-cart-count') || document.querySelector('.cr-app-header .cr-cart-count');
        const navLinkStyle = navLink ? getComputedStyle(navLink) : null;
        const badgeStyle = badge ? getComputedStyle(badge) : null;
        const rect = el => { const r = el?.getBoundingClientRect(); return r ? { width: r.width, height: r.height } : null; };
        return {
          navWidth: rect(nav)?.width ?? null,
          innerWidth: rect(inner)?.width ?? null,
          itemWidth: rect(navLink)?.width ?? null,
          navIcon: navIcon ? rect(navIcon).width : null,
          navLabel: navLinkStyle ? parseFloat(navLinkStyle.fontSize) : null,
          navTarget: rect(navLink),
          searchIcon: searchIcon ? rect(searchIcon).width : null,
          cartIcon: cartIcon ? rect(cartIcon).width : null,
          headerIcon: searchIcon ? rect(searchIcon).width : null,
          headerTarget: rect(searchButton),
          badgeWidth: badgeStyle ? parseFloat(badgeStyle.minWidth) : null,
          badgeMinWidth: badgeStyle ? parseFloat(badgeStyle.minWidth) : null,
          badgeHeight: badgeStyle ? parseFloat(badgeStyle.height) : null,
          badgeFont: badgeStyle ? parseFloat(badgeStyle.fontSize) : null,
          tabletTokens: {
            navIcon: getComputedStyle(document.documentElement).getPropertyValue('--cr-global-nav-icon-size').trim(),
            navLabel: getComputedStyle(document.documentElement).getPropertyValue('--cr-global-nav-label-size').trim(),
            headerIcon: getComputedStyle(document.documentElement).getPropertyValue('--cr-global-header-icon-size').trim()
          }
        };
      })(),
      contextToolbarCount: Array.from(document.querySelectorAll('.cr-parent-category__toolbar')).filter(el => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length,
      contextTitle: document.querySelector('.cr-parent-category__title')?.textContent.trim() || null,
      rawContextToolbarCount: document.querySelectorAll('.cr-parent-category__toolbar').length,
      bodyClass: document.body.className,
      bodyText: (document.body.innerText || '').slice(0, 240),
      h1Texts: Array.from(document.querySelectorAll('h1')).map(el => el.textContent.trim()),
      visualFooter: !!document.querySelector('.cr-footer, .site-footer, #colophon'),
      overflow: Math.max(root.scrollWidth, document.body ? document.body.scrollWidth : 0) > root.clientWidth + 1,
      scrollingElementIsRoot: document.scrollingElement === root,
      scrollbarGutter: getComputedStyle(root).scrollbarGutter,
      accountInternalNavVisible: !!internalAccountNav && visible('body.woocommerce-account .woocommerce-MyAccount-navigation'),
      productDisplay: product ? getComputedStyle(product).display : null,
      bodyPaddingTop: getComputedStyle(document.body).paddingTop,
      spacing: Object.fromEntries(['#primary','.cr-shell','.cr-page-shell','.cr-account-shell','.cr-account-content','.cr-parent-category__toolbar','.cr-cart-block','.wp-block-woocommerce-cart','.woocommerce-cart-form'].map(selector => {
        const el = document.querySelector(selector);
        if (!el) return [selector, null];
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return [selector, { top: Math.round(rect.top * 10) / 10, paddingTop: style.paddingTop, paddingBlockStart: style.paddingBlockStart, marginTop: style.marginTop, paddingBlockEnd: style.paddingBlockEnd }];
      })),
      accountGridColumns: (() => { const el = document.querySelector('.cr-account-home__grid'); return el ? getComputedStyle(el).gridTemplateColumns : null; })(),
      orderFilter: (() => { const el = document.querySelector('.cr-account-orders__filters'); if (!el) return null; const style = getComputedStyle(el); return { display: style.display, flexWrap: style.flexWrap, overflowX: style.overflowX, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }; })(),
      visiblePageTitles: Array.from(document.querySelectorAll('h1,h2')).filter(el => { const style = getComputedStyle(el); const r = el.getBoundingClientRect(); return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0 && el.textContent.trim(); }).map(el => el.textContent.trim()),
      productFound: !!product
    };
  });
  assert.equal(state.sidebarCount, 1, routeName + ' must render one global desktop sidebar');
  assert.equal(state.bottomCount, 1, routeName + ' must render one global bottom nav');
  assert.equal(state.headerCount, 1, routeName + ' must render one global header');
  assert.equal(state.sidebarVisible, width >= 1280, routeName + ' sidebar at ' + width);
  assert.equal(state.bottomVisible, width < 1280, routeName + ' bottom nav at ' + width);
  if (width === 1279) console.log('1279_BOTTOM_NAV=' + (state.bottomVisible ? 'YES' : 'NO') + '; SIDEBAR_VISIBLE=' + (state.sidebarVisible ? 'YES' : 'NO'));
  if (width === 1280) console.log('1280_BOTTOM_NAV=' + (state.bottomVisible ? 'YES' : 'NO') + '; SIDEBAR_VISIBLE=' + (state.sidebarVisible ? 'YES' : 'NO'));
  if (width >= 768 && width < 1280) {
    const scale = state.globalNavigationScale;
    const expectedNavIcon = Math.min(30, 24 + (width - 768) * 6 / 511);
    const expectedNavLabel = Math.min(14, 13 + (width - 768) / 332);
    const expectedHeaderIcon = Math.min(38, 32 + (width - 768) * 6 / 511);
    const expectedBadge = Math.min(23, 20 + (width - 768) * 3 / 511);
    assert.ok(Math.abs(scale.navIcon - expectedNavIcon) <= .3, routeName + ' tablet bottom-nav icon scale at ' + width + ': ' + scale.navIcon);
    assert.ok(Math.abs(scale.navLabel - expectedNavLabel) <= .3, routeName + ' tablet bottom-nav label scale at ' + width + ': ' + scale.navLabel);
    assert.ok(Math.abs(scale.headerIcon - expectedHeaderIcon) <= .3, routeName + ' tablet header search icon scale at ' + width + ': ' + scale.headerIcon);
    assert.ok(Math.abs(scale.cartIcon - expectedHeaderIcon) <= .3, routeName + ' tablet header cart icon scale at ' + width + ': ' + scale.cartIcon);
    assert.ok(Math.abs(scale.badgeMinWidth - expectedBadge) <= .3, routeName + ' tablet cart badge scale at ' + width + ': ' + scale.badgeMinWidth);
    assert.ok(Math.abs(scale.navWidth - width) <= 1, routeName + ' bottom-nav spans viewport at ' + width + ': ' + scale.navWidth);
    assert.ok(scale.innerWidth > 720, routeName + ' intermediate inner track escapes old 720px cap at ' + width + ': ' + scale.innerWidth);
    assert.ok(scale.itemWidth > 140, routeName + ' five-column item width uses available viewport at ' + width + ': ' + scale.itemWidth);
    assert.ok(scale.navTarget.width >= 44 && scale.navTarget.height >= 44, routeName + ' bottom-nav touch target at ' + width);
    assert.ok(scale.headerTarget.width >= 44 && scale.headerTarget.height >= 44, routeName + ' header touch target at ' + width);
    const previous = NAV_METRICS_BY_ROUTE.get(routeName);
    if (previous) {
      assert.ok(scale.innerWidth > previous.innerWidth, routeName + ' inner width grows from ' + previous.width + ' to ' + width);
      assert.ok(scale.itemWidth > previous.itemWidth, routeName + ' item width grows from ' + previous.width + ' to ' + width);
      assert.ok(scale.navIcon > previous.navIcon, routeName + ' nav icon grows from ' + previous.width + ' to ' + width);
      assert.ok(scale.headerIcon > previous.headerIcon, routeName + ' header icon grows from ' + previous.width + ' to ' + width);
    }
    NAV_METRICS_BY_ROUTE.set(routeName, { width, innerWidth: scale.innerWidth, itemWidth: scale.itemWidth, navIcon: scale.navIcon, headerIcon: scale.headerIcon });
    console.log('TABLET_NAV_METRICS_' + routeName.toUpperCase() + '_' + width + '=' + JSON.stringify({ VIEWPORT: width, BOTTOM_NAV_WIDTH: scale.navWidth, INNER_WIDTH: scale.innerWidth, ITEM_WIDTH: scale.itemWidth, ICON_WIDTH: scale.navIcon, LABEL_FONT_SIZE: scale.navLabel, SEARCH_ICON_WIDTH: scale.searchIcon, CART_ICON_WIDTH: scale.cartIcon, BADGE_WIDTH: scale.badgeWidth }));
    assert.ok(scale.navTarget.width >= 44 && scale.navTarget.height >= 44, routeName + ' bottom-nav touch target at ' + width);
    assert.ok(scale.headerTarget.width >= 44 && scale.headerTarget.height >= 44, routeName + ' header touch target at ' + width);
    assert.ok(scale.tabletTokens.navIcon && scale.tabletTokens.navLabel && scale.tabletTokens.headerIcon, routeName + ' tablet scale tokens at ' + width);
    console.log('GLOBAL_NAV_SCALE_' + routeName.toUpperCase() + '_' + width + '=' + JSON.stringify(scale));
  }
  if (width < 768 || width >= 1280) {
    assert.equal(state.globalNavigationScale.tabletTokens.navIcon, '', routeName + ' tablet nav token must not leak outside 768–1279 at ' + width);
  }
  assert.equal(state.visualFooter, false, routeName + ' visual footer absent');
  assert.equal(state.overflow, false, routeName + ' no horizontal overflow at ' + width);
  assert.equal(state.scrollingElementIsRoot, true, routeName + ' document scrolling element is html');
  assert.equal(state.scrollbarGutter, 'stable', routeName + ' reserves the root scrollbar gutter');
  if (routeName === 'cart' && width === 390) {
    console.log('CART_CONTEXT_DIAGNOSTIC=' + JSON.stringify({ url: page.url(), raw: state.rawContextToolbarCount, visible: state.contextToolbarCount, bodyClass: state.bodyClass, h1: state.h1Texts, text: state.bodyText }));
  }
  if (routeName !== 'home' && width < 768) {
    assert.equal(state.contextToolbarCount, 1, routeName + ' must render exactly one mobile context toolbar at ' + width);
  }
  if (width < 768 && routeName === 'account') {
    assert.match(state.contextTitle || '', /Cuenta/, 'guest Account has one Cuenta title');
  }
  if (width < 768 && routeName === 'login') {
    assert.match(state.contextTitle || '', /Acceder/, 'login has one Acceder context toolbar');
    assert.equal(state.visiblePageTitles.filter(title => /acceder|login/i.test(title)).length, 1, 'login has exactly one visible Acceder title');
  }
  if (width < 768 && routeName === 'help') {
    assert.match(state.contextTitle || '', /Ayuda/, 'Help has one Ayuda title, not Contacto');
  }
  if (width < 768 && routeName === 'cart') {
    assert.match(state.contextTitle || '', /Tu carrito/, 'Cart has one Tu carrito title');
  }
  if (routeName === 'contact') {
    const contact = await page.evaluate(() => {
      const renderer = document.querySelectorAll('.cr-account-help');
      const toolbars = document.querySelectorAll('.cr-page-toolbar');
      const titles = document.querySelectorAll('.cr-parent-category__title');
      const grid = document.querySelector('.cr-account-help__grid');
      const style = grid ? getComputedStyle(grid) : null;
      const toolbar = document.querySelector('.cr-page-toolbar');
      const content = document.querySelector('.cr-account-help');
      const contentWrapper = document.querySelector('body.cr-account-help-page .cr-page > .cr-prose');
      const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;
      const contentRect = content ? content.getBoundingClientRect() : null;
      const wrapperStyle = contentWrapper ? getComputedStyle(contentWrapper) : null;
      const wrapperRect = contentWrapper ? contentWrapper.getBoundingClientRect() : null;
      const text = document.body.innerText || '';
      const shortcodeMatches = text.match(/\[(?:\/?(?:vc_row|vc_column|nectar_gmap))\b/gi) || [];
      return {
        rendererCount: renderer.length,
        toolbarCount: toolbars.length,
        titleCount: titles.length,
        cardCount: document.querySelectorAll('.cr-account-help__card').length,
        hoursCount: document.querySelectorAll('.cr-account-help__hours-row').length,
        gridDisplay: style ? style.display : 'none',
        gridColumns: style ? style.gridTemplateColumns : '',
        toolbarLeft: toolbarRect ? Math.round(toolbarRect.left * 10) / 10 : null,
        contentLeft: contentRect ? Math.round(contentRect.left * 10) / 10 : null,
        contentWrapper: contentWrapper ? contentWrapper.className : null,
        contentWrapperPaddingLeft: wrapperStyle ? wrapperStyle.paddingLeft : null,
        contentWrapperMarginLeft: wrapperStyle ? wrapperStyle.marginLeft : null,
        contentWrapperLeft: wrapperRect ? Math.round(wrapperRect.left * 10) / 10 : null,
        extraLeftInset: toolbarRect && contentRect ? Math.round((contentRect.left - toolbarRect.left) * 10) / 10 : null,
        shortcodeTextCount: shortcodeMatches.length,
        visible: renderer.length === 1 && getComputedStyle(renderer[0]).display !== 'none'
      };
    });
    console.log('CONTACT_RENDERER_' + width + '=' + JSON.stringify(contact));
    assert.equal(contact.rendererCount, 1, 'Contact must use one renderer at ' + width);
    assert.equal(contact.toolbarCount, 1, 'Contact must use one toolbar at ' + width);
    assert.equal(contact.titleCount, 1, 'Contact must use one page title at ' + width);
    assert.equal(contact.cardCount, 3, 'Contact must render three action cards at ' + width);
    assert.equal(contact.hoursCount, 7, 'Contact must render seven opening-hour rows at ' + width);
    assert.equal(contact.shortcodeTextCount, 0, 'Contact must never expose WPBakery/Salient shortcode text at ' + width);
    assert.equal(contact.visible, true, 'Contact renderer must be visible at ' + width);
    assert.equal(contact.gridDisplay, 'grid', 'Contact cards use the shared responsive grid at ' + width);
    assert.equal(contact.gridColumns.trim().split(/\s+/).length, width < 768 ? 1 : 3, 'Contact grid columns at ' + width);
    if (width >= 1280) {
      assert.ok(contact.toolbarLeft !== null && contact.contentLeft !== null, 'Contact toolbar/content rails are measurable at ' + width);
      assert.ok(Math.abs(contact.extraLeftInset) <= 1, 'Contact content starts on the toolbar rail at ' + width + ': ' + contact.extraLeftInset);
      assert.equal(contact.contentWrapperPaddingLeft, '0px', 'Contact prose wrapper has no nested left padding at ' + width);
      assert.equal(contact.contentWrapperMarginLeft, '0px', 'Contact prose wrapper has no nested left margin at ' + width);
    }
    console.log('CONTACT_SINGLE_RENDERER_' + width + '=PASS');
  }
  if (routeName === 'account' && width < 1280) {
    assert.equal(state.accountInternalNavVisible, false, 'account internal desktop nav hidden below 1280');
  }
  if (routeName === 'product') {
    assert.equal(state.productFound, true, 'product detail marker found');
    assert.equal(state.productDisplay === 'grid', width >= 1280, 'product 2-column grid starts at 1280');
    if (width === 768) console.log('PRODUCT_DETAIL_768_BOTTOM_NAV=' + (state.bottomVisible && !state.sidebarVisible ? 'PASS' : 'FAIL'));
  }
  if (width === 390 && ['account','cart','outlet'].includes(routeName)) {
    console.log('MOBILE_SPACING_' + routeName.toUpperCase() + '=' + JSON.stringify({ bodyPaddingTop: state.bodyPaddingTop, spacing: state.spacing }));
  }
  if (routeName === 'account' && width < 768 && state.accountGridColumns) {
    assert.equal(state.accountGridColumns.split(' ').length, 2, 'guest Account remains a two-column grid at ' + width);
  }
  console.log('GLOBAL_SHELL_' + routeName.toUpperCase() + '_' + width + '=PASS');
}

(async () => {
  const browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'], args: ['--disable-features=OverlayScrollbar'] });
  try {
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 1000 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    });
    await navigate(desktopPage, BASE_URL + '/');
    const discovered = await desktopPage.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href, text: (a.innerText || a.textContent || '').trim()
      }));
      return {
        category: anchors.find(a => /\/categoria-producto\//i.test(new URL(a.href).pathname))?.href,
        outlet: anchors.find(a => /\/outlet(?:\/|$)/i.test(new URL(a.href).pathname))?.href,
        product: anchors.find(a => /\/producto\//i.test(new URL(a.href).pathname))?.href,
        newArrivals: anchors.find(a => /novedades|reci[eé]n llegad|new arrivals/i.test(a.text) || /\/novedades(?:\/|$)/i.test(new URL(a.href).pathname))?.href,
        brands: anchors.find(a => /nuestras marcas|marcas/i.test(a.text) || /\/marcas(?:\/|$)/i.test(new URL(a.href).pathname))?.href,
        contact: anchors.find(a => /contacto/i.test(a.text) || /\/contacto(?:\/|$)/i.test(new URL(a.href).pathname))?.href
      };
    });
    assert.ok(discovered.category, 'homepage must expose a product category route');
    assert.ok(discovered.outlet, 'homepage must expose the Outlet route');
    assert.ok(discovered.product, 'homepage must expose a product detail route');
    const newArrivalsUrl = discovered.newArrivals || new URL('novedades/', BASE_URL + '/').toString();
    const brandsUrl = discovered.brands || new URL('marcas/', BASE_URL + '/').toString();
    const contactUrl = discovered.contact || new URL('contacto/', BASE_URL + '/').toString();
    await navigate(mobilePage, ACCOUNT_URL);
    const helpUrl = await mobilePage.evaluate(() => {
      const link = document.querySelector('.cr-account-home__tile--help[href]');
      return link ? link.href : null;
    });
    assert.ok(helpUrl, 'guest Account must expose its Help destination');
    const loginUrl = await mobilePage.evaluate(() => {
      const link = document.querySelector('.cr-account-home__user[href]');
      return link ? link.href : null;
    });
    assert.ok(loginUrl, 'guest Account must expose its canonical login destination');

    await navigate(desktopPage, BASE_URL + '/');
    const cartUrl = await desktopPage.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.cr-app-header a[href]'));
      const link = links.find(anchor => /carrito|cart/i.test(new URL(anchor.href).pathname));
      return link ? link.href : null;
    });
    assert.ok(cartUrl, 'global app header must expose a Cart destination');
    const stagingBase = new URL(BASE_URL);
    const resolvedCart = new URL(cartUrl);
    assert.equal(resolvedCart.origin, stagingBase.origin, 'Cart destination must stay on the staging host');
    assert.ok(resolvedCart.pathname.startsWith(stagingBase.pathname.replace(/\/+$/, '') + '/'), 'Cart destination must stay under the staging path: ' + cartUrl);
    console.log('STAGING_CART_URL=' + cartUrl);

    const routes = [
      ['home', BASE_URL + '/'],
      ['category', discovered.category],
      ['outlet', discovered.outlet],
      ['product', discovered.product],
      ['account', ACCOUNT_URL],
      ['login', loginUrl],
      ['help', helpUrl],
      ['contact', contactUrl],
      ['cart', cartUrl],
      ['legal', LEGAL_URL]
    ];
    for (const width of WIDTHS) {
      const page = width < 768 ? mobilePage : desktopPage;
      await page.setViewportSize({ width, height: 1000 });
      for (const [name, url] of routes) {
        await navigate(page, url);
        await inspect(page, name, width);
      }
    }

    // Explicitly request Checkout: the shared shell smoke does not otherwise visit this route.
    const checkoutUrl = new URL('finalizar-compra/', BASE_URL + '/').toString();
    const checkoutResponse = await desktopPage.goto(checkoutUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    assert.ok(checkoutResponse && checkoutResponse.status() < 400,
      'checkout route failed: ' + checkoutUrl + ' status=' + (checkoutResponse && checkoutResponse.status()));
    const checkoutBody = await desktopPage.locator('body').innerText();
    assert.doesNotMatch(checkoutBody, /Ha habido un error crítico|There has been a critical error/i,
      'checkout route must not render the WordPress critical-error page');
    console.log('GLOBAL_SHELL_CHECKOUT_HTTP=' + checkoutResponse.status());
    console.log('GLOBAL_SHELL_CHECKOUT_FINAL_URL=' + desktopPage.url());

    // Verify the platform font actually used to paint title glyphs via Chrome DevTools Protocol.
    const fontRoutes = [
      ['CATEGORY', discovered.category],
      ['NEW_ARRIVALS', newArrivalsUrl],
      ['BRANDS', brandsUrl],
      ['CONTACT', contactUrl],
      ['LEGAL', LEGAL_URL],
      ['ACCOUNT', ACCOUNT_URL]
    ];
    const fontPage = desktopPage;
    await fontPage.setViewportSize({ width: 1440, height: 1000 });
    const cdp = await fontPage.context().newCDPSession(fontPage);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    for (const [name, url] of fontRoutes) {
      await navigate(fontPage, url);
      await fontPage.evaluate(async () => {
        await document.fonts.load('300 21px "Roboto"');
        await document.fonts.ready;
      });
      const cssState = await fontPage.evaluate(() => {
        const title = document.querySelector('.cr-parent-category__title');
        if (!title) return null;
        const style = getComputedStyle(title);
        const faces = Array.from(document.fonts)
          .filter(face => face.family.replace(/["']/g, '') === 'Roboto' && /300/.test(face.weight))
          .map(face => ({ weight: face.weight, status: face.status }));
        return {
          text: title.textContent.trim(), fontFamily: style.fontFamily,
          fontWeight: style.fontWeight, fontSize: style.fontSize, lineHeight: style.lineHeight,
          fontCheck300: document.fonts.check('300 21px "Roboto"'), faces
        };
      });
      assert.ok(cssState, name + ' canonical title exists at ' + url);
      assert.equal(cssState.fontWeight, '300', name + ' CSS/rendered weight');
      assert.equal(cssState.fontSize, '21px', name + ' CSS font size');
      assert.equal(cssState.lineHeight, '28px', name + ' CSS line height');
      assert.equal(cssState.fontCheck300, true, name + ' Roboto 300 FontFaceSet check');
      assert.ok(cssState.faces.some(face => face.status === 'loaded'), name + ' Roboto 300 face loaded');
      const doc = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
      const node = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.cr-parent-category__title' });
      assert.ok(node.nodeId, name + ' title node available through CDP');
      const platform = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
      const rendered = (platform.fonts || []).filter(font => font.glyphCount > 0);
      console.log('ROBOTO_RENDER_' + name + '=' + JSON.stringify({
        url, title: cssState.text, cssFontFamily: cssState.fontFamily,
        cssFontWeight: cssState.fontWeight, cssFontSize: cssState.fontSize,
        cssLineHeight: cssState.lineHeight, fontCheck300: cssState.fontCheck300,
        loadedRobotoFaces: cssState.faces, renderedPlatformFonts: rendered
      }));
      assert.ok(rendered.some(font => /Roboto/i.test(font.familyName)),
        name + ' actual rendered platform font must be Roboto; got ' + JSON.stringify(rendered));
    }
    await cdp.detach();

    // Validate the one canonical desktop shell at the three requested widths on every public smoke route.
    const page = desktopPage;
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
        const expectedShell=Math.min(metrics.clientWidth-48,1232);
        const expectedPrimary=Math.min(1120,expectedShell-112);
        const expectedLayoutMargin=(metrics.clientWidth-expectedShell)/2;
        assert.ok(Math.abs(metrics.shell.width-expectedShell)<=1,name+' shell width '+metrics.shell.width+' expected '+expectedShell+' at '+width+' (layout width '+metrics.clientWidth+')');
        assert.ok(Math.abs(metrics.primary.width-expectedPrimary)<=1,name+' primary width '+metrics.primary.width+' expected '+expectedPrimary+' at '+width);
        assert.ok(Math.abs(metrics.sidebar.width-112)<=1,name+' sidebar width '+metrics.sidebar.width+' expected 112 at '+width);
        assert.ok(Math.abs(metrics.shell.left-expectedLayoutMargin)<=1,name+' shell left '+metrics.shell.left+' expected '+expectedLayoutMargin+' in layout viewport at '+width);
        assert.ok(Math.abs(metrics.shell.right-(expectedLayoutMargin+expectedShell))<=1,name+' shell right edge at '+width);
        shellWidths.set(width+':'+name,metrics.shell.width);
        console.log('DESKTOP_GEOMETRY_'+width+'_'+name+'='+JSON.stringify(metrics));
      }
      const widths=geometryRoutes.map(([name])=>shellWidths.get(width+':'+name));
      const expectedSharedWidth=Math.min(width===1280 ? 1265-48 : width-15-48,1232);
      assert.ok(widths.every(value=>Math.abs(value-expectedSharedWidth)<=1),'all desktop routes share one '+expectedSharedWidth+'px shell at '+width);
      console.log('ALL_DESKTOP_ROUTES_SHARE_SAME_SHELL_WIDTH_'+width+'=PASS');
    }
    console.log('PRIMARY_MAX_TOKEN=1120px');
    console.log('SHELL_MAX_TOKEN=1232px');
    console.log('1280_CONSTRAINED_BY_VIEWPORT=YES');
    console.log('1440_REACHES_MAX=YES');
    console.log('1920_REACHES_MAX=YES');
    console.log('SCROLLBAR_STABILITY=PASS');
    console.log('SIDEBAR_WIDTH=112px');
    console.log('NO_HORIZONTAL_OVERFLOW=PASS');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
