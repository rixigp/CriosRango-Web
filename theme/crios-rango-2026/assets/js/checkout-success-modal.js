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

  function copyForSuccess(payload) {
    var number = String(payload.order_number);
    var first = 'Tu pedido #' + number + ' ha sido recibido.';
    if (payload.gateway === 'cheque') {
      return [
        first,
        'Realiza el pago por Bizum al 679 97 28 88 y utiliza el número de pedido como referencia de pago.',
        'Tu pedido no se procesará hasta que se haya recibido el importe.'
      ];
    }
    if (payload.gateway === 'cod') {
      return [
        first,
        'Podrás realizar el pago en efectivo en la tienda al recoger tu pedido.',
        'Utiliza el número de pedido como referencia cuando vengas a recogerlo.'
      ];
    }
    return null;
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
    inertSnapshot.forEach(function (entry) {
      entry.node.inert = entry.wasInert;
    });
    inertSnapshot = [];
  }

  function getOrCreateModal(payload) {
    var existing = document.getElementById(modalId);
    if (existing) return existing;

    var copy = copyForSuccess(payload);
    if (!copy) return null;

    var overlay = createElement('div', 'cr-order-success-modal');
    overlay.id = modalId;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', modalId + '-title');

    var card = createElement('section', 'cr-order-success-modal__card');
    var title = createElement('h2', 'cr-order-success-modal__title', 'Pedido recibido');
    title.id = modalId + '-title';
    card.appendChild(title);

    copy.forEach(function (paragraph) {
      card.appendChild(createElement('p', 'cr-order-success-modal__text', paragraph));
    });

    var action = createElement('button', 'cr-order-success-modal__action', 'Seguir comprando');
    action.type = 'button';
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Tab') {
        event.preventDefault();
        action.focus();
      }
    });
    action.addEventListener('click', function () {
      restoreBackground();
      var shopUrl = window.CR2026CheckoutSuccess && window.CR2026CheckoutSuccess.shopUrl;
      if (typeof shopUrl === 'string' && shopUrl) {
        window.location.assign(shopUrl);
      }
    });
    card.appendChild(action);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    lockBackground(overlay);
    action.focus();
    return overlay;
  }

  function handleSuccessfulCheckout(event, result) {
    var payload = result && result.cr_order_success;
    if (!payload || payload.enabled !== true || allowedGateways.indexOf(payload.gateway) === -1
      || !payload.order_id || typeof payload.order_number !== 'string' || !payload.order_number) {
      return true;
    }

    var modal = getOrCreateModal(payload);
    if (!modal) return true;

    var placeOrder = document.getElementById('place_order');
    if (placeOrder) {
      placeOrder.disabled = true;
      placeOrder.setAttribute('aria-disabled', 'true');
    }

    // Keep WooCommerce's success branch intact. Its hash assignment changes
    // only the fragment; clean it without a document reload once applied.
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
      window.history.replaceState(null, document.title,
        window.location.pathname + window.location.search);
    }
  }

  function init() {
    if (!window.jQuery) return;
    bindSuccessHandler();
    if (!handlerBound) return;
    window.jQuery(document.body).off('updated_checkout.crOrderSuccessModal');
    window.jQuery(document.body).on('updated_checkout.crOrderSuccessModal', bindSuccessHandler);
    window.addEventListener('hashchange', cleanSuccessHash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
