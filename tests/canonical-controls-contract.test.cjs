'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const theme=path.resolve(__dirname,'../theme/crios-rango-2026'),read=p=>fs.readFileSync(path.join(theme,p),'utf8');
const controls=read('assets/css/controls.css'),assets=read('inc/assets.php'),wpLogin=read('assets/js/form-controls.js'),accountCss=read('assets/css/account.css'),checkoutCss=read('assets/css/checkout.css');
test('WALLET_ICON_BADGE_SINGLE_SOURCE=YES',()=>{const cart=read('assets/js/cart-ui.js'),loyalty=read('assets/js/account-loyalty.js');assert.match(cart,/cr-wallet-icon-badge cr-cart-wallet__icon/);assert.match(loyalty,/cr-wallet-icon-badge cr-account-loyalty__wallet-icon/);assert.match(controls,/\.cr-wallet-icon-badge\s*\{/);assert.match(controls,/--cr-wallet-badge-size:\s*38px/);});
test('CR_CONTROL_SHELL=YES; NATIVE_FIELDSET_LEGEND_NOTCH=YES; WHITE_SURFACE=YES', () => {
  assert.match(controls, /\.cr-control-shell\s*\{[^}]*height:\s*var\(--cr-control-height\)/s);
  assert.match(controls, /\.cr-control-shell\s*\{[^}]*border:\s*var\(--cr-control-border-width\)\s+solid\s+var\(--cr-control-border\)/s);
  assert.match(controls, /\.cr-control-shell\s*\{[^}]*border-radius:\s*var\(--cr-control-radius\)/s);
  assert.match(controls, /\.cr-control-shell\s*\{[^}]*background:\s*var\(--cr-control-background\)/s);
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
test('ALL_FORMS_CONSUME_ONE_CANONICAL_COMPONENT_AND_NATIVE_SELECT2',()=>{assert.match(assets,/wp_enqueue_script\(\s*'cr2026-form-controls'[\s\S]*?assets\/js\/form-controls\.js/);assert.match(wpLogin,/#loginform[\s\S]*#lostpasswordform[\s\S]*#resetpassform/);assert.match(controls,/\.select2-selection--single/);assert.match(controls,/--cr-control-padding:\s*0 14px/);assert.match(controls,/--cr-control-select-padding:\s*0 36px 0 14px/);assert.match(controls,/padding-top:\s*0\s*!important;[\s\S]*?padding-bottom:\s*0\s*!important;/);assert.match(controls,/form label :is\(\.required,span\.required/);assert.match(controls,/\.woocommerce-LostPassword a/);assert.match(controls,/\.cr-control-shell \.select2-selection__arrow/);assert.doesNotMatch(checkoutCss,/woocommerce-billing-fields__field-wrapper > \.form-row > label\s*\{/);assert.doesNotMatch(checkoutCss,/woocommerce-billing-fields__field-wrapper > \.form-row input\.input-text/);assert.doesNotMatch(accountCss,/woocommerce-EditAccountForm label/);});

test('GLOBAL_FORM_GEOMETRY_AND_REQUIRED_MARKERS_USE_ONE_CANONICAL_SOURCE',()=>{
  assert.match(controls,/\.cr-control-shell\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(controls,/\.cr-control-shell input\[type="password"\]\s*\{[^}]*padding-right:\s*48px/s);
  assert.match(controls,/\.cr-control-shell \.show-password-input\s*\{[^}]*top:\s*50%[^}]*right:\s*14px[^}]*bottom:\s*auto[^}]*transform:\s*translateY\(-50%\)/s);
  assert.match(controls,/\.cr-control-shell textarea\s*\{[^}]*padding:\s*12px 14px/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection--single\s*\{[^}]*align-items:\s*center/s);
  assert.match(controls,/\.cr-control-shell \.select2-selection__rendered\s*\{[^}]*padding:\s*var\(--cr-control-select-padding\)/s);
  assert.match(controls,/\.woocommerce form \.form-row:not\(\[data-cr-control="true"\]\)/);
  assert.match(assets,/One global DOM enhancer/);
  assert.doesNotMatch(wpLogin,/removeAttribute\(['"]required['"]\)|removeAttribute\(['"]aria-required['"]\)/);
  assert.doesNotMatch(wpLogin,/setAttribute\(['"]required['"]|setAttribute\(['"]aria-required['"]/);
});
