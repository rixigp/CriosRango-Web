const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const cssRoot = path.join(__dirname, '..', 'theme', 'crios-rango-2026', 'assets', 'css');
const files = ['main.css', 'account.css', 'cart.css', 'checkout.css', 'product-detail-skin.css', 'login.css'];
const cssByFile = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(cssRoot, file), 'utf8')]));
const shellProperties = new Set([
  'background', 'background-color', 'width', 'max-width', 'min-width',
  'margin', 'margin-inline', 'margin-left', 'margin-right', 'margin-top',
  'padding', 'padding-inline', 'padding-left', 'padding-right',
  'padding-top', 'padding-block', 'padding-block-start', 'padding-block-end',
  'height', 'min-height', 'gap', 'column-gap', 'row-gap',
  'font-size', 'font-weight', 'line-height', 'position', 'top', 'left',
  'right', 'bottom', 'transform'
]);

function rules(css) {
  const found = [];
  const pattern = /([^{}]+)\\{([^{}]*)\\}/g;
  let match;
  while ((match = pattern.exec(css)) !== null) {
    const selector = match[1].replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').trim().replace(/\\s+/g, ' ');
    const declarations = match[2].split(';').map(item => item.trim()).filter(Boolean).map(item => {
      const colon = item.indexOf(':');
      return colon < 0 ? null : { property: item.slice(0, colon).trim().toLowerCase(), value: item.slice(colon + 1).trim() };
    }).filter(Boolean);
    found.push({ selector, declarations });
  }
  return found;
}

const contextual = /(?:^|[,\\s])body\\.(?:woocommerce-cart|woocommerce-checkout|woocommerce-account|cr-account-[\\w-]+|cr-order-[\\w-]+|cr-information-[\\w-]+|cr-product-detail-app|search|error404)/;
const shellSelector = /\\.cr-(?:main(?:--woocommerce)?|page-shell|shell|parent-category__toolbar|parent-category__back|parent-category__title)/;
const prohibited = [];
for (const [file, css] of Object.entries(cssByFile)) {
  for (const rule of rules(css)) {
    if (!contextual.test(rule.selector)) continue;
    for (const declaration of rule.declarations) {
      if (!shellProperties.has(declaration.property)) continue;
      const selectorIsProductContent = /\\.cr-main--woocommerce\\s+div\\.product/.test(rule.selector);
      if (shellSelector.test(rule.selector) && !selectorIsProductContent) {
        prohibited.push({ file, selector: rule.selector, property: declaration.property, value: declaration.value });
      }
      if (/^body\\.(?:woocommerce-cart|woocommerce-checkout|woocommerce-account|cr-account-[\\w-]+|cr-product-detail-app|search|error404)(?:\\s|,|$)/.test(rule.selector) && ['background','background-color'].includes(declaration.property)) {
        prohibited.push({ file, selector: rule.selector, property: declaration.property, value: declaration.value });
      }
      if (declaration.property === 'padding-bottom' || declaration.property === 'padding') {
        if (/calc\\(\\s*(?:72|88|92|96|100)px|(?:72|88|92|96|100|108)px/.test(declaration.value) &&
            /(?:cr-account-home|cr-account-profile-home|woocommerce-EditAccountForm|wpfda-delete-account-container|cr-order)/.test(rule.selector)) {
          prohibited.push({ file, selector: rule.selector, property: declaration.property, value: declaration.value });
        }
      }
    }
  }
}
test('PAGE_SPECIFIC_BODY_BACKGROUND=0', () => {
  const hits = prohibited.filter(item => ['background','background-color'].includes(item.property) && /^body\\./.test(item.selector));
  assert.deepEqual(hits, []);
});
test('PAGE_SPECIFIC_PAGE_SHELL_TOP_PADDING=0', () => {
  const hits = prohibited.filter(item => /page-shell|cr-main/.test(item.selector) && /padding|margin-top/.test(item.property));
  assert.deepEqual(hits, []);
});
test('PAGE_SPECIFIC_TOOLBAR_GEOMETRY=0', () => {
  const hits = prohibited.filter(item => /parent-category__toolbar|parent-category__back|parent-category__title/.test(item.selector));
  assert.deepEqual(hits, []);
});
test('PAGE_SPECIFIC_BOTTOM_NAV_CLEARANCE=0', () => {
  const hits = prohibited.filter(item => /calc\\(\\s*(?:72|88|92|96|100)px|(?:72|88|92|96|100|108)px/.test(item.value));
  assert.deepEqual(hits, []);
});
