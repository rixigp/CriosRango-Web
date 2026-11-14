'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const theme=path.resolve(__dirname,'../theme/crios-rango-2026'),read=p=>fs.readFileSync(path.join(theme,p),'utf8');
const controls=read('assets/css/controls.css'),assets=read('inc/assets.php'),wpLogin=read('assets/js/form-controls.js'),accountCss=read('assets/css/account.css'),checkoutCss=read('assets/css/checkout.css');
test('WALLET_ICON_BADGE_SINGLE_SOURCE=YES',()=>{const cart=read('assets/js/cart-ui.js'),loyalty=read('assets/js/account-loyalty.js');assert.match(cart,/cr-wallet-icon-badge cr-cart-wallet__icon/);assert.match(loyalty,/cr-wallet-icon-badge cr-account-loyalty__wallet-icon/);assert.match(controls,/\.cr-wallet-icon-badge\s*\{/);assert.match(controls,/--cr-wallet-badge-size:\s*38px/);});
test('CR_CONTROL_SHELL=YES; NATIVE_FIELDSET_LEGEND_NOTCH=YES; WHITE_SURFACE=YES', () => {
  assert.match(controls, /\.cr-control-shell\s*\{[^}]*background:\s*#fff/s);
  assert.match(controls, /\.cr-control-shell\s*>\s*legend\s*\{[^}]*position:\s*relative/s);
  assert.match(controls, /\.cr-control-shell\s*>\s*legend\s*\{[^}]*background:\s*transparent/s);
  assert.match(controls, /\.cr-control-shell\s*>\s*legend\s*\{[^}]*font:\s*300 11px\/16px/s);
  assert.match(controls, /:root\s*\{[^}]*--cr-control-height:\s*48px;[^}]*--cr-control-radius:\s*9px/s);
  assert.match(controls, /:root\s*\{[^}]*--cr-control-background:\s*#fff/s);
  assert.match(wpLogin, /createElement\('fieldset'\)/);
  assert.match(wpLogin, /createElement\('legend'\)/);
  assert.match(wpLogin, /cr-control-shell/);
  assert.doesNotMatch(controls, /cr-control__box|cr-control__label|--cr-app-canvas/);
  assert.match(accountCss, /body\.woocommerce-account \.woocommerce-EditAccountForm > fieldset\s*\{/);
  assert.match(accountCss, /body\.woocommerce-account \.woocommerce-EditAccountForm > fieldset > legend\s*\{/);
});
test('ALL_FORMS_CONSUME_ONE_CANONICAL_COMPONENT_AND_NATIVE_SELECT2',()=>{assert.match(assets,/wp_enqueue_script\(\s*'cr2026-form-controls'[\s\S]*?assets\/js\/form-controls\.js/);assert.match(wpLogin,/#loginform[\s\S]*#lostpasswordform[\s\S]*#resetpassform[\s\S]*#registerform/);assert.match(controls,/\.select2-selection--single/);assert.match(controls,/padding:\s*13px 14px\s*!important/);assert.match(controls,/padding:\s*13px 36px 13px 14px\s*!important/);assert.doesNotMatch(controls,/padding-block:\s*0\s*!important/);assert.match(controls,/form label :is\(\.required,span\.required/);assert.match(controls,/\.woocommerce-LostPassword a/);assert.match(controls,/--cr-brand-green,\s*var\(--cr-green-dark\)/);assert.match(controls,/\.cr-control-shell \.select2-selection__arrow/);assert.doesNotMatch(checkoutCss,/woocommerce-billing-fields__field-wrapper > \.form-row > label\s*\{/);assert.doesNotMatch(checkoutCss,/woocommerce-billing-fields__field-wrapper > \.form-row input\.input-text/);assert.doesNotMatch(accountCss,/woocommerce-EditAccountForm label/);});

test('GLOBAL_FORM_GEOMETRY_AND_REQUIRED_MARKERS_USE_ONE_CANONICAL_SOURCE',()=>{
  assert.match(controls,/\.cr-control-shell\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(controls,/\.cr-control-shell input\[type="password"\][\s\S]*?padding:\s*0 48px 0 14px/s);
  assert.match(controls,/\.cr-control-shell \.show-password-input,[\s\S]*?top:\s*50%[\s\S]*?right:\s*14px[\s\S]*?bottom:\s*auto[\s\S]*?transform:\s*translateY\(-50%\)/s);
  assert.match(controls,/\.cr-control-shell textarea\s*\{[^}]*padding:\s*12px 14px/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection--single\s*\{[^}]*align-items:\s*center/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection__rendered\s*\{[^}]*padding:\s*0 36px 0 14px/s);
  assert.match(controls,/\.woocommerce form \.form-row:not\(\[data-cr-control="true"\]\)/);
  assert.match(assets,/One global DOM enhancer/);
  assert.doesNotMatch(wpLogin,/removeAttribute\(['"]required['"]\)|removeAttribute\(['"]aria-required['"]\)/);
  assert.doesNotMatch(wpLogin,/setAttribute\(['"]required['"]|setAttribute\(['"]aria-required['"]/);
});


test('GLOBAL_CONTROL_VALUE_ALIGNMENT_HAS_SINGLE_CONTROL_PADDING_SOURCE',()=>{
  assert.match(controls,/\.cr-control-shell\s*>\s*:\s*is\([\s\S]*?\.woocommerce-input-wrapper[\s\S]*?\.select2-container[\s\S]*?\)\s*\{[^}]*padding:\s*0\s*!important/s);
  assert.match(controls,/\.cr-control-shell input:not\(\[type="checkbox"\]\)[\s\S]*?padding:\s*0 14px\s*!important/s);
  assert.match(controls,/\.cr-control-shell select\s*\{[^}]*padding:\s*0 36px 0 14px\s*!important/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection--single\s*\{[^}]*display:\s*flex\s*!important[^}]*align-items:\s*center\s*!important/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection__rendered\s*\{[^}]*padding:\s*0 36px 0 14px\s*!important/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection__arrow\s*\{[^}]*top:\s*0\s*!important[^}]*right:\s*8px\s*!important[^}]*height:\s*100%\s*!important/s);
  assert.match(controls,/\.cr-control-shell input\[type="password"\],[\s\S]*?padding:\s*0 48px 0 14px\s*!important/s);
  assert.match(controls,/\.cr-control-shell \.show-password-input,[\s\S]*?top:\s*50%\s*!important[\s\S]*?right:\s*14px\s*!important[\s\S]*?transform:\s*translateY\(-50%\)\s*!important/s);
  assert.match(controls,/\.woocommerce form \.form-row > label abbr\.required[\s\S]*?display:\s*none\s*!important/);
});
