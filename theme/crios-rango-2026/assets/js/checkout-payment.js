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

    var nativeText = label.textContent.replace(/\s+/g, ' ').trim();
    if (!nativeText) return;

    var kind = /bizum/i.test(nativeText) ? 'bizum'
      : /(tarjeta|d[eé]bito|cr[eé]dito)/i.test(nativeText) ? 'card' : 'generic';
    var titleText = kind === 'card' ? 'Pago con tarjeta'
      : kind === 'bizum' ? 'Bizum' : nativeText;
    var subtitleText = kind === 'card' ? 'Pago seguro con tarjeta'
      : kind === 'bizum' ? 'Recibirás las instrucciones de pago al finalizar el pedido' : '';

    var images = Array.prototype.slice.call(label.querySelectorAll('img'));
    images.forEach(function (image) {
      var imageIdentity = ((image.getAttribute('alt') || '') + ' ' + (image.getAttribute('src') || '')).toLowerCase();
      if (/unicaja|cecabank/.test(imageIdentity)) image.classList.add('cr-payment-brand-logo');
      if (image.parentNode) image.parentNode.removeChild(image);
    });

    var nativeSource = document.createElement('span');
    nativeSource.className = 'cr-payment-method__native';
    nativeSource.setAttribute('aria-hidden', 'true');
    while (label.firstChild) nativeSource.appendChild(label.firstChild);

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
    label.appendChild(nativeSource);
    images.forEach(function (image) { label.appendChild(image); });
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
