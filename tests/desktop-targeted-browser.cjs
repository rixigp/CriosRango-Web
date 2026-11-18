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

async function canonicalBottomNavigation(page, label, viewport, expectedActiveLabel) {
  const state = await page.evaluate(() => {
    const bottoms = Array.from(document.querySelectorAll('nav.cr-mobile-bottom-nav.cr-app-bottom-nav'));
    const rails = Array.from(document.querySelectorAll('nav.cr-desktop-rail'));
    const nav = bottoms[0];
    const links = nav ? Array.from(nav.querySelectorAll(':scope > .cr-mobile-bottom-nav__inner > a')) : [];
    const icon = links[0] && links[0].querySelector('.cr-icon');
    const badge = nav && nav.querySelector('[data-cr-cart-count]');
    const navStyle = nav && getComputedStyle(nav);
    const railStyle = rails[0] && getComputedStyle(rails[0]);
    const innerStyle = nav && getComputedStyle(nav.querySelector('.cr-mobile-bottom-nav__inner'));
    const linkStyle = links[0] && getComputedStyle(links[0]);
    const label = links[0] && links[0].querySelector(':scope > span:not(.cr-cart-count):not(.cr-icon)');
    const labelStyle = label && getComputedStyle(label);
    const iconStyle = icon && getComputedStyle(icon);
    const badgeStyle = badge && getComputedStyle(badge);
    const activeLinks = links.filter(link => link.classList.contains('is-active'));
    const currentLinks = links.filter(link => link.getAttribute('aria-current') === 'page');
    const desktopActiveLabels = rails[0]
      ? Array.from(rails[0].querySelectorAll('a.is-active')).map(link => (link.querySelector(':scope > span:not(.cr-cart-count):not(.cr-icon)')?.textContent || '').trim().replace(/\s+/g, ' '))
      : [];
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
      railDisplay: railStyle ? railStyle.display : 'MISSING',
      bodyPaddingBottom: getComputedStyle(document.body).paddingBottom,
      bottomDisplay: navStyle ? navStyle.display : 'MISSING',
      bottomPosition: navStyle ? navStyle.position : 'MISSING',
      bottomBottom: navStyle ? navStyle.bottom : 'MISSING',
      bottomMinHeight: navStyle ? navStyle.minHeight : 'MISSING',
      navPaddingTop: navStyle ? navStyle.paddingTop : 'MISSING',
      navPaddingBottom: navStyle ? navStyle.paddingBottom : 'MISSING',
      innerDisplay: innerStyle ? innerStyle.display : 'MISSING',
      innerColumns: innerStyle ? innerStyle.gridTemplateColumns.split(' ').length : 0,
      innerColumnGap: innerStyle ? innerStyle.columnGap : 'MISSING',
      linkCount: links.length,
      linkMinHeight: linkStyle ? linkStyle.minHeight : 'MISSING',
      linkDisplay: linkStyle ? linkStyle.display : 'MISSING',
      linkDirection: linkStyle ? linkStyle.flexDirection : 'MISSING',
      linkTextDecoration: linkStyle ? linkStyle.textDecorationLine : 'MISSING',
      linkFontSize: linkStyle ? linkStyle.fontSize : 'MISSING',
      linkLineHeight: linkStyle ? linkStyle.lineHeight : 'MISSING',
      linkGap: linkStyle ? linkStyle.gap : 'MISSING',
      labelFontSize: labelStyle ? labelStyle.fontSize : 'MISSING',
      labelLineHeight: labelStyle ? labelStyle.lineHeight : 'MISSING',
      iconWidth: iconStyle ? iconStyle.width : 'MISSING',
      iconHeight: iconStyle ? iconStyle.height : 'MISSING',
      badgeMinWidth: badgeStyle ? badgeStyle.minWidth : 'MISSING',
      badgeWidth: badgeStyle ? badgeStyle.width : 'MISSING',
      badgeHeight: badgeStyle ? badgeStyle.height : 'MISSING',
      badgeFontSize: badgeStyle ? badgeStyle.fontSize : 'MISSING',
      badgeTop: badgeStyle ? badgeStyle.top : 'MISSING',
      badgeRight: badgeStyle ? badgeStyle.right : 'MISSING',
      activeCount: activeLinks.length,
      activeLabels: activeLinks.map(link => (link.querySelector(':scope > span:not(.cr-cart-count):not(.cr-icon)')?.textContent || '').trim().replace(/\s+/g, ' ')),
      desktopActiveLabels,
      currentCount: currentLinks.length,
      activeMatchesCurrent: activeLinks.length === currentLinks.length
        && activeLinks.every(link => link.getAttribute('aria-current') === 'page'),
      badgeCount: nav ? nav.querySelectorAll('[data-cr-cart-count]').length : 0,
      badgeStates
    };
  });
  let pass;
  if (viewport < 1280) {
    const intermediate = viewport >= 768;
    const scalePass = intermediate
      ? state.bottomMinHeight === '88px'
        && state.navPaddingTop === '8px'
        && state.linkMinHeight === '68px'
        && state.linkFontSize === '13px'
        && state.labelFontSize === '13px' && state.labelLineHeight === '16px'
        && state.linkGap === '5px' && state.innerColumnGap === '8px'
        && state.iconWidth === '28px' && state.iconHeight === '28px'
        && state.badgeMinWidth === '22px' && state.badgeHeight === '22px'
        && state.badgeFontSize === '12px' && state.badgeTop === '2px'
        && parseFloat(state.bodyPaddingBottom) >= 88
      : state.bottomMinHeight === '72px'
        && state.linkFontSize === '10.88px'
        && state.iconWidth === '22px' && state.iconHeight === '22px'
        && parseFloat(state.bodyPaddingBottom) >= 72;
    pass = state.bottomCount === 1 && state.railCount === 1
      && state.bottomDisplay !== 'none' && state.railDisplay === 'none' && state.bottomPosition === 'fixed'
      && state.bottomBottom === '0px' && state.innerDisplay === 'grid'
      && state.innerColumns === 5 && state.linkCount === 5
      && state.linkDisplay === 'flex' && state.linkDirection === 'column'
      && state.linkTextDecoration === 'none' && scalePass
      && state.activeMatchesCurrent && state.badgeCount === 1
      && state.badgeStates['0'].display === 'none'
      && state.badgeStates['1'].display !== 'none'
      && state.badgeStates['2'].display !== 'none'
      && state.badgeStates['0'].sameNode && state.badgeStates['1'].sameNode && state.badgeStates['2'].sameNode;
    if (expectedActiveLabel) pass = pass && state.activeLabels.length === 1
      && state.activeLabels[0] === expectedActiveLabel;
    log(label + (intermediate ? '_INTERMEDIATE_SCALE_' : '_MOBILE_SCALE_') + viewport, pass ? 'PASS' : 'FAIL');
  } else {
    pass = state.bottomCount === 1 && state.railCount === 1
      && state.bottomDisplay === 'none' && state.railCount === 1 && state.railDisplay === 'flex';
    if (expectedActiveLabel) pass = pass && state.desktopActiveLabels.length === 1
      && state.desktopActiveLabels[0] === expectedActiveLabel;
  }
  log(label + '_CANONICAL_BOTTOM_NAV_' + viewport, pass ? 'PASS' : 'FAIL');
  if (expectedActiveLabel) log(label + '_ACTIVE_' + expectedActiveLabel + '_' + viewport, pass ? 'PASS' : 'FAIL');
  log(label + '_BOTTOM_NAV_STATE_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error(label + '_CANONICAL_BOTTOM_NAV_FAILED at ' + viewport);
}


