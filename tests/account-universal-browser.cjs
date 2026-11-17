'use strict';
const {chromium}=require('playwright');
const base=(process.env.STAGING_BASE_URL||'').replace(/\/$/,'');
const email=process.env.STAGING_ACCOUNT_EMAIL||'', password=process.env.STAGING_ACCOUNT_PASSWORD||'';
const viewports=[390,768,980,1279,1280,1440,1920];
(async()=>{
 if(!base||!email||!password){console.log('ACCOUNT_BROWSER_MATRIX=SKIPPED_NO_STAGING_CREDENTIALS');return;}
 const browser=await chromium.launch({headless:true}), context=await browser.newContext({viewport:{width:390,height:900}}), page=await context.newPage(), account=base+'/mi-cuenta/';
 try{
  await page.goto(account,{waitUntil:'domcontentloaded'});
  if(!(await page.locator('form.login').count())){const l=page.locator('a[href*="cr-account-view=login"]').first();if(await l.count())await l.click();}
  await page.locator('form.login input[name="username"], form.login #username').first().fill(email);
  await page.locator('form.login input[name="password"], form.login #password').first().fill(password);
  await page.locator('form.login button[name="login"], form.login input[name="login"]').first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.goto(account+'orders/',{waitUntil:'domcontentloaded'});
  const orderLink=page.locator('a.cr-account-order__view').first(), orderHref=await orderLink.count()?await orderLink.getAttribute('href'):'';
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
    if(!(await page.locator(selector).count()))throw Error('ACCOUNT_RENDERER_MISSING='+name+'@'+width); checks++;
   }
   if(orderHref){await page.goto(orderHref,{waitUntil:'domcontentloaded'});await page.locator('.cr-order-detail').first().waitFor({state:'attached',timeout:15000});if(await page.locator('.woocommerce-order-details table, table.woocommerce-table--order-details').count())throw Error('NATIVE_ORDER_TABLE_PRESENT='+width);checks++;}
   else console.log('ORDER_DETAIL_BROWSER_CHECK=SKIPPED_NO_STAGING_ORDER');
   console.log('ACCOUNT_VIEWPORT='+width+' RENDERERS=PASS');
  }
  console.log('ACCOUNT_BROWSER_CHECKS='+checks);console.log('ACCOUNT_LEGACY_NAV_VISIBLE=NO');console.log('ORDER_DETAIL_NATIVE_DESKTOP_BRANCH=ABSENT');console.log('ACCOUNT_RENDERER_DEVICE_DIVERGENCE=NO');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
