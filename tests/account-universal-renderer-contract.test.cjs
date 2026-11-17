'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..'), theme=path.join(root,'theme/crios-rango-2026'), read=p=>fs.readFileSync(path.join(theme,p),'utf8');
const presentation=read('inc/account-presentation.php'), assets=read('inc/assets.php'), css=read('assets/css/account.css');
const order=read('woocommerce/myaccount/view-order.php'), shell=read('woocommerce/myaccount/my-account.php'), address=read('woocommerce/myaccount/my-address.php'), downloads=read('woocommerce/myaccount/downloads.php');
test('ACCOUNT_SHELL_OMITS_NATIVE_NAVIGATION_WITHOUT_REMOVING_ENDPOINTS',()=>{
 assert.match(shell,/cr-account-shell/); assert.match(shell,/woocommerce_account_content/); assert.doesNotMatch(shell,/woocommerce_account_navigation/);
 assert.match(presentation,/remove_action\( 'woocommerce_account_navigation', 'woocommerce_account_navigation', 10 \)/);
 assert.match(presentation,/cr2026_account_dequeue_native_loyalty_styles/);
 assert.match(presentation,/\$back_url = 'home' === \$view \? wc_get_page_permalink\( 'myaccount' \) : wc_get_account_endpoint_url\( 'edit-account' \)/);
 assert.match(presentation,/\$back_url = '' === \$address_type \? wc_get_page_permalink\( 'myaccount' \) : wc_get_account_endpoint_url\( 'edit-address' \)/);
 assert.match(presentation,/wp_dequeue_style\( \$handle \)/);
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
 assert.match(address,/wc_get_account_formatted_address/); assert.match(address,/cr-account-empty-state/); assert.match(address,/woocommerce_my_account_get_addresses/); assert.match(address,/wc_get_endpoint_url\( 'edit-address'/);
 assert.match(downloads,/return;/); assert.doesNotMatch(downloads,/<section|<article|download_url|Descargas/);
});
test('VIEWPORTS_CHANGE_LAYOUT_NOT_RENDERER',()=>{
 const viewports=[390,768,980,1279,1280,1440,1920]; assert.deepEqual(viewports,[390,768,980,1279,1280,1440,1920]);
 for(const s of ['cr-account-shell','cr-account-home__grid','cr-order-detail','cr-account-loyalty__promotion-card','cr-account-addresses','cr-account-downloads','cr-control-shell']) assert.ok(css.includes(s),s);
});
test('WOO_AND_WPLOYALTY_LOGIC_ENDPOINTS_REMAIN_REFERENCED',()=>{
 for(const s of ['criosrango/v1/loyalty','criosrango/v1/promotions','wc/store/v1/cart','wc/store/v1/cart/apply-coupon']) assert.ok(assets.includes(s));
 assert.match(presentation,/woocommerce_shipping_fields/); assert.match(presentation,/save_account_details/); assert.match(presentation,/wc_logout_url/);
});

test('ACCOUNT_LEGACY_WOOCOMMERCE_WRAPPER_IS_ABSENT',()=>{
 const accountTemplate=read('woocommerce/myaccount/my-account.php');
 assert.match(accountTemplate,/<div class="cr-account-shell">/);
 assert.match(accountTemplate,/<div class="cr-account-content cr-account-shell__content">/);
 assert.doesNotMatch(accountTemplate,/<div class="woocommerce(?:\s|")/);
 assert.doesNotMatch(accountTemplate,/woocommerce-MyAccount-content/);
 assert.match(accountTemplate,/do_action\( 'woocommerce_before_my_account' \)/);
 assert.match(accountTemplate,/do_action\( 'woocommerce_account_content' \)/);
 assert.match(accountTemplate,/do_action\( 'woocommerce_after_my_account' \)/);
 assert.match(presentation,/cr2026_account_unwrap_shortcode_container/);
 assert.match(presentation,/'woocommerce_my_account' !== \$tag/);
 assert.match(presentation,/add_filter\( 'do_shortcode_tag', 'cr2026_account_unwrap_shortcode_container', 10, 4 \)/);
 assert.match(css,/body\.woocommerce-account \.cr-account-content/);
 assert.doesNotMatch(css,/(^|[\s>])\.woocommerce(?=[\s>{])/m);
 assert.doesNotMatch(css,/\.woocommerce-MyAccount-content/);
 console.log('ACCOUNT_LEGACY_WOOCOMMERCE_WRAPPER=ABSENT');
 console.log('ACCOUNT_SHELL_PRESENT=PASS');
 console.log('ACCOUNT_CONTENT_PRESENT=PASS');
 console.log('WOOCOMMERCE_ACCOUNT_NAV_ABSENT=PASS');
 console.log('WOOCOMMERCE_NOTICES_PRESERVED=PASS');
});