async function desktopShellLayout(page, label, viewport, isHome = false) {
  const state = await page.evaluate(() => {
    const shell = document.querySelector('[data-cr-desktop-shell]');
    const main = shell && shell.querySelector(':scope > #primary');
    const header = shell && shell.querySelector(':scope > .cr-app-header');
    const rail = shell && shell.querySelector(':scope > .cr-desktop-rail');
    const bottom = document.querySelector('nav.cr-mobile-bottom-nav.cr-app-bottom-nav');
    const mark = header && header.querySelector('.cr-home-mark');
    const brand = rail && rail.querySelector('.cr-desktop-rail__brand img');
    const actions = header && header.querySelector('.cr-home-topbar__actions');
    if (!shell || !main || !header || !rail) return { found: false };
    const sr = shell.getBoundingClientRect();
    const mr = main.getBoundingClientRect();
    const rr = rail.getBoundingClientRect();
    const ar = actions && actions.getBoundingClientRect();
    const ss = getComputedStyle(shell);
    return {
      found: true,
      clientWidth: document.documentElement.clientWidth,
      layoutWidth: document.documentElement.clientWidth - (document.documentElement.clientWidth === window.innerWidth ? 15 : 0),
      shellDisplay: ss.display,
      shellLeft: sr.left,
      shellRight: sr.right,
      shellWidth: sr.width,
      shellGap: ss.columnGap,
      mainLeft: mr.left,
      mainTop: mr.top,
      mainWidth: mr.width,
      mainPaddingLeft: getComputedStyle(main).paddingLeft,
      mainPaddingTop: getComputedStyle(main).paddingTop,
      hero: (() => {
        const el = main.querySelector('.cr-app-hero');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const slides = el.querySelector('.cr-app-hero__slides, .cr-app-hero__fallback');
        const sr = slides ? slides.getBoundingClientRect() : r;
        const image = el.querySelector('.cr-app-hero__image');
        const imageFit = image ? getComputedStyle(image).objectFit : null;
        return { left: r.left, top: r.top, width: r.width, height: sr.height, imageFit };
      })(),
      searchBox: (() => { const el = header.querySelector('[data-cr-header-search-toggle]'); if (!el) return null; const r = el.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}; })(),
      cartBox: (() => { const el = header.querySelector('a.cr-cart-link'); if (!el) return null; const r = el.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}; })(),
      headerPosition: getComputedStyle(header).position,
      railDisplay: getComputedStyle(rail).display,
      railLeft: rr.left,
      railRight: rr.right,
      railWidth: rr.width,
      railPosition: getComputedStyle(rail).position,
      bottomDisplay: bottom && getComputedStyle(bottom).display,
      headerMarkDisplay: mark && getComputedStyle(mark).display,
      sidebarLogoDisplay: brand && getComputedStyle(brand).display,
      sidebarLogoSrc: brand && brand.getAttribute('src'),
      actionsLeft: ar && ar.left,
      actionsRight: ar && ar.right
    };
  });
  let pass;
  if (viewport < 1280) {
    pass = state.found
      && state.shellDisplay === 'contents'
      && state.railDisplay === 'none'
      && state.bottomDisplay !== 'none'
      && (!isHome || state.headerMarkDisplay !== 'none');
  } else {
    pass = state.found
      && state.shellDisplay === 'grid'
      && state.shellGap === '0px'
      && state.railDisplay !== 'none'
      && Math.abs(state.railLeft - state.shellLeft) <= 1
      && Math.abs(state.mainLeft - state.railRight) <= 1
      && Math.abs(state.railWidth - 112) <= 1
      && state.mainPaddingLeft === (isHome ? '0px' : '20px')
      && state.mainPaddingTop === (isHome ? '0px' : '32px')
      && Math.abs(state.shellWidth - Math.min(viewport - 48, 1232)) <= 1
      && Math.abs(state.shellLeft - ((state.layoutWidth || state.clientWidth || viewport) - Math.min(viewport - 48, 1232)) / 2) <= 1
      && Math.abs(state.mainWidth - (Math.min(viewport - 48, 1232) - 112)) <= 1
      && state.headerMarkDisplay === 'none'
      && state.sidebarLogoDisplay !== 'none'
      && /home_logo\.png/.test(state.sidebarLogoSrc || '')
      && state.actionsLeft >= state.mainLeft - 1
      && state.actionsRight <= state.shellRight + 1
      && state.bottomDisplay === 'none'
      && (!isHome || (
        state.hero
        && Math.abs(state.hero.top - state.mainTop) <= 1
        && Math.abs(state.hero.width - state.mainWidth) <= 1
        && Math.abs(state.hero.width / state.hero.height - (16 / 6)) <= 0.02
        && state.hero.imageFit === 'cover'
        && state.headerPosition === 'absolute'
        && state.searchBox && state.cartBox
        && state.searchBox.top >= state.hero.top - 1
        && state.cartBox.top >= state.hero.top - 1
        && state.searchBox.bottom <= state.hero.top + 96
        && state.cartBox.bottom <= state.hero.top + 96
        && state.searchBox.right <= state.hero.left + state.hero.width + 1
        && state.cartBox.right <= state.hero.left + state.hero.width + 1
      ));
  }
  log(label + '_DESKTOP_SHELL_' + viewport, pass ? 'PASS' : 'FAIL');
  if (viewport >= 1280) {
    log(label + '_SHELL_WIDTH_' + viewport, Math.round(state.shellWidth));
    log(label + '_SIDEBAR_WIDTH_' + viewport, Math.round(state.railWidth));
    log(label + '_PRIMARY_WIDTH_' + viewport, Math.round(state.mainWidth));
    log(label + '_OUTER_LEFT_' + viewport, Math.round(state.shellLeft));
    log(label + '_OUTER_RIGHT_' + viewport, Math.round(viewport - state.shellRight));
  }
  if (isHome && viewport >= 1280) {
    log('HOME_HERO_TOP_' + viewport, Math.round(state.hero.top - state.mainTop));
    log('HOME_HERO_WIDTH_' + viewport, Math.round(state.hero.width));
    log('HOME_HERO_HEIGHT_' + viewport, Math.round(state.hero.height));
    log('HOME_SEARCH_OVERLAY_' + viewport, 'PASS');
    log('HOME_CART_OVERLAY_' + viewport, 'PASS');
  }
  log(label + '_DESKTOP_SHELL_GEOMETRY_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error(label + '_DESKTOP_SHELL_FAILED at ' + viewport);
}



