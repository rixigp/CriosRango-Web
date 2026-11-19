const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const checkoutCss = fs.readFileSync(path.join(theme, 'assets/css/checkout.css'), 'utf8');
const checkoutLayoutJs = fs.readFileSync(path.join(theme, 'assets/js/checkout-desktop-layout.js'), 'utf8');
const assets = fs.readFileSync(path.join(theme, 'inc/assets.php'), 'utf8');

test('desktop checkout is a natural two-column 2x2 grid from 1280px only', () => {
  const marker = '/* Checkout desktop 2x2 composition */';
  const desktopStart = checkoutCss.indexOf(marker);
  assert.notEqual(desktopStart, -1);
  const desktop = checkoutCss.slice(desktopStart);
  assert.match(desktop, /@media \(min-width: 1280px\)/);
  assert.match(desktop, /form\.checkout\.woocommerce-checkout\.cr-checkout-layout-ready[\s\S]*?display:\s*grid/);
  assert.match(desktop, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(desktop, /grid-template-areas:[\s\S]*?"delivery shipping"[\s\S]*?"summary payment"/);
  assert.match(desktop, /grid-template-rows:\s*auto\s+auto/);
  assert.match(desktop, /align-items:\s*start/);
  assert.match(desktop, /column-gap:\s*24px/);
  assert.match(desktop, /row-gap:\s*24px/);
  assert.match(desktop, /\.cr-checkout-layout__shipping\s*\{\s*grid-area:\s*shipping/);
  assert.match(desktop, /\.cr-checkout-layout__summary\s*\{\s*grid-area:\s*summary/);
  assert.match(desktop, /\.cr-checkout-layout__payment\s*\{\s*grid-area:\s*payment/);
  assert.match(desktop, /#customer_details\s*\{\s*display:\s*contents/);
  assert.match(desktop, /#order_review\s*\{\s*display:\s*contents/);
});

test('checkout remains vertical below 1280px and keeps shipping before summary before payment', () => {
  const marker = '/* Checkout desktop 2x2 composition */';
  const desktopStart = checkoutCss.indexOf(marker);
  assert.notEqual(desktopStart, -1);
  const preDesktop = checkoutCss.slice(0, desktopStart);
  assert.doesNotMatch(preDesktop, /form\.checkout\.woocommerce-checkout[^}]*display:\s*grid/);
  assert.doesNotMatch(preDesktop, /grid-template-areas:/);
  assert.doesNotMatch(preDesktop, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(checkoutCss.slice(desktopStart), /@media \(min-width: 1280px\)/);
});

test('layout grouping puts the real additional-info node immediately after the shipping section', () => {
  assert.match(checkoutLayoutJs, /directChild\(customerDetails, '\.col-2'\)/);
  assert.match(checkoutLayoutJs, /shippingColumn\.appendChild\(customerShipping\)/);
  assert.match(checkoutLayoutJs, /shippingColumn\.insertBefore\(shippingSection/);
  assert.match(checkoutLayoutJs, /var additionalInfo = form\.querySelector\('\.woocommerce-additional-fields'\)/);
  assert.match(checkoutLayoutJs, /var activeShippingSection = shippingColumn\.querySelector\('\.cr-checkout-shipping-section'\)/);
  assert.match(checkoutLayoutJs, /shippingColumn\.insertBefore\(additionalInfo, activeShippingSection\.nextSibling\)/);
  assert.doesNotMatch(checkoutLayoutJs, /cloneNode\s*\(/);
});

test('order notes textarea has a full-height 88px minimum without reducing typography or clipping', () => {
  function ruleBody(selector) {
    const marker = selector + ' {';
    const start = checkoutCss.indexOf(marker);
    assert.notEqual(start, -1, 'missing CSS rule: ' + selector);
    const bodyStart = start + marker.length;
    const bodyEnd = checkoutCss.indexOf('}', bodyStart);
    assert.notEqual(bodyEnd, -1, 'unclosed CSS rule: ' + selector);
    return checkoutCss.slice(bodyStart, bodyEnd);
  }
  const shell = ruleBody('body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-additional-info__panel .cr-control-shell:has(textarea#order_comments)');
  const textarea = ruleBody('body.woocommerce-checkout:not(.woocommerce-order-received) .cr-checkout-additional-info__panel textarea#order_comments');
  assert.match(shell, /height:\s*auto\s*!important/);
  assert.match(shell, /min-height:\s*88px\s*!important/);
  assert.match(textarea, /min-height:\s*88px\s*!important/);
  assert.match(textarea, /height:\s*100%\s*!important/);
  assert.match(textarea, /line-height:\s*24px\s*!important/);
  assert.match(textarea, /padding:\s*12px 16px\s*!important/);
  assert.match(textarea, /box-sizing:\s*border-box\s*!important/);
  assert.doesNotMatch(textarea, /font-size:\s*(?:[0-9]|[.]?[0-9])/);
  assert.doesNotMatch(textarea, /overflow:\s*hidden|transform:|margin[^;]*-/);
});
test('layout grouping preserves native review and payment fragments across checkout AJAX refreshes', () => {
  assert.match(checkoutLayoutJs, /\.woocommerce-checkout-review-order-table/);
  assert.match(checkoutLayoutJs, /\.cr-checkout-shipping-section-row/);
  assert.match(checkoutLayoutJs, /#payment\.woocommerce-checkout-payment/);
  assert.match(checkoutLayoutJs, /updated_checkout\.crCheckoutLayout/);
  assert.match(checkoutLayoutJs, /summaryColumn\.appendChild\(reviewTable\)/);
  assert.match(checkoutLayoutJs, /paymentColumn\.appendChild\(payment\)/);
  assert.doesNotMatch(checkoutLayoutJs, /preventDefault\(|\.trigger\(|radio\.(?:value|checked)\s*=|#place_order/);
});


test('shipping fragment refresh replaces the moved section instead of accumulating stale copies', () => {
  assert.match(checkoutLayoutJs, /function removeStaleShippingSections\(shippingColumn, currentSection\)/);
  assert.match(checkoutLayoutJs, /if \(!shippingColumn\) return;/);
  assert.match(checkoutLayoutJs, /shippingColumn\.querySelectorAll\('\.cr-checkout-shipping-section'\)/);
  assert.match(checkoutLayoutJs, /if \(existingSection !== currentSection\) existingSection\.remove\(\)/);
  assert.match(checkoutLayoutJs, /reviewTable\.dataset\.crCheckoutShippingLayoutProcessed = 'true'/);
  assert.match(checkoutLayoutJs, /reviewTable\.dataset\.crCheckoutShippingLayoutProcessed !== 'true'/);
  assert.match(checkoutLayoutJs, /updated_checkout\.crCheckoutLayout/);
  assert.doesNotMatch(checkoutLayoutJs, /cloneNode\s*\(/);
});

test('desktop layout script is enqueued with the existing checkout-only assets', () => {
  assert.match(assets, /cr2026-checkout-desktop-layout/);
  assert.match(assets, /assets\/js\/checkout-desktop-layout\.js/);
  assert.match(assets, /if \( \$uses_checkout_shell \) \{[\s\S]*?cr2026-checkout-desktop-layout/);
});
