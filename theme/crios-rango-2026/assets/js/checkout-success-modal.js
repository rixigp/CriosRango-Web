(function () {
  'use strict';
  var modalId = 'cr-order-success-modal';
  var hashMarker = '#cr-order-success';
  var allowedGateways = ['cheque', 'cod'];
  var handlerBound = false;
  var bodyOverflowBefore = '';
  var inertSnapshot = [];
  function createElement(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }
  function lockBackground(modal) {
    bodyOverflowBefore = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inertSnapshot = [];
    Array.prototype.forEach.call(document.body.children, function (child) {
      if (child === modal) return;
      inertSnapshot.push({ node: child, wasInert: Boolean(child.inert) });
      child.inert = true;
    });
  }
  function restoreBackground() {
    document.body.style.overflow = bodyOverflowBefore;
    inertSnapshot.forEach(function (entry) { entry.node.inert = entry.wasInert; });
    inertSnapshot = [];
  }
  function closeModal(modal) {
    if (!modal || !modal.parentNode) return;
    modal.parentNode.removeChild(modal);
    restoreBackground();
  }
  function getOrCreateModal(payload) {
    var existing = document.getElementById(modalId);
    if (existing) return existing;
    if (!payload || payload.enabled !== true
      || ['bizum_success', 'store_success', 'card_success', 'card_failure'].indexOf(payload.variant) === -1
      || typeof payload.title !== 'string' || !Array.isArray(payload.paragraphs)
      || typeof payload.action_label !== 'string') return null;
    var overlay = createElement('div', 'cr-order-success-modal');
    overlay.id = modalId;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', modalId + '-title');
    var card = createElement('section', 'cr-order-success-modal__card');
    var title = createElement('h2', 'cr-order-success-modal__title', payload.title);
    title.id = modalId + '-title';
    card.appendChild(title);
    payload.paragraphs.forEach(function (paragraph) {
      if (typeof paragraph === 'string') card.appendChild(createElement('p', 'cr-order-success-modal__text', paragraph));
    });
    var action = createElement('button', 'cr-order-success-modal__action', payload.action_label);
    action.type = 'button';
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Tab') { event.preventDefault(); action.focus(); }
    });
    action.addEventListener('click', function () {
      if (payload.action === 'close') { closeModal(overlay); return; }
      closeModal(overlay);
      var shopUrl = window.CR2026CheckoutSuccess && window.CR2026CheckoutSuccess.shopUrl;
      if (typeof shopUrl === 'string' && shopUrl) window.location.assign(shopUrl);
    });
    card.appendChild(action);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    lockBackground(overlay);
    action.focus();
    return overlay;
  }
  function showModal(payload) {
    if (document.getElementById(modalId)) return document.getElementById(modalId);
    return getOrCreateModal(payload);
  }
  function handleSuccessfulCheckout(event, result) {
    var payload = result && result.cr_order_success;
    if (!payload || payload.enabled !== true || allowedGateways.indexOf(payload.gateway) === -1
      || !payload.order_id || typeof payload.order_number !== 'string' || !payload.order_number) return true;
    if (!showModal(payload)) return true;
    var placeOrder = document.getElementById('place_order');
    if (placeOrder) { placeOrder.disabled = true; placeOrder.setAttribute('aria-disabled', 'true'); }
    result.redirect = hashMarker;
    return true;
  }
  function bindSuccessHandler() {
    if (!window.jQuery) return;
    var form = document.querySelector('form.checkout');
    if (!form) return;
    window.jQuery(form).off('checkout_place_order_success.crOrderSuccessModal');
    window.jQuery(form).on('checkout_place_order_success.crOrderSuccessModal', handleSuccessfulCheckout);
    handlerBound = true;
  }
  function cleanSuccessHash() {
    if (window.location.hash === hashMarker && window.history && window.history.replaceState) {
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
  }
  function init() {
    if (window.jQuery) {
      bindSuccessHandler();
      if (handlerBound) {
        window.jQuery(document.body).off('updated_checkout.crOrderSuccessModal');
        window.jQuery(document.body).on('updated_checkout.crOrderSuccessModal', bindSuccessHandler);
      }
    }
    var config = window.CR2026CheckoutSuccess || {};
    if (config.result) showModal(config.result);
    window.addEventListener('hashchange', cleanSuccessHash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
