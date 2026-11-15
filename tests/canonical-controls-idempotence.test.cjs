'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const theme = path.resolve(__dirname, '../theme/crios-rango-2026');
const js = fs.readFileSync(path.join(theme, 'assets/js/form-controls.js'), 'utf8');
const controls = fs.readFileSync(path.join(theme, 'assets/css/controls.css'), 'utf8');
const account = fs.readFileSync(path.join(theme, 'assets/css/account.css'), 'utf8');
const presentation = fs.readFileSync(path.join(theme, 'inc/account-presentation.php'), 'utf8');
test('PERSONAL_FIELDS_CANONICAL_SHELLS_ARE_NOT_HIDDEN', () => {
  assert.match(account, /\.woocommerce-EditAccountForm > fieldset:not\(\.cr-control-shell\)\s*\{\s*display:\s*none\s*!important/s);
  assert.match(account, /\.woocommerce-EditAccountForm fieldset:not\(\.cr-control-shell\)\s*\{\s*display:\s*none\s*!important/s);
  assert.doesNotMatch(account, /\.woocommerce-EditAccountForm(?:\s*>|\s+)fieldset\s*\{\s*display:\s*none\s*!important/s);
});
test('PERSONAL_REAL_WOOCOMMERCE_FIELDS_AND_BIRTHDAY_MARKUP_EXIST', () => {
  for (const id of ['account_first_name', 'account_last_name', 'account_email']) {
    assert.match(js, /findWooControlContent/);
    assert.match(presentation, /cr2026_account_render_birth_date_field/);
  }
  assert.match(presentation, /class="cr-account-birth-date__value"/);
  assert.match(presentation, /data-birth-date-source="wordpress-user-meta"/);
});
test('ENHANCER_IDEMPOTENCE_AND_CONTENT_LAYER_CONTRACT', () => {
  assert.match(js, /row\.dataset\.crControl === 'true'/);
  assert.match(js, /alreadyCanonical\(row\)/);
  assert.match(js, /alreadyCanonical\(original\)/);
  assert.match(js, /content\.className = 'cr-control-shell__content'/);
  assert.match(js, /content\.appendChild\(original\)/);
  assert.match(js, /window\.cr2026EnhanceFormControls = enhance/);
  assert.match(controls, /\.cr-control-shell__content\s*\{[^}]*inset:\s*0;[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*height:\s*100%/s);
  assert.match(controls, /height:\s*24px\s*!important/);
  assert.match(controls, /line-height:\s*24px\s*!important/);
  assert.match(controls, /padding:\s*0 16px\s*!important/);
  assert.match(controls, /padding:\s*0 48px 0 16px\s*!important/);
  assert.match(controls, /\.cr-control-shell \.show-password-input\s*\{[^}]*top:\s*50%[^}]*right:\s*16px[^}]*translateY\(-50%\)/s);
});
test('APPROVED_MATERIAL_TOKENS_REMAIN_UNCHANGED', () => {
  assert.match(controls, /--cr-control-height:\s*58px/);
  assert.match(controls, /--cr-control-radius:\s*4px/);
  assert.match(controls, /--cr-control-select-radius:\s*3px/);
  assert.match(controls, /--cr-control-border:\s*#8A858A/);
  assert.match(controls, /--cr-control-border-focus:\s*#183B35/);
  assert.match(controls, /--cr-control-value-size:\s*16px/);
  assert.match(controls, /--cr-control-value-line-height:\s*24px/);
  assert.match(controls, /--cr-control-value-weight:\s*400/);
  assert.match(controls, /--cr-control-label-size:\s*13px/);
  assert.match(controls, /--cr-control-label-line-height:\s*16px/);
});
