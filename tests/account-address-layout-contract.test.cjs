const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const accountCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/account.css'), 'utf8');
const controlsCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/controls.css'), 'utf8');
const mainCss = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/assets/css/main.css'), 'utf8');
const accountPresentation = fs.readFileSync(path.join(root, 'theme/crios-rango-2026/inc/account-presentation.php'), 'utf8');
const birthdayContract = fs.readFileSync(path.join(root, 'tests/account-birthday-contract.test.php'), 'utf8');

function findCssBlockEnd(source, openIndex) {
  let depth = 1;
  let quote = null;
  let comment = false;
  for (let i = openIndex + 1; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (comment) {
      if (ch === '*' && next === '/') { comment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (ch === '\\\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '*') { comment = true; i += 1; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}' && --depth === 0) return i;
  }
  return -1;
}

function findCssOpeningBrace(source, start) {
  let quote = null;
  let comment = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (comment) {
      if (ch === '*' && next === '/') { comment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (ch === '\\\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '*') { comment = true; i += 1; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') return i;
  }
  return -1;
}

function splitCssDeclarations(source) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  let comment = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (comment) {
      if (ch === '*' && next === '/') { comment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (ch === '\\\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '*') { comment = true; i += 1; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { parts.push(source.slice(start, i)); start = i + 1; }
  }
  parts.push(source.slice(start));
  return parts.map(part => {
    const colon = part.indexOf(':');
    if (colon < 0) return null;
    return {
      property: part.slice(0, colon).trim().toLowerCase(),
      value: part.slice(colon + 1).trim().replace(/\s*!important\s*$/i, ''),
    };
  }).filter(Boolean);
}

function parseAccountCssRules(source) {
  const rules = [];
  function visit(block) {
    let cursor = 0;
    while (cursor < block.length) {
      while (cursor < block.length && /\s/.test(block[cursor])) cursor += 1;
      if (block.startsWith('/*', cursor)) {
        const endComment = block.indexOf('*/', cursor + 2);
        if (endComment < 0) break;
        cursor = endComment + 2;
        continue;
      }
      const open = findCssOpeningBrace(block, cursor);
      if (open < 0) break;
      const close = findCssBlockEnd(block, open);
      if (close < 0) break;
      const selector = block.slice(cursor, open).trim();
      const body = block.slice(open + 1, close);
      if (selector.startsWith('@')) visit(body);
      else if (selector) rules.push({ selector, declarations: splitCssDeclarations(body) });
      cursor = close + 1;
    }
  }
  visit(source);
  return rules;
}

function cssPaddingLeft(rule) {
  const explicit = rule.declarations.find(item => item.property === 'padding-left');
  if (explicit) return explicit.value.toLowerCase();
  const shorthand = [...rule.declarations].reverse().find(item => item.property === 'padding');
  if (!shorthand) return null;
  const values = shorthand.value.trim().split(/\s+/);
  if (values.length === 1) return values[0].toLowerCase();
  if (values.length === 2) return values[1].toLowerCase();
  if (values.length === 3) return values[1].toLowerCase();
  return values[3].toLowerCase();
}

test('ADDRESS_PROVINCE_AND_COUNTRY_TEXT_SHARE_THE_INPUT_INLINE_START', () => {
  assert.match(controlsCss, /--cr-control-padding:\s*12px 13px 9px/);
  assert.match(controlsCss, /--cr-control-select-padding:\s*12px 36px 9px 13px/);
  assert.match(controlsCss, /body\.woocommerce-account :is\(\.woocommerce-EditAccountForm,\.woocommerce-address-fields\) \.form-row/);
  assert.match(controlsCss, /\.woocommerce form \.form-row \.select2-selection__arrow/);
  assert.doesNotMatch(accountCss, /padding-inline-start:\s*13px !important/);
  assert.doesNotMatch(accountCss, /\.woocommerce-address-fields \.select2-selection__rendered\s*\{/);
});

test('SELECT2_OUTER_AND_RENDERED_VALUE_HAVE_SEPARATE_PADDING_CONTRACTS', () => {
  assert.match(controlsCss, /\.woocommerce form \.form-row \.select2-selection--single\s*\{[^}]*padding:0 !important/);
  assert.match(controlsCss, /\.woocommerce form \.form-row \.select2-selection__rendered\s*\{[^}]*padding:var\(--cr-control-select-padding\)/);
  assert.match(controlsCss, /--cr-control-padding:\s*12px 13px 9px/);
  assert.match(controlsCss, /--cr-control-select-padding:\s*12px 36px 9px 13px/);
});

test('ADDRESS_SCREEN_USES_ONLY_THE_GLOBAL_BOTTOM_NAV_RESERVED_SPACE', () => {
  const addressStart = accountCss.indexOf('/* Mobile native shipping address form:');
  const addressEnd = accountCss.indexOf('/* Password app subview:', addressStart);
  assert.ok(addressStart >= 0 && addressEnd > addressStart);
  const addressBlock = accountCss.slice(addressStart, addressEnd);
  assert.match(addressBlock, /\.woocommerce-address-fields \{[\s\S]*?padding:\s*0 0 16px !important/);
  assert.doesNotMatch(addressBlock, /padding[^;]*calc\(\s*88px\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  const globalShellStart = mainCss.indexOf('/* GLOBAL MOBILE APP SHELL — CANONICAL CONTRACT');
  const globalShell = mainCss.slice(globalShellStart);
  assert.ok(globalShellStart >= 0, 'canonical global mobile shell exists');
  assert.match(globalShell, /@media \(max-width:\s*767px\)[\s\S]*?body\s*\{(?=[^}]*padding-bottom:\s*calc\(var\(--cr-bottom-nav\)\s*\+\s*env\(safe-area-inset-bottom\)\);)[^}]*\}/);
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
