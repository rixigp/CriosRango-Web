'use strict';

const { chromium } = require('playwright');

const BASE_URL = (process.env.STAGING_BASE_URL || 'https://criosrango.es/prueba').replace(/\/+$/, '');
const RESPONSIVE_VIEWPORTS = [390, 768, 980, 1100, 1279, 1280, 1440, 1920];
const BOTTOM_NAV_VIEWPORTS = [390, 768, 980, 1100, 1279, 1280];
const VIEWPORTS = [1280, 1440, 1920];
const accountUrl = new URL('mi-cuenta/', BASE_URL + '/').toString();
const EXPECTED_INFORMATION_LABELS = [
  'Cambios y devoluciones',
  'Condiciones de contratación',
  'Política de privacidad',
  'Aviso legal',
  'Política de cookies'
];

function log(key, value) {
  console.log(key + '=' + value);
}

async function visit(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  if (!response || response.status() >= 400) {
    throw new Error('BROWSER_NAVIGATION_FAILED=' + url + ' STATUS=' + (response ? response.status() : 'NO_RESPONSE'));
  }
  await page.waitForTimeout(900);
}

async function overflowState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const clientWidth = root.clientWidth;
    const docWidth = root.scrollWidth;
    const bodyWidth = body ? body.scrollWidth : 0;
    const overflows = Math.max(docWidth, bodyWidth) > clientWidth + 1;
    const candidates = [];

    if (overflows) {
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        let clippedByAncestor = false;
        for (let parent = el.parentElement; parent && parent !== body; parent = parent.parentElement) {
          const overflowX = getComputedStyle(parent).overflowX;
          if (['auto', 'scroll', 'hidden', 'clip'].includes(overflowX)) {
            clippedByAncestor = true;
            break;
          }
        }
        if (clippedByAncestor) continue;
        if (rect.right > clientWidth + 1 || rect.left < -1) {
          const style = getComputedStyle(el);
          candidates.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className.trim().slice(0, 140) : '',
            left: Math.round(rect.left * 100) / 100,
            right: Math.round(rect.right * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
            position: style.position,
            cssWidth: style.width
          });
        }
      }
      candidates.sort((a, b) => (b.right - clientWidth) - (a.right - clientWidth));
    }

    return {
      clientWidth,
      documentElementScrollWidth: docWidth,
      bodyScrollWidth: bodyWidth,
      overflow: overflows,
      offenders: candidates.slice(0, 8)
    };
  });
}

async function checkOverflow(page, label, viewport) {
  const state = await overflowState(page);
  log(label + '_' + viewport + '_DOCUMENT_SCROLL_WIDTH', state.documentElementScrollWidth);
  log(label + '_' + viewport + '_CLIENT_WIDTH', state.clientWidth);
  log(label + '_' + viewport + '_BODY_SCROLL_WIDTH', state.bodyScrollWidth);
  if (state.overflow) {
    log(label + '_' + viewport + '_OVERFLOW_OFFENDERS', JSON.stringify(state.offenders));
  }
  return state.overflow;
}

