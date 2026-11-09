(function () {
  'use strict';

  function createPaymentIcon(kind) {
    var icon = document.createElement('span');
    icon.className = 'cr-payment-method__icon';
    icon.setAttribute('aria-hidden', 'true');

    if (kind === 'card') {
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9h17M7 15h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    } else if (kind === 'bizum') {
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M4 8.5h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-10Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4 8.5 6.2 4h11.6L20 8.5M15.5 13.5h4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15.5" cy="13.5" r=".8" fill="currentColor"/></svg>';
    } else if (kind === 'store') {
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M9 20v-6h6v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    return icon;
  }

  function createPaymentHeading(payment, methods) {
    if (payment.querySelector(':scope > .cr-checkout-payment-heading')) return;

    var heading = document.createElement('div');
    heading.className = 'cr-checkout-delivery-heading cr-checkout-payment-heading';
    var step = document.createElement('span');
    step.className = 'cr-checkout-delivery-heading__step';
    step.setAttribute('aria-hidden', 'true');
    step.textContent = '4';
    var title = document.createElement('h2');
    title.textContent = 'Pago';
    heading.appendChild(step);
    heading.appendChild(title);
    payment.insertBefore(heading, methods);
  }

  function decoratePaymentMethod(row) {
    if (row.dataset.crPaymentPresentation === 'true') return;

    var label = row.querySelector(':scope > label');
    var radio = row.querySelector(':scope > input[name="payment_method"]');
    if (!label || !radio || radio.type !== 'radio') return;

    var gatewayId = radio.value;
    var kind = gatewayId === 'cecabank_gateway' ? 'card'
      : gatewayId === 'cheque' ? 'bizum'
      : gatewayId === 'cod' ? 'store' : 'generic';
    var nativeText = label.textContent.replace(/\s+/g, ' ').trim();
    if (!nativeText) return;

    var titleText = kind === 'card' ? 'Pago con tarjeta'
      : kind === 'bizum' ? 'Bizum'
      : kind === 'store' ? 'En tienda' : nativeText;
    var subtitleText = kind === 'card' ? 'Pago seguro con tarjeta'
      : kind === 'bizum' ? 'Recibirás las instrucciones de pago al finalizar el pedido'
      : kind === 'store' ? 'Paga en efectivo en la tienda.' : '';

    // Move only native text nodes into an accessibility-hidden source wrapper.
    // The original gateway image node is never removed, cloned or re-created.
    var nativeSource = document.createElement('span');
    nativeSource.className = 'cr-payment-method__native';
    nativeSource.setAttribute('aria-hidden', 'true');
    Array.prototype.slice.call(label.childNodes).forEach(function (node) {
      if (node.nodeType === 3) nativeSource.appendChild(node);
    });
    label.insertBefore(nativeSource, label.firstChild);

    var visual = document.createElement('span');
    visual.className = 'cr-payment-method__visual';
    if (kind !== 'generic') visual.appendChild(createPaymentIcon(kind));

    var copy = document.createElement('span');
    copy.className = 'cr-payment-method__copy';
    var title = document.createElement('span');
    title.className = 'cr-payment-method__title';
    title.textContent = titleText;
    copy.appendChild(title);
    if (subtitleText) {
      var subtitle = document.createElement('span');
      subtitle.className = 'cr-payment-method__subtitle';
      subtitle.textContent = subtitleText;
      copy.appendChild(subtitle);
    }
    visual.appendChild(copy);
    label.appendChild(visual);
    row.dataset.crPaymentPresentation = 'true';
  }

  function initCheckoutPaymentPresentation() {
    var payment = document.querySelector('body.woocommerce-checkout:not(.woocommerce-order-received) #payment');
    if (!payment) return;

    var methods = payment.querySelector(':scope > ul.wc_payment_methods');
    if (!methods) return;

    var rows = Array.prototype.slice.call(methods.querySelectorAll(':scope > li.wc_payment_method'));
    if (!rows.length) return;

    createPaymentHeading(payment, methods);
    rows.forEach(decoratePaymentMethod);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckoutPaymentPresentation, { once: true });
  } else {
    initCheckoutPaymentPresentation();
  }

  if (window.jQuery) {
    window.jQuery(document.body).on('updated_checkout.crPaymentPresentation', initCheckoutPaymentPresentation);
  }
})();