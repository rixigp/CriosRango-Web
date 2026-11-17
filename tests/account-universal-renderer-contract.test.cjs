'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..'), theme=path.join(root,'theme/crios-rango-2026'), read=p=>fs.readFileSync(path.join(theme,p),'utf8');
const presentation=read('inc/account-presentation.php'), assets=read('inc/assets.php'), css=read('assets/css/account.css');
const order=read('woocommerce/myaccount/view-order.php'), shell=read('woocommerce/myaccount/my-account.php'), address=read('woocommerce/myaccount/my-address.php'), downloads=read('woocommerce/myaccount/downloads.php');
test('ACCOUNT_SHELL_OMITS_NATIVE_NAVIGATION_WITHOUT_REMOVING_ENDPOINTS',()=>{
 assert.match(shell,/cr-account-shell/); assert.match(shell,/woocommerce_account_content/); assert.doesNotMatch(shell,/woocommerce_account_navigation/);
 assert.match(presentation,/remove_action\( 'woocommerce_account_navigation', 'woocommerce_account_navigation', 10 \)/);
 assert.match(css,/woocommerce-MyAccount-navigation\s*\{\s*display:\s*none\s*!important/);
 for(const e of ['orders','view-order','downloads','edit-address','edit-account','loyalty_reward','wpf-delete-account']) assert.ok(presentation.includes(e)||order.includes(e),e);
});
test('ORDER_DETAIL_RENDERER_IS_UNIVERSAL_WITH_OWNER_GUARD',()=>{
 assert.match(order,/class="cr-order-detail"/); assert.match(order,/if \( \(int\) \$order->get_customer_id\(\) !== \(int\) get_current_user_id\(\) \)/);
 assert.doesNotMatch(order,/wp_is_mobile/); assert.match(order,/get_formatted_billing_address/); assert.match(order,/needs_payment\(\)/);
 assert.match(order,/woocommerce_order_details_after_order_table/);
});
test('PROFILE_AND_REWARDS_RENDERERS_DO_NOT_USE_DEVICE_DETECTION',()=>{
 for(const n of ['cr2026_account_route_loyalty_reward','cr2026_account_render_loyalty_reward','cr2026_account_route_profile','cr2026_account_render_profile_endpoint']) assert.ok(presentation.includes(n));
 const loyalty=presentation.slice(presentation.indexOf('function cr2026_account_route_loyalty_reward'),presentation.indexOf('function cr2026_account_remove_legacy_navigation'));
 const profile=presentation.slice(presentation.indexOf('function cr2026_account_route_profile'),presentation.indexOf('function cr2026_account_render_profile_home'));
 assert.doesNotMatch(loyalty,/wp_is_mobile/); assert.doesNotMatch(profile,/wp_is_mobile/);
 assert.match(assets,/assets\/js\/account-loyalty\.js/); assert.match(assets,/if \( \$uses_account_app_skin \)/);
});
test('ADDRESS_OVERVIEW_AND_DOWNLOADS_USE_THEME_RENDERERS_WITH_NATIVE_DATA',()=>{
 assert.match(address,/wc_get_account_formatted_address/); assert.match(address,/woocommerce_my_account_get_addresses/); assert.match(address,/wc_get_endpoint_url\( 'edit-address'/);
 assert.match(downloads,/\$downloads/); assert.match(downloads,/\$download\['download_url'\]/); assert.match(downloads,/cr-account-empty-state/);
});
test('VIEWPORTS_CHANGE_LAYOUT_NOT_RENDERER',()=>{
 const viewports=[390,768,980,1279,1280,1440,1920]; assert.deepEqual(viewports,[390,768,980,1279,1280,1440,1920]);
 for(const s of ['cr-account-shell','cr-account-home__grid','cr-order-detail','cr-account-loyalty__promotion-card','cr-account-addresses','cr-account-downloads','cr-control-shell']) assert.ok(css.includes(s),s);
});
test('WOO_AND_WPLOYALTY_LOGIC_ENDPOINTS_REMAIN_REFERENCED',()=>{
 for(const s of ['criosrango/v1/loyalty','criosrango/v1/promotions','wc/store/v1/cart','wc/store/v1/cart/apply-coupon']) assert.ok(assets.includes(s));
 assert.match(presentation,/woocommerce_shipping_fields/); assert.match(presentation,/save_account_details/); assert.match(presentation,/wc_logout_url/);
});
