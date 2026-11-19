(function () {
  'use strict';

  function directChild(parent, selector) {
    if (!parent) return null;
    return Array.prototype.find.call(parent.children, function (child) {
      return child.matches(selector);
    }) || null;
  }

  function ensureWrapper(orderReview, className) {
    var wrapper = directChild(orderReview, '.' + className);
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = className;
      orderReview.appendChild(wrapper);
    }
    return wrapper;
  }

  function initCheckoutDesktopLayout() {
    var form = document.querySelector('body.woocommerce-checkout:not(.woocommerce-order-received) form.checkout.woocommerce-checkout');
    var customerDetails = form && form.querySelector(':scope > #customer_details');
    var orderReview = form && form.querySelector(':scope > #order_review');
    if (!form || !customerDetails || !orderReview) return;

    var customerShipping = directChild(customerDetails, '.col-2');
    var shippingColumn = ensureWrapper(orderReview, 'cr-checkout-layout__shipping');
    var summaryColumn = ensureWrapper(orderReview, 'cr-checkout-layout__summary');
    var paymentColumn = ensureWrapper(orderReview, 'cr-checkout-layout__payment');

    // Keep native customer shipping fields and additional information together.
    if (customerShipping && customerShipping.parentNode !== shippingColumn) {
      shippingColumn.appendChild(customerShipping);
    }

    // Keep WooCommerce's review table as the native AJAX fragment target.
    var reviewTable = orderReview.querySelector('.woocommerce-checkout-review-order-table');
    if (reviewTable && reviewTable.parentNode !== summaryColumn) {
      summaryColumn.appendChild(reviewTable);
    }

    // WooCommerce replaces the review table on every order-review fragment refresh.
    // The previous section was moved outside that fragment, so discard it before
    // adopting the freshly rendered section from the replacement table.
    var shippingRow = reviewTable && reviewTable.querySelector('.cr-checkout-shipping-section-row');
    var shippingSection = shippingRow && shippingRow.querySelector('.cr-checkout-shipping-section');
    function removeStaleShippingSections(currentSection) {
      Array.prototype.slice.call(shippingColumn.querySelectorAll(':scope > .cr-checkout-shipping-section'))
        .forEach(function (existingSection) {
          if (existingSection !== currentSection) existingSection.remove();
        });
    }

    if (shippingRow) {
      removeStaleShippingSections(shippingSection);
      if (shippingSection) {
        shippingColumn.insertBefore(shippingSection, customerShipping || null);
      }
      shippingRow.remove();
      reviewTable.dataset.crCheckoutShippingLayoutProcessed = 'true';
    } else if (reviewTable && reviewTable.dataset.crCheckoutShippingLayoutProcessed !== 'true') {
      // A fresh fragment with no shipping row means shipping is no longer required.
      removeStaleShippingSections(null);
      reviewTable.dataset.crCheckoutShippingLayoutProcessed = 'true';
    }

    // Payment stays native; its fragment can still be replaced by WooCommerce.
    var payment = orderReview.querySelector(':scope > #payment, :scope > .woocommerce-checkout-payment')
      || orderReview.querySelector('#payment.woocommerce-checkout-payment');
    if (payment && payment.parentNode !== paymentColumn) {
      paymentColumn.appendChild(payment);
    }

    form.classList.add('cr-checkout-layout-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckoutDesktopLayout, { once: true });
  } else {
    initCheckoutDesktopLayout();
  }

  if (window.jQuery) {
    window.jQuery(document.body).on('updated_checkout.crCheckoutLayout', initCheckoutDesktopLayout);
  }
})();
