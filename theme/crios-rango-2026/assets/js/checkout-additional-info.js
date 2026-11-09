(function () {
  'use strict';

  function initCheckoutAdditionalInfo() {
    document.querySelectorAll('.woocommerce-additional-fields').forEach(function (container) {
      if (container.dataset.crAdditionalInfoInitialized === 'true') return;
      var heading = container.querySelector(':scope > h3');
      if (!heading) return;

      var nativeOrderNotes = container.querySelector('#order_comments');
      var nativeContent = Array.prototype.filter.call(container.childNodes, function (node) {
        return node !== heading;
      });
      var title = heading.textContent.trim() || 'Información adicional';
      var panelId = 'cr-checkout-additional-info-panel';
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'cr-checkout-additional-info__toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', panelId);

      var icon = document.createElement('span');
      icon.className = 'cr-checkout-additional-info__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M6.5 3.5h8l3 3v14h-11z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.5 3.8v3h3M9 11h6M9 14h6M9 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
      var label = document.createElement('span');
      label.className = 'cr-checkout-additional-info__title';
      label.textContent = title;
      var chevron = document.createElement('span');
      chevron.className = 'cr-checkout-additional-info__chevron';
      chevron.setAttribute('aria-hidden', 'true');
      toggle.appendChild(icon);
      toggle.appendChild(label);
      toggle.appendChild(chevron);

      var panel = document.createElement('div');
      panel.className = 'cr-checkout-additional-info__panel';
      panel.id = panelId;
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', toggle.id || (toggle.id = 'cr-checkout-additional-info-toggle'));
      panel.hidden = true;
      nativeContent.forEach(function (node) { panel.appendChild(node); });
      if (nativeOrderNotes && !panel.contains(nativeOrderNotes)) panel.appendChild(nativeOrderNotes);

      heading.remove();
      container.classList.add('cr-checkout-additional-info');
      container.insertBefore(toggle, container.firstChild);
      container.appendChild(panel);
      container.dataset.crAdditionalInfoInitialized = 'true';

      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        panel.hidden = expanded;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckoutAdditionalInfo, { once: true });
  } else {
    initCheckoutAdditionalInfo();
  }

  if (window.jQuery) {
    window.jQuery(document.body).on('updated_checkout.crAdditionalInfo', initCheckoutAdditionalInfo);
  }
})();