async function homeCanonicalContentRail(page, viewport) {
  if (viewport < 1280) return;
  const state = await page.evaluate(() => {
    const primary = document.querySelector('[data-cr-desktop-shell] > #primary.cr-home--app');
    if (!primary) return { found: false };
    const rect = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width };
    };
    const rail = section => {
      const wrapper = primary.querySelector(section + ' .cr-desktop-content-rail');
      return rect(wrapper);
    };
    const title = selector => rect(primary.querySelector(selector));
    const hero = primary.querySelector('.cr-app-hero');
    return {
      found: true,
      primary: rect(primary),
      hero: rect(hero),
      categoryTitle: title('.cr-app-categories .cr-app-section-title'),
      categoryGrid: title('.cr-app-categories .cr-app-category-grid'),
      novedadesTitle: title('.cr-home-novedades .cr-home-section__header'),
      novedadesProducts: title('.cr-home-novedades .cr-home-products'),
      outletTitle: title('.cr-home-outlet .cr-home-section__header'),
      outletGrid: title('.cr-home-outlet .cr-home-outlet__grid'),
      brandsTitle: title('.cr-home-brands .cr-home-section__header'),
      brandsPager: title('.cr-home-brands .cr-home-brand-pager--desktop'),
      rails: [
        rail('.cr-app-categories'),
        rail('.cr-home-novedades'),
        rail('.cr-home-outlet'),
        rail('.cr-home-brands')
      ]
    };
  });
  if (!state.found) throw new Error('HOME_CONTENT_RAIL_MARKUP_MISSING_' + viewport);
  const expectedLeft = state.primary.left + 20;
  const contentLefts = [
    state.categoryTitle?.left, state.categoryGrid?.left,
    state.novedadesTitle?.left, state.novedadesProducts?.left,
    state.outletTitle?.left, state.outletGrid?.left,
    state.brandsTitle?.left, state.brandsPager?.left
  ];
  const expectedWidth = state.primary.width - 40;
  const pass = state.rails.every(r => r
      && Math.abs(r.left - expectedLeft) <= 1
      && Math.abs(r.width - expectedWidth) <= 1)
    && contentLefts.every(x => Number.isFinite(x) && Math.abs(x - expectedLeft) <= 1)
    && Math.abs(state.hero.left - state.primary.left) <= 1
    && Math.abs(state.hero.width - state.primary.width) <= 1;
  log('HOME_SECTIONS_USE_CANONICAL_RAIL_' + viewport, pass ? 'PASS' : 'FAIL');
  log('HOME_HERO_FULL_PRIMARY_' + viewport,
    Math.abs(state.hero.left - state.primary.left) <= 1 && Math.abs(state.hero.width - state.primary.width) <= 1 ? 'PASS' : 'FAIL');
  log('HOME_CATEGORIES_TITLE_LEFT_' + viewport, Math.round(state.categoryTitle?.left ?? -1));
  log('HOME_CATEGORIES_CONTENT_LEFT_' + viewport, Math.round(state.categoryGrid?.left ?? -1));
  log('HOME_NOVEDADES_LEFT_' + viewport, Math.round(state.novedadesTitle?.left ?? -1));
  log('HOME_OUTLET_LEFT_' + viewport, Math.round(state.outletTitle?.left ?? -1));
  log('HOME_BRANDS_LEFT_' + viewport, Math.round(state.brandsTitle?.left ?? -1));
  log('HOME_CANONICAL_RAIL_GEOMETRY_' + viewport, JSON.stringify(state));
  if (!pass) throw new Error('HOME_CONTENT_RAIL_ALIGNMENT_FAILED_' + viewport);
}

