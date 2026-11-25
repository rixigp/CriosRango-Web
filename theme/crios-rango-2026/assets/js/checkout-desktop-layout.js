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

  function removeStaleShippingSections(shippingColumn, currentSection) {
    if (!shippingColumn) return;
    Array.prototype.slice.call(shippingColumn.querySelectorAll('.cr-checkout-shipping-section'))
      .forEach(function (existingSection) {
        if (existingSection !== currentSection) existingSection.remove();
      });
  }

  function checkoutRuntimeDiagnosticEnabled() {
    return new URLSearchParams(window.location.search).get('cr_checkout_diag') === '1';
  }

  function renderCheckoutRuntimeDiagnostic(stage, before) {
    if (!checkoutRuntimeDiagnosticEnabled()) return;
    var output = document.getElementById('cr-checkout-runtime-diagnostic-data');
    if (!output) return;
    var section = document.querySelector('.cr-checkout-shipping-section');
    var row = document.querySelector('.cr-checkout-shipping-section-row');
    var methods = document.querySelectorAll('.cr-checkout-shipping-section #shipping_method');
    var style = section ? window.getComputedStyle(section) : null;
    var rect = section ? section.getBoundingClientRect() : null;
    var snapshot = {
      stage: stage,
      viewport_width: window.innerWidth,
      mobile_media_query: window.matchMedia('(max-width: 767px)').matches,
      layout_ready: Boolean(document.querySelector('form.checkout.woocommerce-checkout.cr-checkout-layout-ready')),
      shipping_row_in_dom: Boolean(row),
      shipping_section_in_dom: Boolean(section),
      shipping_methods_list_count: methods.length,
      shipping_parent: section && section.parentElement ? section.parentElement.className : null,
      shipping_ancestor_chain: section ? (function () {
        var nodes = [], node = section.parentElement;
        while (node && nodes.length < 6) {
          nodes.push(node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + (node.className && typeof node.className === 'string' ? '.' + node.className.trim().replace(/\\s+/g, '.') : ''));
          node = node.parentElement;
        }
        return nodes;
      })() : [],
      hidden_attribute: section ? section.hidden : null,
      inline_style: section ? section.getAttribute('style') : null,
      computed_display: style ? style.display : null,
      computed_visibility: style ? style.visibility : null,
      computed_opacity: style ? style.opacity : null,
      computed_height: style ? style.height : null,
      bounding_rect: rect ? { width: rect.width, height: rect.height, top: rect.top, left: rect.left } : null,
      before_layout_handler: before || null
    };
    var payload;
    try { payload = JSON.parse(output.textContent || '{}'); } catch (error) { payload = {}; }
    payload.javascript = payload.javascript || [];
    payload.javascript.push(snapshot);
    output.textContent = JSON.stringify(payload, null, 2);
  }

  function initCheckoutDesktopLayout() {
    var form = document.querySelector('body.woocommerce-checkout:not(.woocommerce-order-received) form.checkout.woocommerce-checkout');
    var customerDetails = form && form.querySelector(':scope > #customer_details');
    var orderReview = form && form.querySelector(':scope > #order_review');
    if (!form || !customerDetails || !orderReview) {
      renderCheckoutRuntimeDiagnostic('layout-preconditions-missing', {
        form: Boolean(form), customer_details: Boolean(customerDetails), order_review: Boolean(orderReview)
      });
      return;
    }

    var customerShipping = directChild(customerDetails, '.col-2');
    var additionalInfo = form.querySelector('.woocommerce-additional-fields');
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
    var shippingStateBeforeMove = {
      shipping_row_found_in_review_table: Boolean(shippingRow),
      shipping_section_found_in_row: Boolean(shippingSection),
      shipping_methods_in_row: shippingRow ? shippingRow.querySelectorAll('#shipping_method').length : 0
    };
    if (shippingRow) {
      removeStaleShippingSections(shippingColumn, shippingSection);
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

    // Move WooCommerce's real order-notes block directly after the shipping methods.
    // Core emits this block after #customer_details, which otherwise places it
    // before the custom shipping column in the mobile/tablet document flow.
    var activeShippingSection = shippingColumn.querySelector('.cr-checkout-shipping-section');
    if (additionalInfo && activeShippingSection && activeShippingSection.nextElementSibling !== additionalInfo) {
      shippingColumn.insertBefore(additionalInfo, activeShippingSection.nextSibling);
    }

    // Payment stays native; its fragment can still be replaced by WooCommerce.
    var payment = orderReview.querySelector(':scope > #payment, :scope > .woocommerce-checkout-payment')
      || orderReview.querySelector('#payment.woocommerce-checkout-payment');
    if (payment && payment.parentNode !== paymentColumn) {
      paymentColumn.appendChild(payment);
    }

    form.classList.add('cr-checkout-layout-ready');
    renderCheckoutRuntimeDiagnostic('after-initCheckoutDesktopLayout', shippingStateBeforeMove);
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
