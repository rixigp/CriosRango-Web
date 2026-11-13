'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const presentation = fs.readFileSync(path.join(theme, 'inc/account-presentation.php'), 'utf8');
const assets = fs.readFileSync(path.join(theme, 'inc/assets.php'), 'utf8');
const css = fs.readFileSync(path.join(theme, 'assets/css/account.css'), 'utf8');
const js = fs.readFileSync(path.join(theme, 'assets/js/account-loyalty.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');

test('LOYALTY_ENDPOINT_USES_CANONICAL_TOOLBAR_AND_MOBILE_ONLY_PRESENTATION', () => {
  assert.match(presentation, /cr2026_account_render_endpoint_toolbar\(\s*__\(\s*'Cupones y promociones'/);
  assert.match(presentation, /woocommerce_account_loyalty_reward_endpoint/);
  assert.match(presentation, /cr-account-loyalty-reward/);
  assert.match(presentation, /wp_is_mobile\(\)/);
  assert.match(presentation, /cr2026_account_render_mobile_loyalty_reward/);
  assert.match(assets, /is_wc_endpoint_url\( 'loyalty_reward' \)/);
  assert.match(assets, /assets\/js\/account-loyalty\.js/);
});

test('MOBILE_LEGACY_WPLoyalty_PRESENTATION_CALLBACKS_ARE_REMOVED_WITHOUT_TOUCHING_PLUGIN_LOGIC', () => {
  assert.match(presentation, /remove_action\(\s*\$hook_name,\s*\$callback,\s*\(int\) \$priority\s*\)/);
  assert.match(presentation, /wlr|wployalty|wp\[-_\]loyalty\[-_\]rules/);
  assert.doesNotMatch(presentation, /update_user_meta\([^\n]*(?:points|wallet|reward)|wp_delete_post\([^\n]*coupon/);
});

test('WALLET_VALUE_AND_THRESHOLD_ARE_READ_FROM_REAL_LOYALTY_API_FIELDS', () => {
  assert.match(assets, /rest_url\( 'criosrango\/v1\/loyalty' \)/);
  assert.match(js, /payload\.wallet_value/);
  assert.match(js, /payload\.minimum_redeem_value/);
  assert.match(js, /Te faltan '\s*\+ money\(\(threshold - current\) \/ 100\)/);
  assert.match(js, /role', 'progressbar'/);
  assert.match(js, /payload\.pending_rewards/);
  assert.match(js, /reward\.amount/);
  assert.doesNotMatch(js, /(?:306|\b100\s* puntos|5\.00\s*€|3\s*€)/);
});

test('PROMOTIONS_USE_REAL_API_DATA_AND_RENDER_CONDITIONALLY_IN_SPANISH', () => {
  assert.match(assets, /rest_url\( 'criosrango\/v1\/promotions' \)/);
  assert.match(js, /promotionList\s*=\s*\(payload\)/);
  assert.match(js, /Promociones disponibles \('/);
  assert.match(js, /promotion\.title/);
  assert.match(js, /promotion\.description/);
  assert.match(js, /promotion\.expires_at/);
  assert.match(js, /if \(!list\.length\) return null/);
  assert.match(js, /if \(!rewards\.length\) return null/);
  assert.match(js, /No tienes saldo disponible ni promociones activas en este momento/);
  for (const legacy of ['My punto', 'Available punto', 'Redeemed punto', 'Total punto earned', 'Punto to Coupons', 'Used recompensas', 'recompensas value', 'My recompensas', 'EUR']) {
    assert.equal(js.includes(legacy), false, 'legacy visible copy must not be rendered: ' + legacy);
  }
});

test('APPLY_ACTION_REUSES_WOOCOMMERCE_STORE_API_APPLY_COUPON_ROUTE', () => {
  assert.match(assets, /rest_url\( 'wc\/store\/v1\/cart\/apply-coupon' \)/);
  assert.match(assets, /wp_create_nonce\( 'wc_store_api' \)/);
  assert.match(js, /url\.searchParams\.set\('code', cleanCode\)/);
  assert.match(js, /request\(url\.toString\(\), \{ method: 'POST' \}, true\)/);
  assert.match(js, /updatedCart\.coupons/);
  assert.match(js, /Descuento aplicado al carrito/);
  assert.match(js, /Aplicado/);
});

test('APP_STRUCTURE_AND_SHARED_RAIL_STYLES_ARE_MOBILE_ENDPOINT_SCOPED', () => {
  assert.match(css, /body\.woocommerce-account\.cr-account-loyalty-reward \.cr-account-loyalty\s*\{[^}]*width:\s*min\(calc\(100%\s*-\s*40px\),\s*720px\);[^}]*margin:\s*0 auto;/s);
  assert.match(css, /cr-account-loyalty__wallet-card/);
  assert.match(css, /cr-account-loyalty__progress/);
  assert.match(css, /cr-account-loyalty__rewards-card/);
  assert.match(css, /cr-account-loyalty__promotion-card/);
  assert.match(css, /cr-account-loyalty__apply/);
  assert.match(css, /background:\s*#EAF6F0/);
  assert.match(css, /background:\s*#FFFFFF/);
  assert.match(workflow, /tests\/account-coupons-promotions-contract\.test\.cjs/);
  assert.match(workflow, /node --test tests\/account-coupons-promotions-contract\.test\.cjs/);
});
