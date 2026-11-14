(() => {
  'use strict';

  const config = window.CR2026AccountLoyalty;
  const root = document.querySelector('[data-cr-account-loyalty]');
  if (!config || !root) return;

  let storeNonce = config.storeNonce || '';
  let wallet = null;
  let promotions = [];
  let cart = null;
  let busyCodes = new Set();

  const text = (value) => String(value == null ? '' : value);
  const node = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = text(value);
    return element;
  };
  const icon = (kind, className) => {
    const wrapper = node('span', className || 'cr-account-loyalty__icon', null);
    wrapper.setAttribute('aria-hidden', 'true');
    const paths = {
      wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h18M15 13h3"/></svg>',
      tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l10 10-7 7L3 12Z"/><circle cx="8" cy="8" r="1"/></svg>',
      percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>'
    };
    wrapper.innerHTML = paths[kind] || paths.tag;
    return wrapper;
  };
  const moneyMinor = (value) => {
    const normalized = text(value).trim().replace(',', '.');
    const negative = normalized.startsWith('-');
    const parts = normalized.replace(/^[+-]/, '').split('.', 2);
    const whole = (parts[0] || '').replace(/\D/g, '') || '0';
    const fraction = (parts[1] || '').replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
    const minor = Number(whole) * 100 + Number(fraction || '0');
    return Number.isFinite(minor) ? (negative ? -minor : minor) : 0;
  };
  const money = (value, currency = config.currency || 'EUR') => {
    const amount = Number(text(value).trim().replace(',', '.'));
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(Number.isFinite(amount) ? amount : 0);
  };
  const responsePayload = async (response) => {
    const nextNonce = response.headers.get('Nonce');
    if (nextNonce) storeNonce = nextNonce;
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const message = payload && (payload.message || payload.data && payload.data.message);
      throw new Error(message || 'No se ha podido completar la operación.');
    }
    return payload;
  };
  const request = async (url, options = {}, useStoreApi = false) => {
    const headers = new Headers(options.headers || {});
    if (!useStoreApi && config.wpRestNonce) headers.set('X-WP-Nonce', config.wpRestNonce);
    if (useStoreApi) {
      if (storeNonce) headers.set('Nonce', storeNonce);
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(url, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
    return responsePayload(response);
  };
  const normalizedCode = (code) => text(code).trim().replace(/\s+/g, ' ').toLowerCase();
  const couponCodes = () => Array.isArray(cart && cart.coupons) ? cart.coupons.map(coupon => normalizedCode(coupon.code)) : [];
  const isApplied = (code) => !!normalizedCode(code) && couponCodes().includes(normalizedCode(code));

  const button = (label, code, kind) => {
    const control = node('button', 'cr-account-loyalty__apply', label);
    control.type = 'button';
    control.dataset.code = code;
    control.dataset.kind = kind;
    control.disabled = busyCodes.has(normalizedCode(code));
    if (control.disabled) control.setAttribute('aria-busy', 'true');
    control.addEventListener('click', () => applyCoupon(code, control));
    return control;
  };
  const setAppliedState = (control, code) => {
    if (!control) return;
    if (isApplied(code)) {
      control.textContent = 'Aplicado';
      control.disabled = true;
      control.setAttribute('aria-label', 'Cupón aplicado al carrito');
      control.removeAttribute('aria-busy');
    } else {
      control.textContent = 'Aplicar';
      control.disabled = false;
      control.removeAttribute('aria-label');
      control.removeAttribute('aria-busy');
    }
  };
  const applyCoupon = async (code, control) => {
    const cleanCode = text(code).trim();
    if (!cleanCode || busyCodes.has(normalizedCode(cleanCode)) || isApplied(cleanCode)) return;
    const key = normalizedCode(cleanCode);
    busyCodes.add(key);
    if (control) { control.disabled = true; control.textContent = 'Aplicando…'; control.setAttribute('aria-busy', 'true'); }
    announce('');
    try {
      const url = new URL(config.applyCouponUrl, window.location.origin);
      url.searchParams.set('code', cleanCode);
      const updatedCart = await request(url.toString(), { method: 'POST' }, true);
      const applied = Array.isArray(updatedCart.coupons) && updatedCart.coupons.some(coupon => normalizedCode(coupon.code) === key);
      if (!applied) {
        const apiMessage = Array.isArray(updatedCart.errors) ? updatedCart.errors.map(error => error.message).filter(Boolean).join(' ') : '';
        throw new Error(apiMessage || 'WooCommerce no ha confirmado la aplicación de este descuento.');
      }
      cart = updatedCart;
      announce('Descuento aplicado al carrito.');
      refreshAppliedStates();
    } catch (error) {
      announce(error.message || 'No se ha podido aplicar el descuento.', true);
      if (control) { control.disabled = false; control.textContent = 'Aplicar'; control.removeAttribute('aria-busy'); }
    } finally {
      busyCodes.delete(key);
    }
  };
  const announce = (message, isError = false) => {
    let status = root.querySelector('[data-cr-account-loyalty-status]');
    if (!status) {
      status = node('p', 'cr-account-loyalty__status', '');
      status.dataset.crAccountLoyaltyStatus = '';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      root.appendChild(status);
    }
    status.textContent = text(message);
    status.classList.toggle('is-error', isError);
    status.hidden = !message;
  };
  const refreshAppliedStates = () => {
    root.querySelectorAll('[data-code][data-kind]').forEach(control => setAppliedState(control, control.dataset.code));
  };
  const renderWallet = (payload) => {
    const card = node('article', 'cr-account-loyalty__wallet-card');
    const top = node('div', 'cr-account-loyalty__wallet-top');
    top.appendChild(icon('wallet', 'cr-wallet-icon-badge cr-account-loyalty__wallet-icon'));
    const copy = node('div', 'cr-account-loyalty__wallet-copy');
    copy.appendChild(node('h2', 'cr-account-loyalty__wallet-title', 'Monedero'));
    const current = moneyMinor(payload.wallet_value || '0.00');
    const threshold = moneyMinor(payload.minimum_redeem_value || '0.00');
    copy.appendChild(node('p', 'cr-account-loyalty__wallet-value', money(payload.wallet_value || '0.00') + ' de ' + money(payload.minimum_redeem_value || '0.00')));
    top.appendChild(copy);
    card.appendChild(top);
    if (threshold > 0 && current < threshold) {
      const ratio = Math.max(0, Math.min(1, current / threshold));
      const track = node('div', 'cr-account-loyalty__progress');
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', 'Progreso hacia el saldo desbloqueado');
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      track.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      const fill = node('span', 'cr-account-loyalty__progress-fill', null);
      fill.style.width = (ratio * 100) + '%';
      track.appendChild(fill);
      card.appendChild(track);
      card.appendChild(node('p', 'cr-account-loyalty__remaining', 'Te faltan ' + money((threshold - current) / 100) + ' para desbloquear tu saldo.'));
    }
    return card;
  };
  const rewardList = (payload) => {
    const raw = Array.isArray(payload && payload.pending_rewards) ? payload.pending_rewards : [];
    const seen = new Set();
    return raw.filter(reward => {
      const code = normalizedCode(reward && reward.code);
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    });
  };
  const promotionList = (payload) => {
    const list = Array.isArray(payload) ? payload : (Array.isArray(payload && payload.promotions) ? payload.promotions : []);
    return list.slice().sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  };
  const promotionIcon = (promotion) => {
    const key = [promotion.code, promotion.title, promotion.description].map(text).join(' ').toLowerCase();
    if (key.includes('blackcrios') || key.includes('black friday')) return 'percent';
    if (key.includes('bienvenida') || key.includes('welcome')) return 'tag';
    if (key.includes('cumple') || key.includes('birthday')) return 'tag';
    return 'tag';
  };
  const renderRewards = (rewards) => {
    if (!rewards.length) return null;
    const section = node('section', 'cr-account-loyalty__section');
    section.appendChild(node('h2', 'cr-account-loyalty__section-title', 'Saldo listo para usar'));
    const list = node('div', 'cr-account-loyalty__rewards-card');
    rewards.forEach((reward, index) => {
      const row = node('div', 'cr-account-loyalty__reward-row');
      row.appendChild(icon('wallet', 'cr-account-loyalty__reward-icon'));
      row.appendChild(node('strong', 'cr-account-loyalty__reward-label', 'Saldo disponible · ' + money(reward.amount || '0.00')));
      row.appendChild(button(isApplied(reward.code) ? 'Aplicado' : 'Aplicar', reward.code, 'reward'));
      if (index < rewards.length - 1) row.classList.add('has-divider');
      list.appendChild(row);
    });
    section.appendChild(list);
    return section;
  };
  const renderPromotions = (list) => {
    if (!list.length) return null;
    const section = node('section', 'cr-account-loyalty__section');
    section.appendChild(node('h2', 'cr-account-loyalty__section-title', 'Promociones disponibles (' + list.length + ')'));
    list.forEach(promotion => {
      const card = node('article', 'cr-account-loyalty__promotion-card');
      card.appendChild(icon(promotionIcon(promotion), 'cr-account-loyalty__promotion-icon'));
      const body = node('div', 'cr-account-loyalty__promotion-copy');
      body.appendChild(node('h3', 'cr-account-loyalty__promotion-title', promotion.title || 'Promoción'));
      if (promotion.description) body.appendChild(node('p', 'cr-account-loyalty__promotion-description', promotion.description));
      if (promotion.expires_at) body.appendChild(node('p', 'cr-account-loyalty__promotion-expiry', 'Válido hasta ' + displayDate(promotion.expires_at)));
      card.appendChild(body);
      if (promotion.code) card.appendChild(button(isApplied(promotion.code) ? 'Aplicado' : 'Aplicar', promotion.code, 'promotion'));
      section.appendChild(card);
    });
    return section;
  };
  const displayDate = (value) => {
    const date = text(value).trim().slice(0, 10);
    const parts = date.split('-');
    return parts.length === 3 && parts[0].length === 4 ? parts[2] + '/' + parts[1] + '/' + parts[0] : text(value);
  };
  const render = (walletPayload, promotionPayload) => {
    root.replaceChildren();
    if (walletPayload) root.appendChild(renderWallet(walletPayload));
    const rewards = rewardList(walletPayload);
    const promotionItems = promotionList(promotionPayload);
    const rewardsSection = renderRewards(rewards);
    const promotionsSection = renderPromotions(promotionItems);
    if (rewardsSection) root.appendChild(rewardsSection);
    if (promotionsSection) root.appendChild(promotionsSection);
    if (!rewards.length && !promotionItems.length) {
      root.appendChild(node('p', 'cr-account-loyalty__empty', 'No tienes saldo disponible ni promociones activas en este momento.'));
    }
    if (!walletPayload && !promotionPayload) {
      root.appendChild(node('p', 'cr-account-loyalty__empty', 'No se han podido cargar tus cupones y promociones.'));
      const retry = node('button', 'cr-account-loyalty__retry', 'Reintentar');
      retry.type = 'button';
      retry.addEventListener('click', load);
      root.appendChild(retry);
    }
    if (walletPayload && !promotionPayload) {
      root.appendChild(node('p', 'cr-account-loyalty__empty', 'No se han podido cargar las promociones.'));
    }
    refreshAppliedStates();
  };
  const load = async () => {
    root.replaceChildren(node('p', 'cr-account-loyalty__loading', 'Cargando monedero y promociones…'));
    const results = await Promise.allSettled([
      config.authenticated ? request(config.loyaltyUrl) : Promise.reject(new Error('Inicia sesión para consultar tu monedero.')),
      request(config.promotionsUrl),
      request(config.storeCartUrl, { method: 'GET' }, true)
    ]);
    wallet = results[0].status === 'fulfilled' ? results[0].value : null;
    promotions = results[1].status === 'fulfilled' ? results[1].value : null;
    cart = results[2].status === 'fulfilled' ? results[2].value : null;
    render(wallet, promotions);
    if (results[0].status === 'rejected') announce(results[0].reason.message || 'No se ha podido cargar el monedero.', true);
    if (results[1].status === 'rejected') announce(results[1].reason.message || 'No se han podido cargar las promociones.', true);
    if (results[2].status === 'rejected') announce('No se ha podido consultar el carrito para confirmar los cupones aplicados.', true);
  };

  load();
})();
