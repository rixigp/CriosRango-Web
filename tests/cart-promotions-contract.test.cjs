const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const theme = path.join(root, 'theme/crios-rango-2026');
const cartUi = fs.readFileSync(path.join(theme, 'assets/js/cart-ui.js'), 'utf8');
const cartCss = fs.readFileSync(path.join(theme, 'assets/css/cart.css'), 'utf8');
const mainCss = fs.readFileSync(path.join(theme, 'assets/css/main.css'), 'utf8');
const cartTemplate = fs.readFileSync(path.join(theme, 'woocommerce/cart/cart.php'), 'utf8');

const renderStart = cartUi.indexOf('const renderPromotions = (payload) => {');
const renderEnd = cartUi.indexOf('\n  // Mirrors the commonMain', renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart, 'promotion renderer must remain present');
const renderPromotions = cartUi.slice(renderStart, renderEnd);

test('cart promotions title is removed from the native theme template', () => {
  assert.equal(cartTemplate.includes("Promociones y descuentos"), false);
  assert.equal(cartTemplate.includes('cr-cart-promotions__skeleton-bar--title'), false);
  assert.ok(cartTemplate.includes('data-cr-cart-promotions-list'));
});

test('Promociones disponibles is removed at its theme-owned render source', () => {
  assert.equal(cartUi.includes('Promociones disponibles'), false);
  assert.equal(renderPromotions.includes('cr-cart-promotions__subheading'), false);
});

test('birthday promotion expiry is formatted in Spanish without exposing the raw ISO value', () => {
  const start = cartUi.indexOf('const formatPromotionExpiry = (value) => {');
  const end = cartUi.indexOf('\n  const formatWalletAmount', start);
  assert.ok(start >= 0 && end > start, 'Spanish expiry formatter must remain present');
  const formatterSource = cartUi.slice(start, end);
  const formatPromotionExpiry = vm.runInNewContext('(() => { ' + formatterSource + '; return formatPromotionExpiry; })()');
  assert.equal(formatPromotionExpiry('2026-12-04T20:11:40+00:00'), '4 de diciembre de 2026');
  assert.equal(formatPromotionExpiry('not-a-date'), '');
  assert.ok(renderPromotions.includes("'Válida hasta el ' + expiryDate"));
  assert.equal(renderPromotions.includes("'Válida hasta ' + promotion.expires_at"), false);
});

test('birthday promotion keeps its cake icon', () => {
  assert.ok(renderPromotions.includes("else if (isBirthday) card.appendChild(cartIcon('cake', 'cr-cart-promo-card__icon'))"));
});

test('promotion cards have a 12px sibling gap without changing the promotions container display', () => {
  assert.match(cartCss, /\.cr-cart-promo-card \+ \.cr-cart-promo-card\s*\{\s*margin-top:\s*12px;\s*\}/);
  const containerStart = cartCss.indexOf('body.woocommerce-cart .cr-cart-promotions__available {');
  const containerEnd = cartCss.indexOf('}', containerStart);
  assert.ok(containerStart >= 0 && containerEnd > containerStart, 'promotions container rule must remain present');
  assert.doesNotMatch(cartCss.slice(containerStart, containerEnd), /display\s*:/);
});

test('promotion cards, title, description and apply action remain rendered', () => {
  assert.ok(renderPromotions.includes("const cardClass = 'cr-cart-promo-card'"));
  assert.ok(renderPromotions.includes("node('article', cardClass)"));
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
  assert.ok(cartCss.includes('body.woocommerce-cart .cr-cart-promotions :is(.cr-cart-apply-button, .cr-account-loyalty__apply)'));
  assert.match(cartCss, /background-color:\s*#0F5C4D\s*!important/);
  assert.match(cartCss, /border:\s*0\s*!important/);
  assert.match(cartCss, /border-radius:\s*18px\s*!important/);
  assert.match(cartCss, /height:\s*36px\s*!important/);
  assert.match(cartCss, /padding:\s*0 11px\s*!important/);
  assert.ok(cartCss.includes(':is(:hover, :focus-visible, :active)'));
  assert.doesNotMatch(cartCss, /background:\s*#2F8A57/);
  assert.doesNotMatch(cartCss, /rgba\(132,\s*104,\s*190,\s*\.09\)/);
  assert.match(cartCss, /background:\s*#EAF3FF/);
});

test('all promotion presentation changes remain cart-scoped', () => {
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-promo-card/);
  assert.match(cartCss, /body\.woocommerce-cart \.cr-cart-promotions__available/);
});


test('main Cart product cards consume the shared global card surface tokens', () => {
  const rules = [...cartCss.matchAll(/(?:body\.woocommerce-cart )?\.cr-cart-item__card\s*\{([^}]*)\}/g)].map(match => match[1]);
  const surfaceRules = rules.filter(rule => /border(?:-color|-width)?\s*:|border-radius\s*:|background\s*:/.test(rule));
  assert.ok(surfaceRules.length >= 3, 'base, desktop and mobile surface declarations must be covered');
  for (const rule of surfaceRules) {
    assert.match(rule, /border:\s*var\(--cr-card-border-width\) solid var\(--cr-border\)/);
    assert.match(rule, /border-radius:\s*var\(--cr-card-radius\)/);
    assert.match(rule, /background:\s*var\(--cr-white\)/);
  }
  assert.ok(mainCss.includes('--cr-card-border-width: 1px;'));
  assert.ok(mainCss.includes('--cr-card-radius: 18px;'));
});
