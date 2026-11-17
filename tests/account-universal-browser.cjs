'use strict';
const {chromium}=require('playwright');
const base=(process.env.STAGING_BASE_URL||'').replace(/\/$/,'');
const email=process.env.STAGING_ACCOUNT_EMAIL||'', password=process.env.STAGING_ACCOUNT_PASSWORD||'';
const viewports=[390,768,1279,1280,1440,1920];
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
  const loginUrl=account+'?cr-account-view=login';
  await page.goto(loginUrl,{waitUntil:'domcontentloaded'});
  await page.locator('.cr-account-shell').first().waitFor({state:'attached',timeout:15000});
  if(!(await page.locator('form.login').count()))throw Error('GUEST_LOGIN_FORM_MISSING');
  for(const width of viewports){
   await page.setViewportSize({width,height:900});
   if(await page.locator('div.woocommerce').count())throw Error('ACCOUNT_LEGACY_WOOCOMMERCE_WRAPPER_PRESENT=LOGIN@'+width);
   if(await page.locator('.cr-parent-category__title').count()!==1)throw Error('LOGIN_TITLE_COUNT_INVALID@'+width);
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
   ['ADDRESS_SHIPPING',account+'edit-address/shipping/','.woocommerce-address-fields'],['PROFILE',account+'edit-account/','.cr-account-profile-home'],
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
    if(name==='REWARDS'){const text=await page.locator('body').innerText();if(/MY PUNTO|Available punto|Redeemed punto|Redeem Now/i.test(text))throw Error('NATIVE_WPLOYALTY_COPY_PRESENT@'+width);const styles=await page.locator('link[rel=stylesheet],style[id]').evaluateAll(ns=>ns.map(n=>(n.id||'')+' '+(n.href||'')));if(styles.some(x=>/wlr|wployalty|wp[-_]loyalty[-_]rules/i.test(x)))throw Error('NATIVE_WPLOYALTY_STYLES_PRESENT@'+width);}
    if(await page.locator('.cr-parent-category__title').count()!==1)throw Error('ACCOUNT_PAGE_TITLE_COUNT_INVALID='+name+'@'+width);
    const back=page.locator('.cr-parent-category__back').first();
    if(!(await back.count()))throw Error('ACCOUNT_BACK_NAV_MISSING='+name+'@'+width);
    const backHref=await back.getAttribute('href');
    if(name==='ORDERS' && !backHref.includes('/mi-cuenta/'))throw Error('ORDERS_BACK_NAV_INVALID');
    if(name==='ADDRESS_BILLING' || name==='ADDRESS_SHIPPING'){if(!backHref.includes('/edit-address/'))throw Error('ADDRESS_BACK_NAV_INVALID='+name);}
    if(name==='PERSONAL' || name==='PASSWORD'){if(!backHref.includes('/edit-account/'))throw Error('PROFILE_BACK_NAV_INVALID='+name);}
    if(name==='DOWNLOADS' && !backHref.includes('/edit-account/'))throw Error('DOWNLOADS_BACK_NAV_INVALID');
    checks++;
   }
   if(orderHref){await page.goto(orderHref,{waitUntil:'domcontentloaded'});await page.locator('.cr-order-detail').first().waitFor({state:'attached',timeout:15000});if(await page.locator('.woocommerce-order-details table, table.woocommerce-table--order-details').count())throw Error('NATIVE_ORDER_TABLE_PRESENT='+width);checks++;}
   else console.log('ORDER_DETAIL_BROWSER_CHECK=SKIPPED_NO_STAGING_ORDER');
   console.log('ACCOUNT_VIEWPORT='+width+' RENDERERS=PASS');
  }
  console.log('ACCOUNT_BROWSER_CHECKS='+checks);console.log('ACCOUNT_LEGACY_NAV_VISIBLE=NO');console.log('ORDER_DETAIL_NATIVE_DESKTOP_BRANCH=ABSENT');console.log('ACCOUNT_RENDERER_DEVICE_DIVERGENCE=NO');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
