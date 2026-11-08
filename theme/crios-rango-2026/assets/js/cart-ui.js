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
  let walletPayload = null;
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
  const minorValue = (v) => { try { return BigInt(text(v || '0')); } catch (_) { return 0n; } };
  const formatStoreMoney = (minor, t) => {
    const digits=Number(t.currency_minor_unit||2), divisor=10n**BigInt(digits), neg=minor<0n, abs=neg?-minor:minor;
    const whole=(abs/divisor).toString(), frac=digits?(abs%divisor).toString().padStart(digits,'0'):'';
    const grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,t.currency_thousand_separator||'.');
    return (neg?'-':'')+(t.currency_prefix||'')+grouped+(digits?(t.currency_decimal_separator||',')+frac:'')+(t.currency_suffix||'');
  };
  const renderCartSummary = (cart) => {
    const t=cart&&cart.totals; if(!t)return;
    const net=minorValue(t.total_items)+minorValue(t.total_items_tax);
    const discount=minorValue(t.total_discount)+minorValue(t.total_discount_tax), gross=net+discount;
    const threshold=50n*(10n**BigInt(Number(t.currency_minor_unit||2)));
    const sub=document.querySelector('[data-cr-summary-subtotal]'), dc=document.querySelector('[data-cr-summary-discount]'), dr=dc&&dc.closest('tr');
    const ship=document.querySelector('[data-cr-summary-shipping]'), total=document.querySelector('[data-cr-summary-total]');
    if(sub)sub.textContent=formatStoreMoney(gross,t);
    if(dr)dr.hidden=discount<=0n;
    if(dc&&discount>0n)dc.textContent='-'+formatStoreMoney(discount,t);
    if(!dr&&discount>0n&&sub){const row=document.createElement('tr');row.className='cart-discount cr-cart-summary-discount';const th=document.createElement('th');th.textContent='Descuentos';const td=document.createElement('td');td.dataset.crSummaryDiscount='';td.textContent='-'+formatStoreMoney(discount,t);row.append(th,td);sub.closest('tr').after(row);}
    if(ship)ship.textContent=gross>threshold?'Gratis':'Se calcula en el checkout';
    if(total)total.textContent=formatStoreMoney(net,t);
  };
  const refreshCartUi = async (cart) => { currentCart=cart; renderAppliedCoupons(cart); renderCartSummary(cart); if(promotionsPayload)renderPromotions(promotionsPayload); if(config.authenticated)await refreshWallet(); };
  const setButtonPending = (button,pending,label) => { if(!button)return; if(pending){button.dataset.crOriginalLabel=button.textContent;button.disabled=true;button.textContent=label||'Aplicando…';button.setAttribute('aria-busy','true');}else{button.disabled=false;button.textContent=button.dataset.crOriginalLabel||button.textContent;delete button.dataset.crOriginalLabel;button.removeAttribute('aria-busy');} };
  const applyCoupon = async (code, sourceLabel, button) => {
    const normalized = text(code).trim();
    if (!normalized || busy) return;
    busy = true;
    setButtonPending(button,true,'Aplicando…');
    clearFeedback();
    try {
      const url = new URL(config.applyCouponUrl, window.location.origin);
      url.searchParams.set('code', normalized);
      const cart = await request(url.toString(), { method: 'POST' }, 'store');
      if (!hasCoupon(cart, normalized)) {
        const backendMessage = Array.isArray(cart.errors) && cart.errors.length
          ? cart.errors.map((error) => error.message).filter(Boolean).join(' ')
          : 'WooCommerce no ha confirmado la aplicación de este descuento.';
        throw new Error(backendMessage);
      }
      await refreshCartUi(cart);
      if(button&&button.closest('[data-cr-cart-manual-form]')){const input=button.closest('[data-cr-cart-manual-form]').querySelector('[name="code"]');if(input)input.value='';}
      showMessage((sourceLabel || 'Descuento') + ' aplicado correctamente.');
    } catch (error) {
      showError(error.message);
    } finally {
      busy = false; setButtonPending(button,false);
    }
  };
  const removeCoupon = async (code,button) => {
    if (!code || busy) return;
    busy = true; setButtonPending(button,true,'…'); clearFeedback();
    try {
      const url = new URL(config.removeCouponUrl, window.location.origin);
      url.searchParams.set('code', code);
      const cart = await request(url.toString(), { method: 'POST' }, 'store');
      if (hasCoupon(cart, code)) {
        throw new Error('WooCommerce no ha confirmado la eliminación de este descuento.');
      }
      await refreshCartUi(cart); showMessage('Descuento eliminado.');
    } catch (error) {
      showError(error.message);
    } finally {
      busy = false; setButtonPending(button,false);
    }
  };
  const knownCouponPresentation = (code) => {
    const normalized=text(code).toLowerCase(), rewards=walletPayload&&Array.isArray(walletPayload.pending_rewards)?walletPayload.pending_rewards:[];
    const reward=rewards.find(x=>text(x.code).toLowerCase()===normalized);
    if(reward)return {kind:'wallet',label:'Saldo de monedero · '+formatWalletAmount(reward.amount,walletPayload.currency)};
    const promotions=Array.isArray(promotionsPayload)?promotionsPayload:(promotionsPayload&&Array.isArray(promotionsPayload.promotions)?promotionsPayload.promotions:[]);
    const promotion=promotions.find(x=>text(x.code).toLowerCase()===normalized);
    if(promotion)return {kind:'tag',label:text(promotion.title)||'Promoción'};
    return {kind:'manual',label:text(code)};
  };
  const renderAppliedCoupons = (cart) => {
    appliedPanel.replaceChildren(); const coupons=couponsFrom(cart);
    if(!coupons.length){appliedPanel.hidden=true;return;}
    appliedPanel.hidden=false; appliedPanel.appendChild(node('h3','cr-cart-applied__title','Descuentos aplicados'));
    coupons.forEach((coupon)=>{
      const p=knownCouponPresentation(coupon.code), row=node('div','cr-cart-applied__row'), label=node('span','cr-cart-applied__code',p.label);
      if(p.kind==='wallet')label.prepend(cartIcon('wallet','cr-cart-reward__icon'));
      if(p.kind==='tag')label.prepend(cartIcon('tag','cr-cart-promo-card__icon'));
      const remove=createButton('×','cr-cart-action-link cr-cart-applied__remove',()=>removeCoupon(coupon.code,remove));
      remove.setAttribute('aria-label','Quitar descuento');row.append(label,remove);appliedPanel.appendChild(row);
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
  let walletDialog = null;
  let walletDialogReturnFocus = null;
  const closeWalletInfo = () => { if (!walletDialog) return; walletDialog.hidden = true; document.body.classList.remove('cr-cart-dialog-open'); if (walletDialogReturnFocus && walletDialogReturnFocus.focus) walletDialogReturnFocus.focus(); };
  const openWalletInfo = (event) => {
    if (!walletDialog) {
      walletDialog = node('div', 'cr-cart-wallet-dialog'); walletDialog.hidden = true;
      walletDialog.innerHTML = '<div class="cr-cart-wallet-dialog__backdrop" data-cr-wallet-dialog-close></div><section class="cr-cart-wallet-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="cr-cart-wallet-dialog-title" tabindex="-1"><h2 id="cr-cart-wallet-dialog-title">¿Cómo funciona tu monedero?</h2><p>1 € gastado = 1 punto</p><p>Cuando acumules 100 puntos, podrás convertirlos en 5 € de saldo para tus compras.</p><p>La barra te indica cuánto te falta para desbloquear el saldo.</p><p>Cuando tengas saldo disponible, pulsa “Usar” para elegir cuánto quieres aplicar a tu compra.</p><button type="button" class="cr-cart-wallet-dialog__confirm">Entendido</button></section>';
      document.body.appendChild(walletDialog);
      walletDialog.addEventListener('click', (e) => { if (e.target.matches('[data-cr-wallet-dialog-close], .cr-cart-wallet-dialog__confirm')) closeWalletInfo(); });
      walletDialog.querySelector('.cr-cart-wallet-dialog__panel').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeWalletInfo(); } });
    }
    walletDialogReturnFocus = event && event.currentTarget ? event.currentTarget : document.activeElement;
    walletDialog.hidden = false; document.body.classList.add('cr-cart-dialog-open'); walletDialog.querySelector('.cr-cart-wallet-dialog__confirm').focus();
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
      rewards.filter((reward)=>!hasCoupon(currentCart,reward.code)).forEach((reward) => {
        const row = node('div', 'cr-cart-reward');
        const label = node('div', 'cr-cart-reward__label');
        label.appendChild(cartIcon('wallet', 'cr-cart-reward__icon'));
        label.appendChild(node('strong', '', 'Saldo de monedero · ' + formatWalletAmount(reward.amount, wallet.currency)));
        if (reward.expires_at) label.appendChild(node('small', '', 'Caduca: ' + reward.expires_at));
        row.appendChild(label);
        row.appendChild(createButton('Aplicar','cr-cart-apply-button',(event)=>applyCoupon(reward.code,'Crédito',event.currentTarget)));
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
      const wallet = await request(config.loyaltyUrl, { method: 'GET' }, 'wp'); walletPayload=wallet; renderWallet(wallet); if(currentCart)renderAppliedCoupons(currentCart);
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
        if (!hasCoupon(cart, code)) throw new Error('El crédito se ha creado, pero WooCommerce no ha confirmado su aplicación. Puedes encontrarlo en «Saldo listo para usar».');
        await refreshCartUi(cart); showMessage('Crédito aplicado correctamente.');
      } catch (error) {
        await refreshWallet();
        showError(error.message);
      }
    } catch (error) {
      // Keep pendingRedemption.requestId unchanged for a safe retry of this same attempt.
      showError(error.message);
    } finally {
      busy = false;
    }
  };

  const loadCart = async () => {
    const cartPromise = request(config.storeCartUrl, { method: 'GET' }, 'store')
      .then((cart) => { currentCart=cart; renderAppliedCoupons(cart); renderCartSummary(cart); if(promotionsPayload)renderPromotions(promotionsPayload); })
      .catch((error) => showError(error.message));
    const promotionsPromise = request(config.promotionsUrl, { method: 'GET' }, config.authenticated ? 'wp' : 'public')
      .then((payload) => { promotionsPayload=payload; renderPromotions(payload); if(currentCart)renderAppliedCoupons(currentCart); })
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
      if(input)applyCoupon(input.value,'Cupón',manualForm.querySelector('button[type="submit"]'));
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

  // Shipping method labels and selectors stay in checkout only.
})();
