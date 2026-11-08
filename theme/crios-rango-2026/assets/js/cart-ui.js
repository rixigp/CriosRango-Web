(() => {
  'use strict';

  const config = window.CR2026Cart;
  const root = document.querySelector('[data-cr-cart-promotions]');
  if (!config || !root) return;

  const loading = root.querySelector('[data-cr-cart-loading]');
  const walletPanel = root.querySelector('[data-cr-cart-wallet]');
  const promotionsList = root.querySelector('[data-cr-cart-promotions-list]');
  const appliedPanel = root.querySelector('[data-cr-cart-applied]');
  const feedback = root.querySelector('[data-cr-cart-feedback]');
  const manualForm = root.querySelector('[data-cr-cart-manual-form]');
  let storeNonce = config.storeNonce || '';
  let currentCart = null;
  let promotionsPayload = null;
  let pendingRedemption = null;
  let busy = false;

  const text = (value) => String(value == null ? '' : value);
  const showError = (message) => {
    feedback.textContent = text(message) || 'No se ha podido completar la operación.';
    feedback.hidden = false;
    feedback.classList.add('is-error');
  };
  const showMessage = (message) => {
    feedback.textContent = text(message);
    feedback.hidden = false;
    feedback.classList.remove('is-error');
  };
  const clearFeedback = () => {
    feedback.textContent = '';
    feedback.hidden = true;
    feedback.classList.remove('is-error');
  };
  const updateNonce = (response) => {
    const next = response.headers.get('Nonce');
    if (next) storeNonce = next;
  };
  const readResponse = async (response) => {
    updateNonce(response);
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const message = payload && (payload.message || payload.data && payload.data.message);
      throw new Error(message || 'No se ha podido completar la operación.');
    }
    return payload;
  };
  const request = async (url, options = {}, kind = 'public') => {
    const headers = new Headers(options.headers || {});
    if (kind === 'wp' && config.wpRestNonce) headers.set('X-WP-Nonce', config.wpRestNonce);
    if (kind === 'store') {
      if (storeNonce) headers.set('Nonce', storeNonce);
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
      cache: 'no-store'
    });
    return readResponse(response);
  };
  const node = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = text(value);
    return element;
  };
  const cartIcon = (name, className) => {
    const icon = node('span', className || 'cr-cart-icon', null);
    icon.setAttribute('aria-hidden', 'true');
    const paths = {
      wallet: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h18M15 13h3"/></svg>',
      info: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>',
      tag: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l10 10-7 7L3 12Z"/><circle cx="8" cy="8" r="1"/></svg>'
    };
    icon.innerHTML = paths[name] || '';
    return icon;
  };
  const formatWalletAmount = (value, currency) => {
    const amount = Number(text(value).trim().replace(',', '.'));
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(Number.isFinite(amount) ? amount : 0);
  };
  const createButton = (label, className, onClick) => {
    const button = node('button', className, label);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
  };
  const couponsFrom = (cart) => Array.isArray(cart && cart.coupons) ? cart.coupons : [];
  const hasCoupon = (cart, code) => couponsFrom(cart).some((coupon) =>
    text(coupon.code).toLowerCase() === text(code).toLowerCase()
  );
  const applyCoupon = async (code, sourceLabel) => {
    const normalized = text(code).trim();
    if (!normalized || busy) return;
    busy = true;
    clearFeedback();
    root.classList.add('is-busy');
    try {
      const url = new URL(config.applyCouponUrl, window.location.origin);
      url.searchParams.set('code', normalized);
      const cart = await request(url.toString(), { method: 'POST' }, 'store');
      currentCart = cart;
      if (!hasCoupon(cart, normalized)) {
        const backendMessage = Array.isArray(cart.errors) && cart.errors.length
          ? cart.errors.map((error) => error.message).filter(Boolean).join(' ')
          : 'WooCommerce no ha confirmado la aplicación de este descuento.';
        throw new Error(backendMessage);
      }
      showMessage((sourceLabel || 'Descuento') + ' aplicado correctamente.');
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      showError(error.message);
    } finally {
      busy = false;
      root.classList.remove('is-busy');
    }
  };
  const removeCoupon = async (code) => {
    if (!code || busy) return;
    busy = true;
    clearFeedback();
    root.classList.add('is-busy');
    try {
      const url = new URL(config.removeCouponUrl, window.location.origin);
      url.searchParams.set('code', code);
      const cart = await request(url.toString(), { method: 'POST' }, 'store');
      currentCart = cart;
      if (hasCoupon(cart, code)) {
        throw new Error('WooCommerce no ha confirmado la eliminación de este descuento.');
      }
      showMessage('Descuento eliminado.');
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      showError(error.message);
    } finally {
      busy = false;
      root.classList.remove('is-busy');
    }
  };
  const renderAppliedCoupons = (cart) => {
    appliedPanel.replaceChildren();
    const coupons = couponsFrom(cart);
    if (!coupons.length) {
      appliedPanel.hidden = true;
      return;
    }
    appliedPanel.hidden = false;
    appliedPanel.appendChild(node('h3', 'cr-cart-applied__title', 'Descuentos aplicados'));
    coupons.forEach((coupon) => {
      const row = node('div', 'cr-cart-applied__row');
      const label = node('span', 'cr-cart-applied__code', coupon.label || coupon.code);
      const remove = createButton('Quitar', 'cr-cart-action-link', () => removeCoupon(coupon.code));
      row.append(label, remove);
      appliedPanel.appendChild(row);
    });
  };
  const guestPromotionVisible = (promotion) => {
    if (promotion.personal || promotion.requires_login) return false;
    const identity = (text(promotion.id) + ' ' + text(promotion.code) + ' ' + text(promotion.title)).toLowerCase().trim();
    if (identity.includes('bienvenida') || identity.includes('welcome')) return false;
    if (identity.includes('cumple') || identity.includes('birthday')) return false;
    if (identity.includes('cr-monedero-') || identity.includes('cr-monedero')) return false;
    return true;
  };
  const renderPromotions = (payload) => {
    promotionsList.hidden = false;
    promotionsList.replaceChildren();
    const list = Array.isArray(payload) ? payload : (Array.isArray(payload.promotions) ? payload.promotions : []);
    const visible = config.authenticated ? list : list.filter(guestPromotionVisible);
    if (!visible.length && !config.authenticated) {
      promotionsList.hidden = true;
      return;
    }
    promotionsList.appendChild(node('h3', 'cr-cart-promotions__subheading', 'Promociones disponibles'));
    if (!visible.length) {
      promotionsList.appendChild(node('p', 'cr-cart-muted', 'No hay promociones disponibles en este momento.'));
      return;
    }
    visible.slice().sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0)).forEach((promotion) => {
      const identity = text(promotion.title) + ' ' + text(promotion.description) + ' ' + text(promotion.code);
      const isWelcome = /bienvenida|welcome/i.test(identity);
      const card = node('article', 'cr-cart-promo-card' + (isWelcome ? ' cr-cart-promo-card--welcome' : ''));
      const body = node('div', 'cr-cart-promo-card__body');
      if (isWelcome) body.appendChild(cartIcon('tag', 'cr-cart-promo-card__icon'));
      body.appendChild(node('h4', 'cr-cart-promo-card__title', promotion.title));
      if (promotion.description) body.appendChild(node('p', 'cr-cart-promo-card__description', promotion.description));
      if (promotion.expires_at) body.appendChild(node('p', 'cr-cart-promo-card__expiry', 'Válida hasta ' + promotion.expires_at));
      card.appendChild(body);
      if (promotion.code) {
        const applied = hasCoupon(currentCart, promotion.code);
        card.appendChild(applied
          ? node('span', 'cr-cart-applied-label', 'Aplicada')
          : createButton('Aplicar', 'cr-cart-apply-button', () => applyCoupon(promotion.code, 'Promoción')));
      }
      promotionsList.appendChild(card);
    });
  };

  // Mirrors the commonMain Kotlin parseMoneyMinorUnits / formatMoneyMinorUnits helpers.
  const parseMoneyMinorUnits = (value) => {
    const normalized = text(value).trim().replace(',', '.');
    const negative = normalized.startsWith('-');
    const unsigned = normalized.replace(/^[+-]/, '');
    const parts = unsigned.split('.', 2);
    const whole = (parts[0] || '').replace(/\D/g, '') || '0';
    const fraction = (parts[1] || '').replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
    const minor = BigInt(whole) * 100n + BigInt(fraction || '0');
    return negative ? -minor : minor;
  };
  const formatMoneyMinorUnits = (minor) => {
    const negative = minor < 0n;
    const absolute = negative ? -minor : minor;
    return (negative ? '-' : '') + (absolute / 100n).toString() + '.' + (absolute % 100n).toString().padStart(2, '0');
  };
  const addMoneyAmounts = (first, second) => formatMoneyMinorUnits(parseMoneyMinorUnits(first) + parseMoneyMinorUnits(second));
  const subtractMoneyAmounts = (first, second) => {
    const result = parseMoneyMinorUnits(first) - parseMoneyMinorUnits(second);
    return formatMoneyMinorUnits(result > 0n ? result : 0n);
  };
  const redeemableOptions = (wallet, consumerProductSubtotalAfterDiscounts = null) => {
    const conversionMinor = parseMoneyMinorUnits(wallet.conversion_value);
    const points = Number(wallet.points || 0);
    const minimum = Number(wallet.minimum_redeem_points || 0);
    const conversionPoints = Number(wallet.conversion_points || 0);
    if (points < minimum || conversionPoints <= 0 || conversionMinor <= 0n) return [];
    let cartLimitPoints = null;
    if (consumerProductSubtotalAfterDiscounts != null) {
      const eligibleMinor = parseMoneyMinorUnits(consumerProductSubtotalAfterDiscounts);
      const eligible = eligibleMinor > 0n ? eligibleMinor : 0n;
      cartLimitPoints = Number((eligible * BigInt(conversionPoints)) / conversionMinor);
    }
    const configured = Number(wallet.maximum_redeem_points || 0);
    const configuredMax = configured > 0 ? configured : Number.MAX_SAFE_INTEGER;
    const effectiveMax = Math.min(points, configuredMax, cartLimitPoints == null ? points : cartLimitPoints);
    if (effectiveMax < minimum) return [];
    const increment = Math.max(1, conversionPoints);
    const options = [];
    let candidate = increment;
    while (candidate < effectiveMax && options.length < 6) {
      if (candidate >= minimum) {
        const minor = (BigInt(candidate) * conversionMinor) / BigInt(conversionPoints);
        options.push({ points: candidate, value: formatMoneyMinorUnits(minor), isMaximum: false });
      }
      candidate += increment;
    }
    const maximumMinor = (BigInt(effectiveMax) * conversionMinor) / BigInt(conversionPoints);
    if (!options.length || options[options.length - 1].points !== effectiveMax) {
      options.push({ points: effectiveMax, value: formatMoneyMinorUnits(maximumMinor), isMaximum: true });
    } else {
      options[options.length - 1].isMaximum = true;
    }
    return options.filter((option, index, all) => all.findIndex((item) => item.points === option.points) === index);
  };
  const makeRequestId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') throw new Error('Este navegador no permite generar un identificador seguro para el canje.');
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  };
  const cartEligibleSubtotal = (cart) => {
    const totals = cart && cart.totals ? cart.totals : {};
    const subtotal = addMoneyAmounts(totals.total_items || '0', totals.total_items_tax || '0');
    const discount = ((BigInt(text(totals.total_discount || '0')) || 0n) + (BigInt(text(totals.total_discount_tax || '0')) || 0n)).toString();
    return subtractMoneyAmounts(subtotal, discount);
  };
  const renderWallet = (wallet) => {
    walletPanel.replaceChildren();
    walletPanel.hidden = false;
    const summary = node('div', 'cr-cart-wallet__summary');
    const info = node('div', 'cr-cart-wallet__info');
    summary.appendChild(cartIcon('wallet', 'cr-cart-wallet__icon'));
    summary.appendChild(info);
    const walletHeading = node('div', 'cr-cart-wallet__heading');
    walletHeading.appendChild(node('h3', 'cr-cart-wallet__title', 'Monedero'));
    walletHeading.appendChild(cartIcon('info', 'cr-cart-wallet__info-icon'));
    info.appendChild(walletHeading);
    info.appendChild(node('p', 'cr-cart-wallet__balance', formatWalletAmount(wallet.wallet_value || '0.00', wallet.currency) + ' disponibles'));
    info.appendChild(node('p', 'cr-cart-wallet__points', Number(wallet.points || 0) + ' puntos'));
    walletPanel.appendChild(summary);

    const rewards = Array.isArray(wallet.pending_rewards) ? wallet.pending_rewards : [];
    const rewardSection = node('div', 'cr-cart-wallet__rewards');
    rewardSection.appendChild(node('h4', 'cr-cart-promotions__subheading', 'Saldo listo para usar'));
    if (!rewards.length) {
      rewardSection.appendChild(node('p', 'cr-cart-muted', 'No tienes saldos listos para usar.'));
    } else {
      rewards.forEach((reward) => {
        const row = node('div', 'cr-cart-reward');
        const label = node('div', 'cr-cart-reward__label');
        label.appendChild(cartIcon('wallet', 'cr-cart-reward__icon'));
        label.appendChild(node('strong', '', 'Saldo de monedero · ' + formatWalletAmount(reward.amount, wallet.currency)));
        if (reward.expires_at) label.appendChild(node('small', '', 'Caduca: ' + reward.expires_at));
        row.appendChild(label);
        if (hasCoupon(currentCart, reward.code)) row.appendChild(node('span', 'cr-cart-applied-label', 'Aplicado'));
        else row.appendChild(createButton('Aplicar', 'cr-cart-apply-button', () => applyCoupon(reward.code, 'Crédito')));
        rewardSection.appendChild(row);
      });
    }
    walletPanel.appendChild(rewardSection);

    const eligible = currentCart ? cartEligibleSubtotal(currentCart) : null;
    const options = currentCart ? redeemableOptions(wallet, eligible) : [];
    if (options.length) {
      const redeemSection = node('div', 'cr-cart-wallet__redeem');
      redeemSection.appendChild(node('h4', 'cr-cart-promotions__subheading', 'Canjear puntos'));
      options.forEach((option) => {
        const label = option.points + ' puntos · ' + formatWalletAmount(option.value, wallet.currency);
        redeemSection.appendChild(createButton(label, 'cr-cart-redeem-button', () => redeemPoints(option.points)));
      });
      walletPanel.appendChild(redeemSection);
    }
  };
  const refreshWallet = async () => {
    if (!config.authenticated) return;
    try {
      const wallet = await request(config.loyaltyUrl, { method: 'GET' }, 'wp');
      renderWallet(wallet);
    } catch (error) {
      walletPanel.hidden = false;
      walletPanel.replaceChildren(node('p', 'cr-cart-feedback is-error', error.message));
    }
  };
  const redeemPoints = async (points) => {
    if (busy || !config.authenticated) return;
    if (!pendingRedemption || pendingRedemption.points !== points) {
      try { pendingRedemption = { points, requestId: makeRequestId() }; }
      catch (error) { showError(error.message); return; }
    }
    busy = true;
    clearFeedback();
    root.classList.add('is-busy');
    try {
      const result = await request(config.redeemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: points, request_id: pendingRedemption.requestId })
      }, 'wp');
      if (!result.success) throw new Error(result.message || 'No se ha podido completar el canje.');
      const code = result.coupon && result.coupon.code;
      pendingRedemption = null;
      await refreshWallet();
      if (!code) {
        showError('El canje se ha creado, pero el servidor no ha devuelto un código utilizable.');
        return;
      }
      try {
        const url = new URL(config.applyCouponUrl, window.location.origin);
        url.searchParams.set('code', code);
        const cart = await request(url.toString(), { method: 'POST' }, 'store');
        currentCart = cart;
        if (!hasCoupon(cart, code)) throw new Error('El crédito se ha creado, pero WooCommerce no ha confirmado su aplicación. Puedes encontrarlo en «Saldo listo para usar».');
        showMessage('Crédito aplicado correctamente.');
        window.setTimeout(() => window.location.reload(), 250);
      } catch (error) {
        await refreshWallet();
        showError(error.message);
      }
    } catch (error) {
      // Keep pendingRedemption.requestId unchanged for a safe retry of this same attempt.
      showError(error.message);
    } finally {
      busy = false;
      root.classList.remove('is-busy');
    }
  };

  const loadCart = async () => {
    const cartPromise = request(config.storeCartUrl, { method: 'GET' }, 'store')
      .then((cart) => { currentCart = cart; renderAppliedCoupons(cart); if (promotionsPayload) renderPromotions(promotionsPayload); })
      .catch((error) => showError(error.message));
    const promotionsPromise = request(config.promotionsUrl, { method: 'GET' }, config.authenticated ? 'wp' : 'public')
      .then((payload) => { promotionsPayload = payload; renderPromotions(payload); })
      .catch((error) => promotionsList.replaceChildren(node('p', 'cr-cart-feedback is-error', error.message)))
      .finally(() => { loading.hidden = true; });
    if (config.authenticated) {
      // Wait only for the cart snapshot before computing redeemable options; the
      // loyalty request remains independent of promotions and page rendering.
      cartPromise.then(() => refreshWallet());
    } else {
      walletPanel.hidden = true;
    }
    await Promise.allSettled([cartPromise, promotionsPromise]);
  };

  if (manualForm) {
    manualForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = manualForm.querySelector('[name="code"]');
      if (input) applyCoupon(input.value, 'Cupón');
    });
  }

  loadCart();

  // Keep WooCommerce's single quantity input and native POST/update_cart flow.
  let quantityTimer = null;
  document.querySelectorAll('[data-cr-cart-quantity]').forEach((stepper) => {
    stepper.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cr-qty-change]');
      if (!button) return;
      const input = stepper.querySelector('input.qty');
      if (!input || input.disabled) return;
      const step = Number(input.step) > 0 ? Number(input.step) : 1;
      const current = Number(input.value || input.min || 0);
      const min = input.min !== '' ? Number(input.min) : 0;
      const max = input.max !== '' ? Number(input.max) : Infinity;
      const next = Math.min(max, Math.max(min, current + Number(button.dataset.crQtyChange) * step));
      if (next === current) return;
      input.value = String(next);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const form = input.closest('form.woocommerce-cart-form');
      if (!form) return;
      window.clearTimeout(quantityTimer);
      quantityTimer = window.setTimeout(() => {
        const submit = form.querySelector('[name="update_cart"]');
        if (submit) submit.disabled = false;
        if (typeof form.requestSubmit === 'function') form.requestSubmit(submit || undefined);
        else if (submit) { submit.disabled = false; submit.click(); }
      }, 350);
    });
  });

  // Presentation-only shipping summary: keep WooCommerce's native radios and submission flow.
  const initShippingPresentation = () => {
    const row = document.querySelector('tr.woocommerce-shipping-totals.shipping, tr.shipping:not(.cr-cart-shipping-pending)');
    if (!row) return;
    const cell = row.querySelector('td');
    const methods = cell && cell.querySelector('ul#shipping_method');
    if (!methods) return;

    let summary = cell.querySelector('.cr-cart-shipping-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'cr-cart-shipping-summary';
      const selectedText = document.createElement('span');
      selectedText.className = 'cr-cart-shipping-summary__selected';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'cr-cart-shipping-summary__toggle';
      toggle.textContent = 'Cambiar método';
      toggle.addEventListener('click', () => {
        const expanded = row.classList.toggle('is-expanded');
        methods.hidden = !expanded;
        toggle.textContent = expanded ? 'Ocultar métodos' : 'Cambiar método';
      });
      summary.append(selectedText, toggle);
      cell.insertBefore(summary, methods);
    }

    const selected = methods.querySelector('input.shipping_method:checked, input[type="radio"]:checked');
    const selectedItem = selected && selected.closest('li');
    const selectedLabel = selectedItem ? selectedItem.textContent.replace(/\s+/g, ' ').trim() : '';
    const selectedAmount = selectedItem && selectedItem.querySelector('.woocommerce-Price-amount, .amount');
    const label = selectedAmount
      ? selectedAmount.textContent.replace(/\s+/g, ' ').trim()
      : (/\b(?:gratis|gratuito|free)\b/i.test(selectedLabel) ? 'Gratis' : 'Se calcula en el checkout');
    const selectedText = summary.querySelector('.cr-cart-shipping-summary__selected');
    if (selectedText && selectedText.textContent !== label) selectedText.textContent = label;
    const toggle = summary.querySelector('.cr-cart-shipping-summary__toggle');
    const expanded = row.classList.contains('is-expanded');
    methods.hidden = !expanded;
    if (toggle) {
      const nextLabel = expanded ? 'Ocultar métodos' : 'Cambiar método';
      if (toggle.textContent !== nextLabel) toggle.textContent = nextLabel;
    }
  };

  document.addEventListener('change', (event) => {
    if (!event.target.matches('input.shipping_method, input[name^="shipping_method"]')) return;
    const row = event.target.closest('tr.woocommerce-shipping-totals.shipping, tr.shipping');
    if (!row) return;
    row.classList.remove('is-expanded');
    const methods = row.querySelector('ul#shipping_method');
    if (methods) methods.hidden = true;
    initShippingPresentation();
  });
  initShippingPresentation();
  const shippingObserver = new MutationObserver(initShippingPresentation);
  shippingObserver.observe(document.body, { childList: true, subtree: true });
})();
