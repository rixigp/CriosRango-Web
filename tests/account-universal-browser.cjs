'use strict';
const {chromium}=require('playwright');
const base=(process.env.STAGING_BASE_URL||'').replace(/\/$/,'');
const email=process.env.STAGING_ACCOUNT_EMAIL||'', password=process.env.STAGING_ACCOUNT_PASSWORD||'';
const viewports=[390,430,768,1279,1280,1440,1920];
(async()=>{
 if(!base)throw Error('STAGING_BASE_URL_MISSING');
 const browser=await chromium.launch({headless:true}), context=await browser.newContext({viewport:{width:390,height:900}}), page=await context.newPage(), account=base+'/mi-cuenta/';
 try{
  await page.goto(account,{waitUntil:'domcontentloaded'});
  await page.locator('.cr-account-shell').first().waitFor({state:'attached',timeout:15000});
  for(const width of viewports){
   await page.setViewportSize({width,height:900});
   if(await page.locator('div.woocommerce').count())throw Error('ACCOUNT_LEGACY_WOOCOMMERCE_WRAPPER_PRESENT=GUEST_HOME@'+width);
   if(!(await page.locator('.cr-account-shell').count()))throw Error('ACCOUNT_SHELL_MISSING=GUEST_HOME@'+width);
  }
  // Help/Contact is one universal renderer; legacy WPBakery post_content must never reach the DOM.
  const contactUrl=base+'/contacto/';
  await page.goto(contactUrl,{waitUntil:'domcontentloaded'});
  await page.locator('.cr-account-help').first().waitFor({state:'attached',timeout:15000});
  for(const width of viewports){
   await page.setViewportSize({width,height:900});
   const metrics=await page.evaluate(()=>{
    const renderer=document.querySelectorAll('.cr-account-help');
    const toolbars=document.querySelectorAll('.cr-page-toolbar');
    const title=document.querySelectorAll('.cr-parent-category__title');
    const grid=document.querySelector('.cr-account-help__grid');
    const style=grid?getComputedStyle(grid):null;
     const toolbar=document.querySelector('.cr-page-toolbar');
     const helpContent=document.querySelector('.cr-account-help');
     const contentWrapper=document.querySelector('body.cr-account-help-page .cr-page > .cr-prose');
     const toolbarRect=toolbar?toolbar.getBoundingClientRect():null;
     const helpRect=helpContent?helpContent.getBoundingClientRect():null;
     const wrapperStyle=contentWrapper?getComputedStyle(contentWrapper):null;
    const bodyText=document.body.innerText||'';
    const shortcodeMatches=bodyText.match(/\[(?:\/?(?:vc_row|vc_column|nectar_gmap))\b/gi)||[];
    return {
     rendererCount:renderer.length,toolbarCount:toolbars.length,titleCount:title.length,
     cardCount:document.querySelectorAll('.cr-account-help__card').length,
     hoursCount:document.querySelectorAll('.cr-account-help__hours-row').length,
     gridDisplay:style?style.display:'none',gridColumns:style?style.gridTemplateColumns:'',
      toolbarLeft:toolbarRect?Math.round(toolbarRect.left*10)/10:null,
      helpContentLeft:helpRect?Math.round(helpRect.left*10)/10:null,
      contentWrapperPaddingLeft:wrapperStyle?wrapperStyle.paddingLeft:null,
      contentWrapperMarginLeft:wrapperStyle?wrapperStyle.marginLeft:null,
      extraLeftInset:toolbarRect&&helpRect?Math.round((helpRect.left-toolbarRect.left)*10)/10:null,
     shortcodeTextCount:shortcodeMatches.length,
     visible:renderer.length===1&&getComputedStyle(renderer[0]).display!=='none'
    };
   });
   console.log('CONTACT_RENDERER_'+width+'='+JSON.stringify(metrics));
   if(metrics.rendererCount!==1||metrics.toolbarCount!==1||metrics.titleCount!==1)throw Error('CONTACT_RENDERER_DUPLICATION='+width);
   if(metrics.cardCount!==3||metrics.hoursCount!==7)throw Error('CONTACT_CONTENT_INCOMPLETE='+width);
   if(metrics.shortcodeTextCount!==0)throw Error('CONTACT_SHORTCODE_TEXT_COUNT='+metrics.shortcodeTextCount+'@'+width);
   if(!metrics.visible||metrics.gridDisplay!=='grid')throw Error('CONTACT_RENDERER_NOT_VISIBLE='+width);
   const cols=metrics.gridColumns.split(' ').length;
    if(width>=1280){
     if(metrics.extraLeftInset===null||Math.abs(metrics.extraLeftInset)>1)throw Error('CONTACT_CONTENT_RAIL_MISMATCH='+width+':'+metrics.extraLeftInset);
     if(metrics.contentWrapperPaddingLeft!=='0px'||metrics.contentWrapperMarginLeft!=='0px')throw Error('CONTACT_CONTENT_WRAPPER_HAS_EXTRA_INSET='+width);
    }
   if(width<=767&&cols!==1)throw Error('CONTACT_MOBILE_GRID_CHANGED='+width+':'+metrics.gridColumns);
   if(width>=768&&cols!==3)throw Error('CONTACT_DESKTOP_GRID_INVALID='+width+':'+metrics.gridColumns);
  }
  console.log('CONTACT_SINGLE_RENDERER=PASS');
  console.log('CONTACT_SHORTCODE_TEXT_COUNT=0');
  console.log('CONTACT_RENDERER_DUPLICATION=NO');
  console.log('CONTACT_VIEWPORT_MATRIX=PASS');

  const loginUrl=account+'?cr-account-view=login';
  await page.goto(loginUrl,{waitUntil:'domcontentloaded'});
  await page.locator('.cr-account-shell').first().waitFor({state:'attached',timeout:15000});
  if(!(await page.locator('form.login').count()))throw Error('GUEST_LOGIN_FORM_MISSING');
  for(const width of viewports){
   await page.setViewportSize({width,height:900});
   if(await page.locator('div.woocommerce').count())throw Error('ACCOUNT_LEGACY_WOOCOMMERCE_WRAPPER_PRESENT=LOGIN@'+width);
   console.log('LOGIN_PAGE_TITLE_COUNT_'+width+'='+await page.locator('.cr-parent-category__title').count());
   if(!(await page.locator('form.login').count()))throw Error('LOGIN_FORM_MISSING@'+width);
   if(await page.locator('form.register').count() && !(await page.locator('form.register').isVisible()))throw Error('REGISTER_FORM_NOT_VISIBLE@'+width);
  }
  console.log('ACCOUNT_GUEST_VIEWPORT_MATRIX=PASS');
  if(!email||!password){console.log('ACCOUNT_BROWSER_MATRIX=PARTIAL_NO_STAGING_CREDENTIALS');return;}
  await page.locator('form.login input[name="username"], form.login #username').first().fill(email);
  await page.locator('form.login input[name="password"], form.login #password').first().fill(password);
  await page.locator('form.login button[name="login"], form.login input[name="login"]').first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.goto(account+'orders/',{waitUntil:'domcontentloaded'});
  const orderLink=page.locator('a.cr-account-order__view').first(), orderHref=await orderLink.count()?await orderLink.getAttribute('href'):'';
  await page.goto(account,{waitUntil:'domcontentloaded'});
  for(const part of ['orders','loyalty_reward','edit-account']) if(!(await page.locator('.cr-account-home a[href*="'+part+'"]').count())) throw Error('DASHBOARD_LINK_MISSING='+part);
  await page.goto(account+'edit-account/',{waitUntil:'domcontentloaded'});
  if(!(await page.locator('.cr-account-profile-home a[href*="edit-address"]').count())) throw Error('PROFILE_ADDRESS_OVERVIEW_LINK_MISSING');
  if(!(await page.locator('.cr-account-profile-home a[href*="downloads"]').count())) throw Error('PROFILE_DOWNLOADS_LINK_MISSING');
  const routes=[
   ['DASHBOARD',account,'.cr-account-home'],['ORDERS',account+'orders/','.cr-account-orders'],
   ['ADDRESS_OVERVIEW',account+'edit-address/','.cr-account-addresses'],['ADDRESS_BILLING',account+'edit-address/billing/','.woocommerce-address-fields'],
   ['ADDRESS_SHIPPING',account+'edit-address/envio/','.woocommerce-address-fields'],['PROFILE',account+'edit-account/','.cr-account-profile-home'],
   ['PERSONAL',account+'edit-account/?profile_view=personal','form.woocommerce-EditAccountForm'],['PASSWORD',account+'edit-account/?profile_view=password','form.woocommerce-EditAccountForm fieldset'],
   ['REWARDS',account+'loyalty_reward/','[data-cr-account-loyalty]'],['DOWNLOADS',account+'downloads/','.cr-account-downloads, .cr-account-empty-state']
  ];
  let checks=0;
  for(const width of viewports){
   await page.setViewportSize({width,height:900});
   for(const [name,url,selector] of routes){
    await page.goto(url,{waitUntil:'domcontentloaded'}); await page.locator('.cr-account-shell').first().waitFor({state:'attached',timeout:15000});
    if(await page.locator('.woocommerce-MyAccount-navigation').count())throw Error('LEGACY_ACCOUNT_NAV_PRESENT='+name+'@'+width);
    if(await page.locator('div.woocommerce').count())throw Error('ACCOUNT_LEGACY_WOOCOMMERCE_WRAPPER_PRESENT='+name+'@'+width);
    if(!(await page.locator(selector).count()))throw Error('ACCOUNT_RENDERER_MISSING='+name+'@'+width);
    if(name==='ORDERS' && width===390){
      const metrics=await page.evaluate(()=>{
        const list=document.querySelector('.cr-account-orders__list');
        const cards=list?Array.from(list.querySelectorAll(':scope > .cr-account-order')).filter(card=>!card.hidden):[];
        if(!list)return {error:'ORDER_LIST_MISSING',cardCount:0};
        const style=getComputedStyle(list);
        const rects=cards.slice(0,2).map(card=>{const r=card.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};});
        return {
          computedDisplay:style.display,
          computedGap:style.gap,
          computedRowGap:style.rowGap,
          computedColumnGap:style.columnGap,
          cardCount:cards.length,
          card1:rects[0]||null,
          card2:rects[1]||null,
          realVisualDistancePx:rects.length===2?Math.round((rects[1].top-rects[0].bottom)*100)/100:null,
          listClass:list.className,
          directChildCount:list.children.length,
          directOrderCardCount:list.querySelectorAll(':scope > .cr-account-order').length
        };
      });
      console.log('ORDER_CARDS_LAYOUT_METRICS_390='+JSON.stringify(metrics));
      if(metrics.error)throw Error(metrics.error);
      if(metrics.computedDisplay!=='grid')throw Error('ORDER_LIST_COMPUTED_DISPLAY_NOT_GRID='+metrics.computedDisplay);
      if(metrics.computedGap!=='10px'||metrics.computedRowGap!=='10px')throw Error('ORDER_LIST_COMPUTED_GAP_INVALID='+JSON.stringify(metrics));
      if(metrics.cardCount<2)throw Error('ORDER_CARD_PAIR_NOT_AVAILABLE_FOR_GEOMETRY_MEASUREMENT='+metrics.cardCount);
      if(metrics.realVisualDistancePx===null||metrics.realVisualDistancePx<10||metrics.realVisualDistancePx>12)throw Error('ORDER_CARD_REAL_DISTANCE_OUT_OF_RANGE='+metrics.realVisualDistancePx);
      console.log('ORDER_CARD_REAL_DISTANCE_390='+metrics.realVisualDistancePx+'px PASS');
    }
    if(name==='REWARDS'){const text=await page.locator('body').innerText();if(/MY PUNTO|Available punto|Redeemed punto|Redeem Now/i.test(text))throw Error('NATIVE_WPLOYALTY_COPY_PRESENT@'+width);const styles=await page.locator('link[rel=stylesheet],style[id]').evaluateAll(ns=>ns.map(n=>(n.id||'')+' '+(n.href||'')));if(styles.some(x=>/wlr|wployalty|wp[-_]loyalty[-_]rules/i.test(x)))throw Error('NATIVE_WPLOYALTY_STYLES_PRESENT@'+width);}
    if(await page.locator('.cr-parent-category__title').count()!==1)throw Error('ACCOUNT_PAGE_TITLE_COUNT_INVALID='+name+'@'+width);
    const back=page.locator('.cr-parent-category__back').first();
    if(!(await back.count()))throw Error('ACCOUNT_BACK_NAV_MISSING='+name+'@'+width);
    const backHref=await back.getAttribute('href');
    if(name==='ORDERS' && !backHref.includes('/mi-cuenta/'))throw Error('ORDERS_BACK_NAV_INVALID');
    if(name==='ADDRESS_BILLING' && !backHref.includes('/edit-address/'))throw Error('ADDRESS_BACK_NAV_INVALID='+name);
    if(name==='ADDRESS_SHIPPING'){
      const expectedBackPath=new URL(account).pathname;
      const actualBackPath=new URL(backHref,page.url()).pathname;
      if(actualBackPath!==expectedBackPath)throw Error('SHIPPING_EDIT_BACK_TARGET_INVALID='+actualBackPath+' EXPECTED='+expectedBackPath);
      console.log('ROUTE=/mi-cuenta/edit-address/envio/');
      console.log('SHIPPING_EDIT_BACK_TARGET=/mi-cuenta/');
      console.log('CLICK_BACK');
      await back.click();
      await page.waitForURL(url=>url.pathname===expectedBackPath,{timeout:10000});
      if(new URL(page.url()).pathname!==expectedBackPath)throw Error('SHIPPING_EDIT_BACK_CLICK_FAILED='+page.url());
      console.log('EXPECTED=/mi-cuenta/');
      console.log('SHIPPING_EDIT_BACK=PASS');
    }
    if(name==='PERSONAL' || name==='PASSWORD'){if(!backHref.includes('/edit-account/'))throw Error('PROFILE_BACK_NAV_INVALID='+name);}
    if(name==='DOWNLOADS' && !backHref.includes('/edit-account/'))throw Error('DOWNLOADS_BACK_NAV_INVALID');
    checks++;
   }
   if(orderHref){await page.goto(orderHref,{waitUntil:'domcontentloaded'});await page.locator('.cr-order-detail').first().waitFor({state:'attached',timeout:15000});if(await page.locator('.woocommerce-order-details table, table.woocommerce-table--order-details').count())throw Error('NATIVE_ORDER_TABLE_PRESENT='+width);checks++;}
   else console.log('ORDER_DETAIL_BROWSER_CHECK=SKIPPED_NO_STAGING_ORDER');
   console.log('ACCOUNT_VIEWPORT='+width+' RENDERERS=PASS');
  }

  // Real-route desktop scrollbar geometry comparison at one fixed viewport.
  await page.setViewportSize({width:1440,height:1300});
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  const navRoutes=await page.evaluate(()=>{
   const links=Array.from(document.querySelectorAll('.cr-desktop-rail__destination[href]')).map(a=>({
    label:(a.innerText||a.textContent||'').replace(/\s+/g,' ').trim(),href:a.href
   }));
   return {
    category:links.find(x=>/categor/i.test(x.label))?.href||'',
    outlet:links.find(x=>/^outlet$/i.test(x.label))?.href||''
   };
  });
  if(!navRoutes.category)throw Error('SCROLLBAR_CATEGORY_ROUTE_MISSING');
  if(!navRoutes.outlet)throw Error('SCROLLBAR_OUTLET_ROUTE_MISSING');
  if(!orderHref)throw Error('SCROLLBAR_ORDER_DETAIL_ROUTE_MISSING');
  const geometryRoutes=[
   ['CATEGORIAS',navRoutes.category,'.cr-parent-category__canvas, #primary'],
   ['OUTLET',navRoutes.outlet,'#primary'],
   ['CUENTA',account,'.cr-account-home'],
   ['PEDIDOS',account+'orders/','.cr-account-orders'],
   ['DETALLE_PEDIDO',new URL(orderHref,account).toString(),'.cr-order-detail']
  ];
  const measurements=[];
  for(const [name,url,selector] of geometryRoutes){
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   if(!response||response.status()>=400)throw Error('SCROLLBAR_ROUTE_HTTP_FAILURE='+name);
   await page.locator(selector).first().waitFor({state:'attached',timeout:20000});
   await page.waitForTimeout(250);
   const metrics=await page.evaluate(()=>{
    const root=document.documentElement, scrolling=document.scrollingElement;
    const bounds=selector=>{
     const el=document.querySelector(selector);if(!el)return null;
     const r=el.getBoundingClientRect();return {left:r.left,right:r.right};
    };
    return {
     scrollingElement:scrolling?scrolling.tagName:'NONE',
     isRootScrollingElement:scrolling===root,
     scrollbarGutter:getComputedStyle(root).scrollbarGutter,
     innerWidth:window.innerWidth,clientWidth:root.clientWidth,
     scrollHeight:scrolling?scrolling.scrollHeight:0,
     clientHeight:scrolling?scrolling.clientHeight:0,
     hasVerticalScroll:!!scrolling&&scrolling.scrollHeight>scrolling.clientHeight+1,
     shell:bounds('.cr-desktop-shell'),sidebar:bounds('.cr-desktop-rail'),primary:bounds('#primary')
    };
   });
   if(!metrics.isRootScrollingElement||metrics.scrollingElement!=='HTML')throw Error('SCROLLING_ELEMENT_NOT_HTML='+name+':'+metrics.scrollingElement);
   if(metrics.scrollbarGutter!=='stable')throw Error('SCROLLBAR_GUTTER_NOT_STABLE='+name+':'+metrics.scrollbarGutter);
   for(const key of ['shell','sidebar','primary'])if(!metrics[key])throw Error('SCROLLBAR_GEOMETRY_MISSING='+name+':'+key);
   measurements.push({name,metrics});
   console.log('SCROLLBAR_ROUTE_'+name+'='+JSON.stringify(metrics));
  }
  const withScroll=measurements.find(x=>x.metrics.hasVerticalScroll);
  const withoutScroll=measurements.find(x=>!x.metrics.hasVerticalScroll);
  if(!withScroll||!withoutScroll)throw Error('SCROLLBAR_ROUTE_PAIR_MISSING='+JSON.stringify(measurements.map(x=>({name:x.name,scroll:x.metrics.hasVerticalScroll,scrollHeight:x.metrics.scrollHeight,clientHeight:x.metrics.clientHeight}))));
  const innerWidths=new Set(measurements.map(x=>x.metrics.innerWidth));
  const clientWidths=new Set(measurements.map(x=>x.metrics.clientWidth));
  if(innerWidths.size!==1)throw Error('WINDOW_INNER_WIDTH_CHANGED_BETWEEN_ROUTES');
  if(clientWidths.size!==1)throw Error('ROOT_CLIENT_WIDTH_CHANGED_BETWEEN_ROUTES');
  const edges=[['shell','left'],['shell','right'],['sidebar','left'],['sidebar','right'],['primary','left'],['primary','right']];
  let shellShift=0;
  for(const [part,edge] of edges)shellShift=Math.max(shellShift,Math.abs(withScroll.metrics[part][edge]-withoutScroll.metrics[part][edge]));
  console.log('SCROLLING_ELEMENT=HTML(document.documentElement)');
  console.log('ROUTE_WITH_SCROLL='+withScroll.name);
  console.log('ROUTE_WITHOUT_SCROLL='+withoutScroll.name);
  console.log('WINDOW_INNER_WIDTH='+withScroll.metrics.innerWidth);
  console.log('DOCUMENT_ELEMENT_CLIENT_WIDTH_WITH_SCROLL='+withScroll.metrics.clientWidth);
  console.log('DOCUMENT_ELEMENT_CLIENT_WIDTH_WITHOUT_SCROLL='+withoutScroll.metrics.clientWidth);
  console.log('SHELL_LEFT_WITH_SCROLL='+withScroll.metrics.shell.left.toFixed(2));
  console.log('SHELL_LEFT_WITHOUT_SCROLL='+withoutScroll.metrics.shell.left.toFixed(2));
  console.log('SHELL_RIGHT_WITH_SCROLL='+withScroll.metrics.shell.right.toFixed(2));
  console.log('SHELL_RIGHT_WITHOUT_SCROLL='+withoutScroll.metrics.shell.right.toFixed(2));
  console.log('SIDEBAR_LEFT_WITH_SCROLL='+withScroll.metrics.sidebar.left.toFixed(2));
  console.log('SIDEBAR_RIGHT_WITH_SCROLL='+withScroll.metrics.sidebar.right.toFixed(2));
  console.log('PRIMARY_LEFT_WITH_SCROLL='+withScroll.metrics.primary.left.toFixed(2));
  console.log('PRIMARY_RIGHT_WITH_SCROLL='+withScroll.metrics.primary.right.toFixed(2));
  console.log('SHELL_SHIFT_DUE_TO_SCROLLBAR='+shellShift.toFixed(2)+'px');
  if(shellShift>1)throw Error('SHELL_SHIFT_DUE_TO_SCROLLBAR_EXCEEDS_1PX='+shellShift);
  console.log('SCROLLBAR_GEOMETRY_STABILITY=PASS');

  console.log('ACCOUNT_BROWSER_CHECKS='+checks);console.log('ACCOUNT_LEGACY_NAV_VISIBLE=NO');console.log('ORDER_DETAIL_NATIVE_DESKTOP_BRANCH=ABSENT');console.log('ACCOUNT_RENDERER_DEVICE_DIVERGENCE=NO');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