async function canonicalBottomNavigation(page, label, viewport) {
  const state = await page.evaluate(() => {
    const bottoms = Array.from(document.querySelectorAll('nav.cr-mobile-bottom-nav.cr-app-bottom-nav'));
    const rails = Array.from(document.querySelectorAll('nav.cr-desktop-rail'));
    const nav = bottoms[0];
    const links = nav ? Array.from(nav.querySelectorAll(':scope > .cr-mobile-bottom-nav__inner > a')) : [];
    const icon = links[0] && links[0].querySelector('.cr-icon');
    const badge = nav && nav.querySelector('[data-cr-cart-count]');
    const navStyle = nav && getComputedStyle(nav);
    const innerStyle = nav && getComputedStyle(nav.querySelector('.cr-mobile-bottom-nav__inner'));
    const linkStyle = links[0] && getComputedStyle(links[0]);
    const iconStyle = icon && getComputedStyle(icon);
    const badgeStyle = badge && getComputedStyle(badge);
    const activeLinks = links.filter(link => link.classList.contains('is-active'));
    const currentLinks = links.filter(link => link.getAttribute('aria-current') === 'page');
    let badgeStates = { count: badge ? badge.dataset.count : null, display: badgeStyle ? badgeStyle.display : 'MISSING' };
    if (badge) {
      const originalCount = badge.dataset.count;
      const originalClass = badge.className;
      badgeStates = {};
      for (const count of ['0', '1', '2']) {
        badge.dataset.count = count;
        badge.classList.toggle('is-empty', count === '0');
        badgeStates[count] = {
          display: getComputedStyle(badge).display,
          position: getComputedStyle(badge).position,
          sameNode: badge === nav.querySelector('[data-cr-cart-count]')
        };
      }
      badge.dataset.count = originalCount;
      badge.className = originalClass;
    }
    return {
      bottomCount: bottoms.length,
      railCount: rails.length,
      bottomDisplay: navStyle ? navStyle.display : 'MISSING',
      bottomPosition: navStyle ? navStyle.position : 'MISSING',
      bottomBottom: navStyle ? navStyle.bottom : 'MISSING',
      bottomMinHeight: navStyle ? navStyle.minHeight : 'MISSING',
      innerDisplay: innerStyle ? innerStyle.display : 'MISSING',
      innerColumns: innerStyle ? innerStyle.gridTemplateColumns.split(' ').length : 0,
      linkCount: links.length,
      linkDisplay: linkStyle ? linkStyle.display : 'MISSING',
      linkDirection: linkStyle ? linkStyle.flexDirection : 'MISSING',
      linkTextDecoration: linkStyle ? linkStyle.textDecorationLine : 'MISSING',
      linkFontSize: linkStyle ? linkStyle.fontSize : 'MISSING',
      linkGap: linkStyle ? linkStyle.gap : 'MISSING',
      iconWidth: iconStyle ? iconStyle.width : 'MISSING',
      iconHeight: iconStyle ? iconStyle.height : 'MISSING',
      activeCount: activeLinks.length,
      currentCount: currentLinks.length,
      activeMatchesCurrent: activeLinks.length === currentLinks.length
        && activeLinks.every(link => link.getAttribute('aria-current') === 'page'),
      badgeCount: nav ? nav.querySelectorAll('[data-cr-cart-count]').length : 0,
      badgeStates
    };
  });
  let pass;
  if (viewport < 1280) {
    pass = state.bottomCount === 1 && state.railCount === 1
      && state.bottomDisplay !== 'none' && state.bottomPosition === 'fixed'
      && state.bottomBottom === '0px' && state.innerDisplay === 'grid'
      && state.innerColumns === 5 && state.linkCount === 5
      && state.linkDisplay === 'flex' && state.linkDirection === 'column'
      && state.linkTextDecoration === 'none' && state.linkFontSize === '10.88px'
      && state.linkGap === '3px' && state.iconWidth === '22px' && state.iconHeight === '22px'
      && state.activeMatchesCurrent && state.badgeCount === 1
      && state.badgeStates['0'].display === 'none'
      && state.badgeStates['1'].display !== 'none'
      && state.badgeStates['2'].display !== 'none'
      && state.badgeStates['0'].sameNode && state.badgeStates['1'].sameNode && state.badgeStates['2'].sameNode;
  } else {
    pass = state.bottomCount === 1 && state.railCount === 1
      && state.bottomDisplay === 'none' && state.railCount === 1;
  }
  log(label + '_CANONICAL_BOTTOM_NAV_' + viewport, pass ? 'PASS' : 'FAIL');
  log(label + '_BOTTOM_NAV_STATE_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error(label + '_CANONICAL_BOTTOM_NAV_FAILED at ' + viewport);
}


async function productStackedLayout(page, viewport) {
  const state = await page.evaluate(() => {
    const product = document.querySelector('body.cr-product-detail-app .cr-main--woocommerce div.product');
    if (!product) return { found: false };
    const gallery = product.querySelector(':scope > .woocommerce-product-gallery');
    const summary = product.querySelector(':scope > .summary');
    const summaryContent = summary && (summary.querySelector(':scope > .cr-product-title-brand-row') || summary.firstElementChild);
    const productRect = product.getBoundingClientRect();
    const productStyle = getComputedStyle(product);
    const innerWidth = productRect.width - parseFloat(productStyle.paddingLeft) - parseFloat(productStyle.paddingRight);
    const galleryRect = gallery && gallery.getBoundingClientRect();
    const summaryRect = summaryContent && summaryContent.getBoundingClientRect();
    return {
      found: Boolean(galleryRect && summaryRect),
      display: productStyle.display,
      summaryDisplay: summary ? getComputedStyle(summary).display : 'MISSING',
      productWidth: productRect.width,
      innerWidth,
      galleryWidth: galleryRect && galleryRect.width,
      galleryTop: galleryRect && galleryRect.top,
      summaryTop: summaryRect && summaryRect.top
    };
  });
  const pass = state.found && state.display === 'flex' && state.summaryDisplay !== 'contents'
    && state.galleryWidth >= state.innerWidth - 2 && state.galleryTop <= state.summaryTop;
  log('PRODUCT_TABLET_STACKED_' + viewport, pass ? 'PASS' : 'FAIL');
  log('PRODUCT_TABLET_GEOMETRY_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error('PRODUCT_TABLET_LAYOUT_FAILED at ' + viewport);
}

async function accountTileGridLayout(page, viewport) {
  const state = await page.evaluate(() => {
    const grid = document.querySelector('body.woocommerce-account .cr-account-home__grid');
    if (!grid) return { found: false };
    const template = getComputedStyle(grid).gridTemplateColumns;
    return { found: true, template, columns: template.split(' ').filter(Boolean).length };
  });
  const expected = viewport >= 900 ? 4 : 2;
  const pass = state.found && state.columns === expected;
  log('ACCOUNT_TILES_' + viewport + '_COLUMNS', state.columns || 'MISSING');
  log('ACCOUNT_TILES_GRID_' + viewport, pass ? 'PASS' : 'FAIL');
  if (!pass) throw new Error('ACCOUNT_TILE_GRID_FAILED at ' + viewport + ': ' + JSON.stringify(state));
}

async function canonicalPageHeader(page, label, viewport) {
  const state = await page.evaluate(() => {
    const toolbars = Array.from(document.querySelectorAll('.cr-parent-category__toolbar'));
    const toolbar = toolbars.find(item => item.querySelector('.cr-parent-category__title'));
    if (!toolbar) return { found: false, count: toolbars.length };
    const title = toolbar.querySelector('.cr-parent-category__title');
    const back = toolbar.querySelector('.cr-parent-category__back');
    return {
      found: true,
      count: toolbars.length,
      title: (title.textContent || '').trim(),
      backHref: back ? back.href : '',
      backCount: back ? 1 : 0
    };
  });
  const pass = state.found && state.count === 1 && state.title.length > 0 && state.backCount === 1;
  log(label + '_CANONICAL_PAGE_HEADER_' + viewport, pass ? 'PASS' : 'FAIL');
  log(label + '_PAGE_HEADER_STATE_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error(label + '_CANONICAL_PAGE_HEADER_FAILED at ' + viewport);
}

async function productLayout(page, viewport) {
  const state = await page.evaluate(() => {
    const product = document.querySelector('body.cr-product-detail-app .cr-main--woocommerce div.product');
    if (!product) return { found: false };
    const gallery = product.querySelector(':scope > .woocommerce-product-gallery');
    const summary = product.querySelector(':scope > .summary');
    const summaryContent = summary && (
      summary.querySelector(':scope > .cr-product-title-brand-row') ||
      summary.querySelector(':scope > form.cart') ||
      summary.firstElementChild
    );
    const description = summary && summary.querySelector(':scope > .cr-product-description');
    const tabs = product.querySelector(':scope > .woocommerce-tabs');
    const productRect = product.getBoundingClientRect();
    const galleryRect = gallery ? gallery.getBoundingClientRect() : null;
    const summaryRect = summaryContent ? summaryContent.getBoundingClientRect() : null;
    const descriptionRect = description ? description.getBoundingClientRect() : null;
    const tracks = getComputedStyle(product).gridTemplateColumns.split(' ').map(value => parseFloat(value)).filter(Number.isFinite);
    const sum = tracks.reduce((total, value) => total + value, 0);
    return {
      found: true,
      display: getComputedStyle(product).display,
      summaryDisplay: summary ? getComputedStyle(summary).display : 'MISSING',
      tracks,
      galleryRect: galleryRect && { left: galleryRect.left, top: galleryRect.top, width: galleryRect.width },
      summaryRect: summaryRect && { left: summaryRect.left, top: summaryRect.top, width: summaryRect.width },
      descriptionRect: descriptionRect && { left: descriptionRect.left, top: descriptionRect.top, width: descriptionRect.width },
      productRect: { left: productRect.left, width: productRect.width },
      galleryShare: sum && tracks[0] / sum,
      summaryShare: sum && tracks[1] / sum,
      hasTabs: Boolean(tabs)
    };
  });
  if (!state.found) throw new Error('PRODUCT_DESKTOP_LAYOUT_MISSING at ' + viewport);
  const pass = state.display === 'grid'
    && state.tracks.length === 2
    && state.galleryShare >= 0.45 && state.galleryShare <= 0.50
    && state.summaryShare >= 0.50 && state.summaryShare <= 0.55
    && state.galleryRect && state.summaryRect
    && state.galleryRect.left < state.summaryRect.left
    && Math.abs(state.galleryRect.top - state.summaryRect.top) <= 4
    && (!state.descriptionRect || (state.descriptionRect.width >= state.productRect.width - 4
      && Math.abs(state.descriptionRect.left - state.productRect.left) <= 4));
  log('PRODUCT_DESKTOP_TWO_COLUMN_' + viewport, pass ? 'PASS' : 'FAIL');
  log('PRODUCT_GALLERY_WIDTH_' + viewport, Math.round((state.galleryShare || 0) * 100) + '%');
  log('PRODUCT_SUMMARY_WIDTH_' + viewport, Math.round((state.summaryShare || 0) * 100) + '%');
  log('PRODUCT_DESKTOP_GEOMETRY_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error('PRODUCT_DESKTOP_TWO_COLUMN_FAILED at ' + viewport);
}

async function accountHomeLayout(page, viewport) {
  const state = await page.evaluate(() => {
    const shell = document.querySelector('body.woocommerce-account .cr-shell');
    const home = document.querySelector('body.woocommerce-account .cr-account-home');
    const content = document.querySelector('body.woocommerce-account .woocommerce-MyAccount-content');
    if (!shell || !home) return { found: false, shell: Boolean(shell), home: Boolean(home) };
    const shellRect = shell.getBoundingClientRect();
    const homeRect = home.getBoundingClientRect();
    return {
      found: true,
      shellWidth: shellRect.width,
      homeWidth: homeRect.width,
      homeMaxWidth: getComputedStyle(home).maxWidth,
      homeRatio: homeRect.width / shellRect.width,
      contentWidth: content ? content.getBoundingClientRect().width : null
    };
  });
  if (!state.found) throw new Error('ACCOUNT_HOME_MARKUP_MISSING at ' + viewport);
  const pass = viewport >= 1280
    ? state.homeRatio >= 0.98 && state.homeMaxWidth === 'none'
    : state.homeWidth <= state.shellWidth + 1 && state.homeWidth >= Math.min(state.shellWidth, 720) - 2;
  log('ACCOUNT_HOME_USES_DESKTOP_WIDTH_' + viewport, pass ? 'PASS' : 'FAIL');
  log('ACCOUNT_HOME_GEOMETRY_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error('ACCOUNT_HOME_DESKTOP_WIDTH_FAILED at ' + viewport);
}

async function authenticatedAccountLayout(page, viewport) {
  const state = await page.evaluate(() => {
    const shell = document.querySelector('body.woocommerce-account .cr-shell');
    const account = document.querySelector('body.woocommerce-account .woocommerce');
    const nav = document.querySelector('body.woocommerce-account .woocommerce-MyAccount-navigation');
    const content = document.querySelector('body.woocommerce-account .woocommerce-MyAccount-content');
    if (!shell || !account || !nav || !content) return { found: false };
    const shellRect = shell.getBoundingClientRect();
    const accountRect = account.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      found: true,
      shellWidth: shellRect.width,
      accountWidth: accountRect.width,
      accountRatio: accountRect.width / shellRect.width,
      gridTemplateColumns: getComputedStyle(account).gridTemplateColumns,
      navWidth: navRect.width,
      contentWidth: contentRect.width,
      contentLeft: contentRect.left,
      navRight: navRect.right
    };
  });
  const pass = state.found
    && state.accountRatio >= 0.98
    && state.navWidth >= 220 && state.navWidth <= 250
    && state.contentWidth > state.shellWidth * 0.5
    && state.contentLeft >= state.navRight;
  log('ACCOUNT_AUTH_SHELL_USES_DESKTOP_WIDTH_' + viewport, pass ? 'PASS' : 'FAIL');
  log('ACCOUNT_AUTH_GEOMETRY_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error('ACCOUNT_AUTH_DESKTOP_SHELL_FAILED at ' + viewport);
}

async function accountResponsiveNavigation(page, viewport) {
  const state = await page.evaluate(() => {
    const accountNav = document.querySelector('body.woocommerce-account .woocommerce-MyAccount-navigation');
    const bottomNav = document.querySelector('.cr-mobile-bottom-nav');
    const desktopRail = document.querySelector('.cr-desktop-rail');
    return {
      accountNav: accountNav ? getComputedStyle(accountNav).display : 'MISSING',
      bottomNav: bottomNav ? getComputedStyle(bottomNav).display : 'MISSING',
      desktopRail: desktopRail ? getComputedStyle(desktopRail).display : 'MISSING'
    };
  });
  const pass = viewport < 1280
    ? state.accountNav === 'none' && state.bottomNav !== 'none' && state.desktopRail === 'none'
    : state.accountNav !== 'none' && state.bottomNav === 'none' && state.desktopRail !== 'none';
  log('ACCOUNT_NAV_MODE_' + viewport, pass ? 'PASS' : 'FAIL');
  log('ACCOUNT_NAV_STATE_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error('ACCOUNT_NAV_MODE_FAILED at ' + viewport);
}

async function accountInformationLinks(page, audience, viewport) {
  const rows = await page.evaluate(() => Array.from(
    document.querySelectorAll('body.woocommerce-account .cr-account-home__information-row')
  ).map(row => ({
    label: (row.querySelector('span:nth-child(2)')?.textContent || '').trim(),
    href: row.href || '',
    hasIcon: Boolean(row.querySelector('.cr-account-home__information-icon svg')),
    hasChevron: Boolean(row.querySelector('.cr-account-home__information-chevron'))
  })));
  const labels = rows.map(row => row.label);
  const valid = rows.length === 5
    && JSON.stringify(labels) === JSON.stringify(EXPECTED_INFORMATION_LABELS)
    && rows.every(row => row.href && /^https?:\/\//i.test(row.href) && row.hasIcon && row.hasChevron);
  log(audience + '_INFORMATION_LINKS_' + viewport, valid ? 'PASS' : 'FAIL');
  log(audience + '_INFORMATION_LINK_COUNT_' + viewport, rows.length);
  log(audience + '_INFORMATION_LINK_ORDER_' + viewport, JSON.stringify(labels));
  log(audience + '_INFORMATION_LINK_URLS_' + viewport, JSON.stringify(rows.map(row => row.href)));
  if (!valid) throw new Error(audience + '_INFORMATION_LINKS_INVALID at ' + viewport + ': ' + JSON.stringify(rows));
  return rows.map(row => ({ label: row.label, href: row.href }));
}

async function loginForAuthenticatedAccount(page) {
  await visit(page, accountUrl);
  let loginForm = page.locator('form.woocommerce-form-login');
  if (!(await loginForm.count())) {
    const loginLink = page.locator('a.cr-account-home__user--guest, a[href*="login"], a[href*="acceder"]').first();
    if (await loginLink.count()) {
      await loginLink.click();
      await page.waitForTimeout(500);
      loginForm = page.locator('form.woocommerce-form-login');
    }
  }
  if (!(await loginForm.count())) throw new Error('STAGING_LOGIN_FORM_NOT_FOUND');
  await loginForm.locator('input#username, input[name="username"]').first().fill(process.env.STAGING_ACCOUNT_EMAIL);
  await loginForm.locator('input#password, input[name="password"]').first().fill(process.env.STAGING_ACCOUNT_PASSWORD);
  await loginForm.locator('button[name="login"], button.woocommerce-form-login__submit').first().click();
  await page.waitForTimeout(1800);
  await visit(page, accountUrl);
  const loggedIn = await page.locator('body.logged-in').count();
  if (!loggedIn) throw new Error('STAGING_ACCOUNT_LOGIN_FAILED');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const overflowResults = [];
  try {
    const homeUrl = BASE_URL + '/';
    await visit(page, homeUrl);
    const productUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const candidate = links.find(link => /\/(producto|product)\//i.test(link.href))
        || links.find(link => link.closest('.cr-home-product, .woocommerce ul.products li.product'));
      return candidate ? candidate.href : '';
    });
    if (!productUrl) throw new Error('STAGING_PRODUCT_LINK_NOT_FOUND_FROM_HOME');
    log('PRODUCT_TEST_URL', productUrl);

    for (const viewport of BOTTOM_NAV_VIEWPORTS) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      await canonicalBottomNavigation(page, 'HOME', viewport);
      overflowResults.push(await checkOverflow(page, 'HOME', viewport));
    }
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      overflowResults.push(await checkOverflow(page, 'HOME', viewport));
    }

    await visit(page, productUrl);
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      if (viewport >= 1280) await productLayout(page, viewport);
      else await productStackedLayout(page, viewport);
      if (BOTTOM_NAV_VIEWPORTS.includes(viewport)) await canonicalBottomNavigation(page, 'PRODUCT', viewport);
      overflowResults.push(await checkOverflow(page, 'PRODUCT', viewport));
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    const mobile = await page.evaluate(() => {
      const product = document.querySelector('body.cr-product-detail-app .cr-main--woocommerce div.product');
      const gallery = product && product.querySelector(':scope > .woocommerce-product-gallery');
      const summary = product && product.querySelector(':scope > .summary');
      if (!product || !gallery || !summary) return { found: false };
      return {
        found: true,
        display: getComputedStyle(product).display,
        summaryDisplay: getComputedStyle(summary).display,
        productWidth: product.getBoundingClientRect().width,
        galleryWidth: gallery.getBoundingClientRect().width
      };
    });
    const mobilePass = mobile.found && mobile.display === 'flex'
      && mobile.summaryDisplay !== 'contents'
      && mobile.galleryWidth >= mobile.productWidth - 2;
    log('PRODUCT_MOBILE_UNCHANGED', mobilePass ? 'PASS' : 'FAIL');
    log('PRODUCT_MOBILE_GEOMETRY', JSON.stringify(mobile));
    if (!mobilePass) throw new Error('PRODUCT_MOBILE_GEOMETRY_CHANGED');

    await visit(page, accountUrl);
    let guestInformationLinks = null;
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      const links = await accountInformationLinks(page, 'GUEST', viewport);
      if (BOTTOM_NAV_VIEWPORTS.includes(viewport)) await canonicalBottomNavigation(page, 'ACCOUNT_GUEST', viewport);
      if (!guestInformationLinks) guestInformationLinks = links;
      else if (JSON.stringify(links) !== JSON.stringify(guestInformationLinks)) {
        throw new Error('GUEST_INFORMATION_LINKS_VARY_BY_VIEWPORT');
      }
    }
    log('GUEST_INFORMATION_LINK_COUNT', guestInformationLinks.length);
    log('INFORMATION_LINK_ORDER', 'PASS');

    for (const link of guestInformationLinks) {
      const response = await page.request.get(link.href, { timeout: 90000 });
      const finalUrl = response.url();
      if (!response.ok() || new URL(finalUrl).pathname.includes('/mi-cuenta/')) {
        throw new Error('INFORMATION_DESTINATION_NOT_PUBLIC=' + link.label + ' URL=' + link.href + ' STATUS=' + response.status() + ' FINAL=' + finalUrl);
      }
      log('INFORMATION_PUBLIC_DESTINATION_' + link.label.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase(), 'PASS');
      await visit(page, link.href);
      for (const viewport of RESPONSIVE_VIEWPORTS) {
        await page.setViewportSize({ width: viewport, height: 900 });
        await page.waitForTimeout(150);
        await canonicalPageHeader(page, 'LEGAL_' + link.label.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase(), viewport);
        if (link.label === 'Cambios y devoluciones' && BOTTOM_NAV_VIEWPORTS.includes(viewport)) {
          await canonicalBottomNavigation(page, 'CHANGES_RETURNS', viewport);
        }
        overflowResults.push(await checkOverflow(page, 'LEGAL', viewport));
      }
    }
    log('INFORMATION_DESTINATIONS_PUBLIC', 'PASS');

    await visit(page, accountUrl);
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      await accountHomeLayout(page, viewport);
      await accountTileGridLayout(page, viewport);
      overflowResults.push(await checkOverflow(page, 'ACCOUNT_HOME', viewport));
    }

    if (process.env.STAGING_ACCOUNT_EMAIL && process.env.STAGING_ACCOUNT_PASSWORD) {
      await loginForAuthenticatedAccount(page);
      let authenticatedInformationLinks = null;
      for (const viewport of RESPONSIVE_VIEWPORTS) {
        await page.setViewportSize({ width: viewport, height: 900 });
        await page.waitForTimeout(250);
        const links = await accountInformationLinks(page, 'AUTH', viewport);
        if (!authenticatedInformationLinks) authenticatedInformationLinks = links;
        else if (JSON.stringify(links) !== JSON.stringify(authenticatedInformationLinks)) {
          throw new Error('AUTH_INFORMATION_LINKS_VARY_BY_VIEWPORT');
        }
      }
      const sameLinks = JSON.stringify(authenticatedInformationLinks) === JSON.stringify(guestInformationLinks);
      log('AUTH_INFORMATION_LINK_COUNT', authenticatedInformationLinks.length);
      log('GUEST_AUTH_INFORMATION_LINKS_MATCH', sameLinks ? 'PASS' : 'FAIL');
      if (!sameLinks) throw new Error('GUEST_AUTH_INFORMATION_LINKS_DIFFER');
      for (const viewport of RESPONSIVE_VIEWPORTS) {
        await page.setViewportSize({ width: viewport, height: 900 });
        await page.waitForTimeout(250);
        if (viewport >= 1280) await authenticatedAccountLayout(page, viewport);
        await accountResponsiveNavigation(page, viewport);
        overflowResults.push(await checkOverflow(page, 'ACCOUNT_AUTH', viewport));
      }
    } else {
      log('AUTH_INFORMATION_LINKS_MATCH', 'NOT_RUN_MISSING_STAGING_ACCOUNT_CREDENTIALS');
      log('ACCOUNT_AUTH_BROWSER', 'NOT_RUN_MISSING_STAGING_ACCOUNT_CREDENTIALS');
    }

    const hasOverflow = overflowResults.some(Boolean);
    log('HORIZONTAL_OVERFLOW_DESKTOP', hasOverflow ? 'YES' : 'NO');
    log('HORIZONTAL_OVERFLOW', hasOverflow ? 'YES' : 'NO');
    if (hasOverflow) throw new Error('DESKTOP_HORIZONTAL_OVERFLOW_DETECTED');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
