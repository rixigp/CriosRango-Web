const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const accountCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/account.css'), 'utf8');
const mainCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
const accountPresentation = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/account-presentation.php'), 'utf8');
const birthdayContract = fs.readFileSync(path.join(root, 'tests/account-birthday-contract.test.php'), 'utf8');

test('ADDRESS_PROVINCE_AND_COUNTRY_TEXT_SHARE_THE_INPUT_INLINE_START', () => {
  const fieldContractStart = accountCss.indexOf('body.woocommerce-account :is(.woocommerce-EditAccountForm, .woocommerce-address-fields) .form-row :is(');
  const fieldContractOpen = accountCss.indexOf('{', fieldContractStart);
  const fieldContractClose = accountCss.indexOf('}', fieldContractOpen);
  const fieldContract = accountCss.slice(fieldContractOpen, fieldContractClose);
  assert.ok(fieldContractStart >= 0 && fieldContractOpen > fieldContractStart && fieldContractClose > fieldContractOpen, 'canonical Account field contract exists');
  assert.match(fieldContract, /padding:\s*12px 13px 9px !important/);

  const addressStart = accountCss.indexOf('/* Mobile native shipping address form:');
  const addressEnd = accountCss.indexOf('/* Password app subview:', addressStart);
  const addressBlock = accountCss.slice(addressStart, addressEnd);
  const nativeSelect = addressBlock.match(/body\.woocommerce-account\.woocommerce-edit-address \.woocommerce-address-fields select \{([\s\S]*?)\n \}/);
  const select2ValueStart = addressBlock.lastIndexOf('body.woocommerce-account.woocommerce-edit-address .woocommerce-address-fields .select2-selection__rendered {');
  const select2ValueOpen = addressBlock.indexOf('{', select2ValueStart);
  const select2ValueClose = addressBlock.indexOf('}', select2ValueOpen);
  const select2Value = addressBlock.slice(select2ValueOpen, select2ValueClose);
  assert.ok(nativeSelect, 'native shipping select alignment override exists');
  assert.ok(select2ValueStart >= 0 && select2ValueOpen > select2ValueStart && select2ValueClose > select2ValueOpen, 'visible Select2 value alignment override exists');
  assert.match(nativeSelect[1], /padding-inline-start:\s*13px !important/);
  assert.match(nativeSelect[1], /text-indent:\s*0 !important/);
  assert.match(select2Value, /padding-inline-start:\s*13px !important/);
  assert.match(select2Value, /text-indent:\s*0 !important/);
  assert.match(addressBlock, /\.select2-selection__arrow \{[\s\S]*?height:\s*50px/);
  assert.doesNotMatch(nativeSelect[1], /appearance\s*:/i);
});

test('SELECT2_OUTER_AND_RENDERED_VALUE_HAVE_SEPARATE_PADDING_CONTRACTS', () => {
  const genericStart = accountCss.indexOf('    .woocommerce-EditAccountForm .form-row input:not([type="hidden"])');
  const genericEnd = accountCss.indexOf('  body.woocommerce-account :is(', genericStart);
  const generic = accountCss.slice(genericStart, genericEnd);
  assert.ok(genericStart >= 0 && genericEnd > genericStart, 'generic field selector exists');
  assert.doesNotMatch(generic, /select2-selection--single/);
  assert.ok(generic.includes('input:not([type="hidden"])') && generic.includes('select') && generic.includes('textarea'));

  const importantStart = accountCss.indexOf('body.woocommerce-account :is(.woocommerce-EditAccountForm, .woocommerce-address-fields) .form-row :is(');
  const importantOpen = accountCss.indexOf('{', importantStart);
  const importantEnd = accountCss.indexOf('}', importantOpen);
  const importantGeneric = accountCss.slice(importantStart, importantEnd);
  assert.ok(importantStart >= 0 && importantEnd > importantStart, 'important generic field contract exists');
  assert.doesNotMatch(importantGeneric, /select2-selection--single/);

  const outerStart = accountCss.indexOf('/* Select2 outer control is not a generic padded field; its rendered value owns the inset. */');
  const outerEnd = accountCss.indexOf('body.woocommerce-account :is(.woocommerce-EditAccountForm, .woocommerce-address-fields) .form-row textarea', outerStart);
  const outer = accountCss.slice(outerStart, outerEnd);
  assert.ok(outerStart >= 0 && outerEnd > outerStart, 'dedicated Select2 outer contract exists');
  assert.ok(outer.includes('.select2-selection--single {') && outer.includes('padding: 0 !important'));
  assert.ok(outer.includes('width: 100%') && outer.includes('height: 48px !important'));
  assert.ok(outer.includes('border: 1px solid #d8d9d5 !important'));
  assert.ok(outer.includes('border-radius: 9px !important'));
  assert.ok(outer.includes('background: var(--cr-app-canvas) !important'));

  const renderedStart = accountCss.lastIndexOf('body.woocommerce-account .woocommerce-address-fields .form-row .select2-selection__rendered {');
  const renderedEnd = accountCss.indexOf('}', renderedStart);
  const rendered = accountCss.slice(renderedStart, renderedEnd);
  assert.ok(renderedStart >= 0 && renderedEnd > renderedStart, 'dedicated Select2 rendered-value contract exists');
  assert.ok(rendered.includes('padding: 0 36px 0 13px !important'));
});

test('ADDRESS_SCREEN_USES_ONLY_THE_GLOBAL_BOTTOM_NAV_RESERVED_SPACE', () => {
  const addressStart = accountCss.indexOf('/* Mobile native shipping address form:');
  const addressEnd = accountCss.indexOf('/* Password app subview:', addressStart);
  assert.ok(addressStart >= 0 && addressEnd > addressStart);
  const addressBlock = accountCss.slice(addressStart, addressEnd);
  assert.match(addressBlock, /\.woocommerce-address-fields \{[\s\S]*?padding:\s*0 0 16px !important/);
  assert.doesNotMatch(addressBlock, /padding[^;]*calc\(\s*88px\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  assert.match(mainCss, /@media \(max-width:\s*767px\)[\s\S]*?body \{ padding-bottom: calc\(var\(--cr-bottom-nav\) \+ env\(safe-area-inset-bottom\)\); \}/);
  assert.match(mainCss, /--cr-bottom-nav:\s*72px/);
});

test('SHIPPING_ADDRESS_2_HAS_ONE_OPTIONAL_LABEL_AND_NO_PLACEHOLDER_COPY', () => {
  const start = accountPresentation.indexOf("function cr2026_account_shipping_address_fields");
  const end = accountPresentation.indexOf("\nadd_filter( 'woocommerce_shipping_fields'", start);
  const field = accountPresentation.slice(start, end);
  assert.ok(start >= 0 && end > start, 'shipping_address_2 field filter exists');
  assert.match(field, /\$address_2\['label'\]\s*=\s*__\(\s*'Dirección adicional \/ Piso, puerta, etc\.'/);
  assert.match(field, /\$address_2\['placeholder'\]\s*=\s*''\s*;/);
  assert.match(field, /\$address_2\['required'\]\s*=\s*false\s*;/);
  assert.doesNotMatch(field, /\$address_2\['label'\][^;]*\(opcional\)/);
  assert.doesNotMatch(field, /\$address_2\['placeholder'\][^;]*Dirección adicional/);
  assert.match(birthdayContract, /'Dirección adicional \/ Piso, puerta, etc\.' === \$shipping_fields\['shipping_address_2'\]\['label'\]/);
  assert.match(birthdayContract, /'' === \$shipping_fields\['shipping_address_2'\]\['placeholder'\]/);
});

test('SHIPPING_SELECT_PADDING_OVERRIDE_IS_LAST_AND_PRESERVES_SELECT2_ARROW', () => {
  const marker = '/* Final shipping-select content-axis override: preserve native controls and Select2 chevron. */';
  const start = accountCss.lastIndexOf(marker);
  const block = accountCss.slice(start);
  assert.ok(start > 0, 'final shipping-select override exists');
  assert.match(block, /\.woocommerce-address-fields select \{[\s\S]*?padding-inline-start:\s*13px !important;[\s\S]*?text-indent:\s*0 !important;/);
  assert.match(block, /\.woocommerce-address-fields \.select2-selection__rendered \{[\s\S]*?padding:\s*0 36px 0 13px !important;[\s\S]*?text-indent:\s*0 !important;/);
  assert.doesNotMatch(block, /appearance\s*:/i);
});