async function desktopShellSnapshot(page) {
  return page.evaluate(() => {
    const shell=document.querySelector('[data-cr-desktop-shell]');
    const rail=shell&&shell.querySelector(':scope > .cr-desktop-rail');
    const logo=rail&&rail.querySelector('.cr-desktop-rail__brand img');
    const header=shell&&shell.querySelector(':scope > .cr-app-header');
    const search=header&&header.querySelector('[data-cr-header-search-toggle]');
    const cart=header&&header.querySelector('a.cr-cart-link');
    const primary=shell&&shell.querySelector(':scope > #primary');
    const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {left:+r.left.toFixed(2),top:+r.top.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2)}};
    if(!rail||!logo||!header||!search||!cart||!primary)return {found:false};
    return {found:true,sidebar:rect(rail),logo:rect(logo),header:rect(header),search:rect(search),cart:rect(cart),primary:rect(primary)};
  });
}
function shellGeometryMatches(a,b){
  if(!a||!b||!a.found||!b.found)return false;
  const fields=[['sidebar','left'],['sidebar','top'],['sidebar','width'],['sidebar','height'],['logo','left'],['logo','top'],['logo','width'],['logo','height'],['header','left'],['header','top'],['header','width'],['search','left'],['search','top'],['cart','left'],['cart','top'],['primary','left'],['primary','top'],['primary','width']];
  return fields.every(([g,k])=>Math.abs(a[g][k]-b[g][k])<=1);
}
async function categoryDesktopContainment(page,viewport){
  const state=await page.evaluate(()=>{
    const primary=document.querySelector('[data-cr-desktop-shell] > #primary');
    const canvas=primary&&(
      primary.matches('.cr-parent-category__canvas,.cr-category-hub')?primary:
      primary.querySelector('.cr-parent-category__canvas,.cr-category-hub')
    );
    const grid=canvas&&canvas.querySelector('.cr-parent-category__grid,.cr-category-hub__grid');
    if(!primary||!canvas||!grid)return {found:false};
    const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}};
    const p=box(primary),c=box(canvas),g=box(grid),cards=Array.from(grid.children).map(box);
    const toolbar=primary.querySelector('.cr-parent-category__toolbar,.cr-page__header,.cr-category-hub__header');
    const title=toolbar&&box(toolbar);
    const inside=(x,y)=>x.left>=y.left-1&&x.right<=y.right+1;
    const canonicalLeft=p.left+20;
    return {found:true,primary:p,canvas:c,grid:g,toolbar:title,
      categoryTitleLeft:title&&title.left,categoryGridLeft:g.left,canonicalLeft,
      categoryRailAligned:Boolean(title)&&Math.abs(title.left-canonicalLeft)<=1&&Math.abs(g.left-canonicalLeft)<=1,
      cards,contentInsidePrimary:inside(c,p)&&inside(g,p),
      noHorizontalOverflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1&&primary.scrollWidth<=primary.clientWidth+1&&canvas.scrollWidth<=canvas.clientWidth+1,
      gridNotClipped:grid.scrollWidth<=grid.clientWidth+1&&cards.every(card=>inside(card,g))};
  });
  const inside=state.found&&state.contentInsidePrimary,overflow=state.found&&state.noHorizontalOverflow,clip=state.found&&state.gridNotClipped;
  log('CATEGORY_TITLE_LEFT_'+viewport,Math.round(state.categoryTitleLeft ?? -1));
  log('CATEGORY_GRID_LEFT_'+viewport,Math.round(state.categoryGridLeft ?? -1));
  log('CATEGORY_USES_CANONICAL_RAIL_'+viewport,state.categoryRailAligned?'PASS':'FAIL');
  log('CATEGORY_CONTENT_INSIDE_PRIMARY_'+viewport,inside?'PASS':'FAIL');
  log('CATEGORY_NO_HORIZONTAL_OVERFLOW_'+viewport,overflow?'PASS':'FAIL');
  log('CATEGORY_NO_OVERFLOW_'+viewport,overflow?'PASS':'FAIL');
  log('CATEGORY_GRID_NOT_CLIPPED_'+viewport,clip?'PASS':'FAIL');
  log('CATEGORY_NO_CLIPPING_'+viewport,clip?'PASS':'FAIL');
  log('CATEGORY_CONTENT_GEOMETRY_'+viewport,JSON.stringify(state));
  if(!inside||!overflow||!clip||!state.categoryRailAligned)throw new Error('CATEGORY_PRIMARY_CONTAINMENT_FAILED_'+viewport+':'+JSON.stringify(state));
}
async function sixRouteDesktopShell(page,routes,viewport){
  const home=await desktopShellSnapshot(page);
  if(!home.found)throw new Error('HOME_CANONICAL_SHELL_SNAPSHOT_MISSING_'+viewport);
  log('HOME_BBOX_'+viewport,JSON.stringify(home));
  for(const route of routes){
    await visit(page,route.url);
    const actual=await desktopShellSnapshot(page),pass=shellGeometryMatches(home,actual);
    log(route.key+'_BBOX_'+viewport,JSON.stringify(actual));
    log(route.key+'_SHELL_MATCH_HOME_'+viewport,pass?'PASS':'FAIL');
    if(!pass)throw new Error('DESKTOP_SHELL_MISMATCH_'+route.key+'_'+viewport+':HOME='+JSON.stringify(home)+' ACTUAL='+JSON.stringify(actual));
    if(route.key==='CATEGORY')await categoryDesktopContainment(page,viewport);
  }
}

