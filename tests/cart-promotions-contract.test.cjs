const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const cartUi = fs.readFileSync(path.join(theme, 'assets/js/cart-ui.js'), 'utf8');
const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');

const renderStart = cartUi.indexOf('const renderPromotions = (payload) => {');
const renderEnd = cartUi.indexOf('\n  // Mirrors the commonMain', renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart, 'promotion renderer must remain present');
const renderPromotions = cartUi.slice(renderStart, renderEnd);

test('cart promotions main title remains in the native theme template', () => {
  assert.ok(cartTemplate.includes("Promociones y descuentos"));
  assert.ok(cartTemplate.includes('data-cr-cart-promotions-list'));
});

test('Promociones disponibles is removed at its theme-owned render source', () => {
  assert.equal(cartUi.includes('Promociones disponibles'), false);
  assert.equal(renderPromotions.includes('cr-cart-promotions__subheading'), false);
});

test('promotion cards, title, description and apply action remain rendered', () => {
  assert.ok(renderPromotions.includes("node('article', 'cr-cart-promo-card'"));
  assert.ok(renderPromotions.includes("node('h4', 'cr-cart-promo-card__title', promotion.title)"));
  assert.ok(renderPromotions.includes("node('p', 'cr-cart-promo-card__description', promotion.description)"));
  assert.ok(renderPromotions.includes("createButton('Aplicar', 'cr-cart-apply-button'"));
  assert.ok(renderPromotions.includes("applyCoupon(promotion.code, 'Promoción'"));
});

test('welcome icon is a left sibling of the text body, not above the title inside it', () => {
  assert.ok(renderPromotions.includes("if (isWelcome) card.appendChild(cartIcon('tag', 'cr-cart-promo-card__icon'))"));
  assert.ok(renderPromotions.includes('card.appendChild(body);'));
  assert.equal(renderPromotions.includes("body.appendChild(cartIcon('tag', 'cr-cart-promo-card__icon'))"), false);
  assert.ok(cartCss.includes('body.woocommerce-cart .cr-cart-promo-card > .cr-cart-promo-card__icon'));
  assert.ok(cartCss.includes('body.woocommerce-cart .cr-cart-promo-card > .cr-cart-promo-card__body'));
  assert.ok(cartCss.includes('body.woocommerce-cart .cr-cart-promo-card > .cr-cart-apply-button'));
});

test('promotion card uses icon, copy and action zones with vertical centering', () => {
  const start = cartCss.lastIndexOf('body.woocommerce-cart .cr-cart-promo-card {');
  const end = cartCss.indexOf('}', start);
  const rule = cartCss.slice(start, end);
  assert.match(rule, /display:\s*flex/);
  assert.match(rule, /align-items:\s*center/);
  assert.match(rule, /gap:\s*12px/);
  assert.match(cartCss, /flex:\s*1 1 auto/);
  assert.match(cartCss, /align-self:\s*center/);
});

test('promotion spacing reuses the existing 12px wallet stack gaps', () => {
  assert.match(cartCss, /\.cr-cart-wallet \{\s*margin-bottom:12px;/);
  assert.match(cartCss, /\.cr-cart-wallet__rewards,\.cr-cart-wallet__redeem \{ margin-top:12px; \}/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-promotions__available \{\s*margin: 0;/);
});

test('wallet rendering and coupon entry/action remain intact', () => {
  const walletStart = cartUi.indexOf('const renderWallet = (wallet) => {');
  const walletEnd = cartUi.indexOf('\n  const refreshWallet', walletStart);
  assert.ok(walletStart >= 0 && walletEnd > walletStart);
  const wallet = cartUi.slice(walletStart, walletEnd);
  assert.ok(wallet.includes("node('h3', 'cr-cart-wallet__title', 'Monedero')"));
  assert.ok(wallet.includes("node('h4', 'cr-cart-promotions__subheading', 'Saldo listo para usar')"));
  assert.ok(wallet.includes("createButton('Aplicar','cr-cart-apply-button'"));
  assert.ok(cartTemplate.includes('class="cr-cart-manual-coupon"'));
  assert.ok(cartTemplate.includes('Tengo otro código de descuento'));
  assert.ok(cartTemplate.includes('data-cr-cart-manual-form'));
});

test('all promotion presentation changes remain cart-scoped', () => {
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-promo-card/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-promotions__available/);
});