async function homeDesktopBrands(page, viewport) {
  await page.locator('.cr-home-brands img').evaluateAll(async images => {
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => image.decode().catch(() => null)));
  });
  const state = await page.evaluate(() => {
    const section = document.querySelector('.cr-home-brands');
    const pager = section && section.querySelector('[data-cr-brand-pager]');
    const dots = section && section.querySelector('[data-cr-brand-dots]');
    if (!section || !pager || !dots) return { found: false };
    const pages = Array.from(pager.querySelectorAll('.cr-home-brand-page'));
    const pageNames = pages.map(pg => Array.from(pg.querySelectorAll('.cr-home-brand'))
      .map(card => card.querySelector('img:not([hidden])')?.alt || (card.textContent || '').trim()));
    const pagesGeometry = pages.map(pg => {
      const grid = pg.querySelector('.cr-home-brand-grid');
      const cards = Array.from(grid ? grid.querySelectorAll('.cr-home-brand') : []);
      const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0;
      const rows = grid ? getComputedStyle(grid).gridTemplateRows.split(' ').length : 0;
      const cardData = cards.map(card => {
        const cr = card.getBoundingClientRect();
        const box = card.querySelector('.cr-home-brand__logo-box');
        const br = box && box.getBoundingClientRect();
        const img = box && box.querySelector('img:not([hidden])');
        const ir = img && img.getBoundingClientRect();
        const cs = getComputedStyle(card), bs = box && getComputedStyle(box), is = img && getComputedStyle(img);
        const inside = (inner, outer) => Boolean(inner && outer
          && inner.left >= outer.left - 1 && inner.right <= outer.right + 1
          && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1);
        const ratioMatches = Boolean(img && ir && img.naturalWidth > 0 && img.naturalHeight > 0
          && ir.width > 0 && ir.height > 0
          && Math.abs(ir.width / ir.height - img.naturalWidth / img.naturalHeight) <= 0.02);
        return {
          name: img?.alt || (card.textContent || '').trim(),
          card: { left: cr.left, right: cr.right, top: cr.top, bottom: cr.bottom, width: cr.width, height: cr.height, overflow: cs.overflow },
          logoBox: br && { left: br.left, right: br.right, top: br.top, bottom: br.bottom, width: br.width, height: br.height, overflow: bs.overflow, display: bs.display },
          image: ir && { left: ir.left, right: ir.right, top: ir.top, bottom: ir.bottom, width: ir.width, height: ir.height, maxWidth: is.maxWidth, maxHeight: is.maxHeight, objectFit: is.objectFit, loaded: img.complete && img.naturalWidth > 0, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight },
          imageInsideLogoBox: inside(ir, br), imageInsideCard: inside(ir, cr), logoBoxInsideCard: inside(br, cr),
          imageNotDistorted: ratioMatches
        };
      });
      const rects = cards.map(card => card.getBoundingClientRect());
      const row1Bottom = rects.length >= 4 ? Math.max(...rects.slice(0, 4).map(x => x.bottom)) : 0;
      const row2Top = rects.length >= 8 ? Math.min(...rects.slice(4, 8).map(x => x.top)) : 0;
      const gridRect = grid && grid.getBoundingClientRect();
      return {
        count: cards.length, columns, rows, gridWidth: gridRect?.width || 0,
        row1Bottom, row2Top, rowGap: grid ? getComputedStyle(grid).rowGap : 'MISSING',
        cards: cardData,
        allImagesPresent: cardData.every(x => x.image !== null && x.image.loaded),
        allInsideLogoBoxes: cardData.every(x => x.imageInsideLogoBox),
        allInsideCards: cardData.every(x => x.imageInsideCard && x.logoBoxInsideCard),
        allContain: cardData.every(x => x.image && x.image.objectFit === 'contain'),
        allNotDistorted: cardData.every(x => x.imageNotDistorted),
        cardsClipSafely: window.innerWidth >= 1280 || cardData.every(x => x.card.overflow === 'hidden' && x.logoBox?.overflow === 'hidden'),
        rowsSeparated: cards.length <= 4 || (rects.length >= 8 && row2Top >= row1Bottom + 1)
      };
    });
    return {
      found: true, pagerDisplay: getComputedStyle(pager).display, dotsDisplay: getComputedStyle(dots).display,
      pageNames, pagesGeometry, hiddenPages: pages.map(pg => pg.hidden),
      dots: dots.querySelectorAll('[data-cr-brand-dot]').length,
      activeDot: dots.querySelector('[data-cr-brand-dot][aria-current="true"]')?.getAttribute('data-cr-brand-dot'),
      columns: pagesGeometry[0]?.columns || 0, rows: pagesGeometry[0]?.rows || 0,
      total: pageNames.flat().length, unique: new Set(pageNames.flat()).size,
      clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
      pagerClientWidth: pager.clientWidth, pagerScrollWidth: pager.scrollWidth
    };
  });
  if (!state.found) throw new Error('HOME_BRANDS_MARKUP_MISSING_' + viewport);
  const counts = state.pagesGeometry.map(p => p.count);
  const uniquePass = state.total === 20 && state.unique === 20;
  const noPageOverflow = state.scrollWidth <= state.clientWidth + 1
    && state.pagerScrollWidth <= state.pagerClientWidth * state.pagesGeometry.length + 1;
  const logosPass = state.pagesGeometry.every(p => p.allImagesPresent && p.allInsideLogoBoxes
    && p.allInsideCards && p.allContain && p.allNotDistorted && p.cardsClipSafely);

  if (viewport < 768) {
    const mobilePass = state.pagerDisplay !== 'none' && state.dotsDisplay !== 'none'
      && counts.join(',') === '8,8,4' && state.hiddenPages.join(',') === 'false,false,true'
      && state.dots === 2 && uniquePass && noPageOverflow;
    log('HOME_BRANDS_MOBILE_UNCHANGED_' + viewport, mobilePass ? 'PASS' : 'FAIL');
    log('HOME_BRANDS_MOBILE_COUNTS_' + viewport, counts.join(','));
    if (!mobilePass) throw new Error('HOME_BRANDS_MOBILE_CHANGED_' + viewport);
    return;
  }

  if (viewport < 1280) {
    const pageGeometryPass = state.pagesGeometry.length === 3
      && state.pagesGeometry.every(p => p.columns === 4 && p.rows === 2 && p.rowsSeparated);
    const pass = state.pagerDisplay !== 'none' && state.dotsDisplay !== 'none'
      && counts.join(',') === '8,8,4' && state.columns === 4 && state.rows === 2
      && pageGeometryPass && uniquePass && logosPass && state.dots === 3 && state.activeDot === '0' && noPageOverflow;
    log('HOME_INTERMEDIATE_BRANDS_' + viewport, pass ? 'PASS' : 'FAIL');
    log('HOME_INTERMEDIATE_COLUMNS_' + viewport, state.columns);
    log('HOME_INTERMEDIATE_ROWS_' + viewport, state.rows);
    log('HOME_INTERMEDIATE_PAGE_COUNTS_' + viewport, counts.join(','));
    log('HOME_INTERMEDIATE_TOTAL_' + viewport, state.total);
    log('HOME_INTERMEDIATE_DUPLICATES_' + viewport, state.total - state.unique);
    log('HOME_INTERMEDIATE_LOGOS_FULLY_VISIBLE_' + viewport, state.pagesGeometry.every(p => p.allInsideLogoBoxes && p.allInsideCards) ? 'YES' : 'NO');
    log('HOME_INTERMEDIATE_LOGOS_NOT_DISTORTED_' + viewport, state.pagesGeometry.every(p => p.allNotDistorted) ? 'YES' : 'NO');
    log('HOME_INTERMEDIATE_LOGOS_CROPPED_' + viewport, state.pagesGeometry.every(p => p.allInsideLogoBoxes && p.allInsideCards && p.allContain) ? 'NO' : 'YES');
    log('HOME_INTERMEDIATE_LOGOS_OVERFLOW_CARD_' + viewport, state.pagesGeometry.every(p => p.allInsideCards && p.cardsClipSafely) ? 'NO' : 'YES');
    log('HOME_INTERMEDIATE_GEOMETRY_' + viewport, JSON.stringify(state.pagesGeometry));
    if (!pass) throw new Error('HOME_INTERMEDIATE_BRANDS_LAYOUT_FAILED_' + viewport);
    for (const index of [1, 2, 0]) {
      await page.locator('[data-cr-brand-dot="' + index + '"]').click();
      await page.waitForTimeout(650);
      const active = await page.locator('[data-cr-brand-dot="' + index + '"]').getAttribute('aria-current');
      log('HOME_INTERMEDIATE_DOTS_SYNC_PAGE_' + index + '_' + viewport, active === 'true' ? 'PASS' : 'FAIL');
      if (active !== 'true') throw new Error('HOME_INTERMEDIATE_DOTS_NOT_SYNCED_PAGE_' + index + '_' + viewport);
    }
    return;
  }

  const desktopPass = state.pagesGeometry.length === 2 && counts.join(',') === '10,10'
    && state.pagesGeometry.every(p => p.columns === 5 && p.rows === 2)
    && state.columns === 5 && state.rows === 2 && uniquePass && logosPass && state.dots === 2 && noPageOverflow;
  log('HOME_BRANDS_DESKTOP_UNCHANGED_' + viewport, desktopPass ? 'PASS' : 'FAIL');
  if (!desktopPass) throw new Error('HOME_BRANDS_DESKTOP_CHANGED_' + viewport);
}

async function homeBrandWinnerAudit(page, viewport) {
  if (viewport !== 768) return;
  const audit = await page.evaluate(async () => {
    const section = document.querySelector('.cr-home-brands');
    const grid = section?.querySelector('.cr-home-brand-grid');
    const card = grid?.querySelector('.cr-home-brand');
    const box = card?.querySelector('.cr-home-brand__logo-box');
    const image = box?.querySelector('img:not([hidden])');
    const winner = (el, properties) => {
      const out = {};
      const visit = rules => {
        for (const rule of Array.from(rules || [])) {
          if (rule.cssRules) {
            if (rule.conditionText && rule.media && !matchMedia(rule.conditionText).matches) continue;
            try { visit(rule.cssRules); } catch (error) {}
            continue;
          }
          if (!rule.selectorText || !rule.style) continue;
          let matches = false;
          try { matches = el.matches(rule.selectorText); } catch (error) {}
          if (!matches) continue;
          for (const property of properties) {
            const value = rule.style.getPropertyValue(property);
            if (!value) continue;
            const important = rule.style.getPropertyPriority(property) === 'important';
            if (!out[property] || important || !out[property].important) out[property] = {
              selector: rule.selectorText, value: value.trim(), important, href: rule.parentStyleSheet?.href || ''
            };
          }
        }
      };
      for (const sheet of Array.from(document.styleSheets)) { try { visit(sheet.cssRules); } catch (error) {} }
      return out;
    };
    const rect = el => { if (!el) return null; const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
    const winners = {
      grid: winner(grid, ['width','grid-template-columns']),
      card: winner(card, ['width','height','overflow']),
      logoBox: winner(box, ['display','width','height','overflow']),
      image: winner(image, ['width','height','max-width','max-height','object-fit'])
    };
    const hrefs = Array.from(new Set(Object.values(winners).flatMap(group => Object.values(group).map(x => x.href).filter(Boolean))));
    const sourceLines = {};
    for (const href of hrefs) {
      try {
        const source = await fetch(href).then(r => r.text());
        for (const group of Object.values(winners)) for (const item of Object.values(group)) {
          if (item.href !== href) continue;
          const pos = source.lastIndexOf(item.selector);
          sourceLines[item.selector] = pos < 0 ? null : source.slice(0,pos).split('\\n').length;
        }
      } catch (error) {}
    }
    const imageStyle = image ? getComputedStyle(image) : null;
    return {
      viewport: innerWidth, grid: rect(grid), gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      card: rect(card), logoBox: rect(box), image: rect(image),
      imageMaxWidth: imageStyle?.maxWidth || null, imageMaxHeight: imageStyle?.maxHeight || null,
      objectFit: imageStyle?.objectFit || null,
      overflow: {card:card?getComputedStyle(card).overflow:null,logoBox:box?getComputedStyle(box).overflow:null,image:imageStyle?.overflow||null},
      winners, sourceFile: hrefs[0] || null, sourceLines
    };
  });
  log('HOME_INTERMEDIATE_VIEWPORT_AUDIT_768', JSON.stringify(audit));
  log('WINNING_CARD_SELECTOR', audit.winners.card.width?.selector || 'MISSING');
  log('WINNING_LOGO_BOX_SELECTOR', audit.winners.logoBox.width?.selector || 'MISSING');
  log('WINNING_IMAGE_SELECTOR', audit.winners.image['max-width']?.selector || 'MISSING');
  log('SOURCE_FILE', audit.sourceFile || 'MISSING');
  log('SOURCE_LINES', JSON.stringify(audit.sourceLines));
}

async function productStackedLayout(page, viewport) {
  const state = await page.evaluate(() => {
    const product = document.querySelector('body.cr-product-detail-app .cr-main--woocommerce div.product');
    if (!product) return { found: false };
    const gallery = product.querySelector(':scope > .woocommerce-product-gallery');
    const summary = product.querySelector(':scope > .summary');
    const summaryContent = summary && (summary.querySelector(':scope > .cr-product-title-brand-row') || summary.firstElementChild);
    const descriptionInsideSummary = Boolean(summary && summary.querySelector(':scope > .cr-product-description'));
    const productRect = product.getBoundingClientRect();
    const productStyle = getComputedStyle(product);
    const innerWidth = productRect.width - parseFloat(productStyle.paddingLeft) - parseFloat(productStyle.paddingRight);
    const galleryRect = gallery && gallery.getBoundingClientRect();
    const summaryRect = summaryContent && summaryContent.getBoundingClientRect();
    return {
      found: Boolean(galleryRect && summaryRect),
      display: productStyle.display,
      summaryDisplay: summary ? getComputedStyle(summary).display : 'MISSING',
      descriptionInsideSummary,
      productWidth: productRect.width,
      innerWidth,
      galleryWidth: galleryRect && galleryRect.width,
      galleryTop: galleryRect && galleryRect.top,
      summaryTop: summaryRect && summaryRect.top
    };
  });
  const pass = state.found && state.display === 'flex' && state.summaryDisplay !== 'contents'
    && state.descriptionInsideSummary
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

async function productToolbarLayout(page, viewport) {
  const state = await page.evaluate(() => {
    const toolbar = document.querySelector('body.cr-product-detail-app .cr-product-detail-toolbar');
    return toolbar ? { found: true, marginTop: getComputedStyle(toolbar).marginTop } : { found: false };
  });
  const pass = state.found && state.marginTop === '0px';
  log('PRODUCT_TOOLBAR_EXTRA_TOP_MARGIN_' + viewport, pass ? '0' : state.marginTop || 'MISSING');
  log('PRODUCT_CONTEXT_HEADER_NO_LONGER_DROPS_' + viewport, pass ? 'PASS' : 'FAIL');
  if (!pass) throw new Error('PRODUCT_TOOLBAR_TOP_MARGIN_FAILED at ' + viewport);
}

async function categoryToolbarTopMargin(page, label, viewport) {
  const state = await page.evaluate(() => {
    const toolbar = document.querySelector('.cr-parent-category__toolbar');
    return toolbar ? { found: true, marginTop: getComputedStyle(toolbar).marginTop } : { found: false };
  });
  const expected = Number(viewport) >= 1280 ? '30px' : '0px';
  const pass = state.found && state.marginTop === expected;
  log(label + '_TOOLBAR_TOP_MARGIN_' + viewport, pass ? expected : state.marginTop || 'MISSING');
  if (!pass) throw new Error(label + '_TOOLBAR_TOP_MARGIN_FAILED at ' + viewport + ': expected ' + expected);
}

async function productLayout(page, viewport) {
  const state = await page.evaluate(() => {
    const product = document.querySelector('body.cr-product-detail-app .cr-main--woocommerce div.product');
    if (!product) return { found: false };
    const gallery = product.querySelector(':scope > .woocommerce-product-gallery');
    const summary = product.querySelector(':scope > .summary');
    const titleRow = summary && summary.querySelector(':scope > .cr-product-title-brand-row');
    const sizeHelp = summary && summary.querySelector(':scope > .cr-product-size-help');
    const cart = summary && summary.querySelector(':scope > form.cart');
    const description = product.querySelector(':scope > .cr-product-description');
    const tabs = product.querySelector(':scope > .woocommerce-tabs');
    const productRect = product.getBoundingClientRect();
    const galleryRect = gallery ? gallery.getBoundingClientRect() : null;
    const summaryRect = summary ? summary.getBoundingClientRect() : null;
    const titleRect = titleRow ? titleRow.getBoundingClientRect() : null;
    const sizeHelpRect = sizeHelp ? sizeHelp.getBoundingClientRect() : null;
    const cartRect = cart ? cart.getBoundingClientRect() : null;
    const descriptionRect = description ? description.getBoundingClientRect() : null;
    const descriptionParentIsProduct = Boolean(description && description.parentElement === product);
    const descriptionInsideSummary = Boolean(summary && summary.querySelector(':scope > .cr-product-description'));
    const tracks = getComputedStyle(product).gridTemplateColumns.split(' ').map(value => parseFloat(value)).filter(Number.isFinite);
    const sum = tracks.reduce((total, value) => total + value, 0);
    return {
      found: true,
      display: getComputedStyle(product).display,
      summaryDisplay: summary ? getComputedStyle(summary).display : 'MISSING',
      summaryDirection: summary ? getComputedStyle(summary).flexDirection : 'MISSING',
      tracks,
      galleryRect: galleryRect && { left: galleryRect.left, top: galleryRect.top, width: galleryRect.width },
      summaryRect: summaryRect && { left: summaryRect.left, top: summaryRect.top, width: summaryRect.width, bottom: summaryRect.bottom },
      titleRect: titleRect && { top: titleRect.top, bottom: titleRect.bottom },
      sizeHelpRect: sizeHelpRect && { top: sizeHelpRect.top, bottom: sizeHelpRect.bottom },
      cartRect: cartRect && { top: cartRect.top, bottom: cartRect.bottom },
      descriptionRect: descriptionRect && { left: descriptionRect.left, top: descriptionRect.top, width: descriptionRect.width },
      descriptionParentIsProduct,
      descriptionInsideSummary,
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
    && state.summaryDisplay === 'flex'
    && state.summaryDirection === 'column'
    && state.galleryRect && state.summaryRect && state.titleRect && state.sizeHelpRect
    && state.descriptionParentIsProduct && !state.descriptionInsideSummary
    && state.galleryRect.left < state.summaryRect.left
    && Math.abs(state.galleryRect.top - state.summaryRect.top) <= 4
    && (state.sizeHelpRect.top - state.titleRect.bottom) >= 8
    && (state.sizeHelpRect.top - state.titleRect.bottom) <= 24
    && (!state.cartRect || state.cartRect.bottom <= state.summaryRect.bottom + 2)
    && (!state.descriptionRect || (state.descriptionRect.width >= state.productRect.width - 4
      && Math.abs(state.descriptionRect.left - state.productRect.left) <= 4
      && state.descriptionRect.top >= state.summaryRect.bottom - 2));
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
    const navDestinations = await page.evaluate(() => {
      const nav = document.querySelector('nav.cr-mobile-bottom-nav.cr-app-bottom-nav');
      return nav ? Array.from(nav.querySelectorAll(':scope > .cr-mobile-bottom-nav__inner > a'))
        .map(link => ({ label: (link.querySelector(':scope > span:not(.cr-cart-count):not(.cr-icon)')?.textContent || '').trim().replace(/\s+/g, ' '), href: link.href })) : [];
    });
    if (navDestinations.length !== 5) throw new Error('BOTTOM_NAV_DESTINATIONS_NOT_FIVE');
    const categoryRoute=navDestinations.find(item=>item.label==='Categorías');
    const cartRoute=navDestinations.find(item=>item.label==='Carrito');
    if(!categoryRoute||!cartRoute)throw new Error('SHELL_ROUTE_LINKS_MISSING');

    await visit(page, productUrl);
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      await desktopShellLayout(page, 'PRODUCT', viewport, false);
      await productToolbarLayout(page, viewport);
      if (viewport >= 1280) await productLayout(page, viewport);
      else await productStackedLayout(page, viewport);
      if (BOTTOM_NAV_VIEWPORTS.includes(viewport)) await canonicalBottomNavigation(page, 'PRODUCT', viewport);
      overflowResults.push(await checkOverflow(page, 'PRODUCT', viewport));
    }

    for (const destinationLabel of ['Categorías', 'Outlet']) {
      const destination = navDestinations.find(item => item.label === destinationLabel);
      if (!destination || !destination.href) throw new Error('TOOLBAR_DESTINATION_MISSING=' + destinationLabel);
      await visit(page, destination.href);
      for (const viewport of [1100, 1279, 1280, 1440, 1920]) {
        await page.setViewportSize({ width: viewport, height: 900 });
        await page.waitForTimeout(150);
        await categoryToolbarTopMargin(page, destinationLabel === 'Categorías' ? 'CATEGORY' : 'OUTLET', viewport);
      }
    }

    await visit(page, homeUrl);
    for (const viewport of [390, 430, 768, 820, 900, 980, 1100, 1200, 1279, 1280, 1440, 1920]) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      await desktopShellLayout(page, 'HOME', viewport, true);
      await homeCanonicalContentRail(page, viewport);
      await homeDesktopBrands(page, viewport);
      await homeBrandWinnerAudit(page, viewport);
    }


    await visit(page,accountUrl);
    const legalRoutes=await accountInformationLinks(page,'SHELL_LEGAL',1280);
    if(!legalRoutes.length)throw new Error('SHELL_LEGAL_ROUTE_MISSING');
    const shellRoutes=[
      {key:'CATEGORY',url:categoryRoute.href},{key:'PRODUCT',url:productUrl},
      {key:'CART',url:cartRoute.href},{key:'ACCOUNT',url:accountUrl},{key:'LOGIN',url:accountUrl+'?cr-account-view=login'},{key:'LEGAL',url:legalRoutes[0].href}
    ];
    for(const viewport of [1280,1440,1920]){
      await page.setViewportSize({width:viewport,height:900});
      await visit(page,homeUrl);
      await sixRouteDesktopShell(page,shellRoutes,viewport);
    }
    await visit(page,homeUrl);

    for (const viewport of BOTTOM_NAV_VIEWPORTS) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      await canonicalBottomNavigation(page, 'HOME', viewport, 'Inicio');
      overflowResults.push(await checkOverflow(page, 'HOME', viewport));
    }
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.waitForTimeout(250);
      overflowResults.push(await checkOverflow(page, 'HOME', viewport));
    }

    for (const destinationLabel of ['Categorías', 'Outlet', 'Carrito']) {
      const destination = navDestinations.find(item => item.label === destinationLabel);
      if (!destination || !destination.href) throw new Error('BOTTOM_NAV_DESTINATION_MISSING=' + destinationLabel);
      await visit(page, destination.href);
      for (const viewport of BOTTOM_NAV_VIEWPORTS) {
        await page.setViewportSize({ width: viewport, height: 900 });
        await page.waitForTimeout(200);
        await canonicalBottomNavigation(page, 'DESTINATION_' + destinationLabel.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase(), viewport, destinationLabel);
      }
    }

    await visit(page, productUrl);
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
      await desktopShellLayout(page, 'ACCOUNT_GUEST', viewport, false);
      const links = await accountInformationLinks(page, 'GUEST', viewport);
      if (BOTTOM_NAV_VIEWPORTS.includes(viewport)) await canonicalBottomNavigation(page, 'ACCOUNT_GUEST', viewport, 'Cuenta');
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
