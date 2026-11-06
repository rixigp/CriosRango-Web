(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    var body = document.body;
    if (!body || !body.classList.contains('cr-product-detail-app')) return;

    var added = [];
    var enhanced = false;
    var form = document.querySelector('form.variations_form');
    var actions = document.querySelector('.cr-product-actions');
    var reserve = actions && actions.querySelector('.cr-product-reserve');

    function remember(node) { added.push(node); return node; }
    function dispatchNativeChange(input) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function initGalleryDots() {
      var gallery = document.querySelector('.woocommerce-product-gallery');
      if (!gallery) return;
      var slides = gallery.querySelectorAll('.woocommerce-product-gallery__wrapper > .woocommerce-product-gallery__image');
      if (slides.length < 2) return;
      var dots = remember(document.createElement('div'));
      dots.className = 'cr-product-gallery-dots';
      dots.setAttribute('aria-label', 'Imágenes del producto');
      slides.forEach(function (_, index) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'cr-product-gallery-dot';
        dot.setAttribute('aria-label', 'Ver imagen ' + (index + 1));
        dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
        dot.addEventListener('click', function () {
          var $ = window.jQuery;
          var slider = $ ? $(gallery).data('flexslider') : null;
          if (slider && typeof slider.flexslider === 'function') {
            $(gallery).flexslider(index);
            return;
          }
          var thumbs = gallery.querySelectorAll('.flex-control-thumbs img');
          if (thumbs[index]) thumbs[index].click();
        });
        dots.appendChild(dot);
      });
      gallery.insertAdjacentElement('afterend', dots);
      var sync = function () {
        var active = gallery.querySelector('.woocommerce-product-gallery__image.flex-active-slide');
        var index = active ? Array.prototype.indexOf.call(slides, active) : 0;
        dots.querySelectorAll('button').forEach(function (dot, i) {
          dot.setAttribute('aria-current', i === index ? 'true' : 'false');
        });
      };
      var observer = new MutationObserver(sync);
      observer.observe(gallery, { subtree: true, attributes: true, attributeFilter: ['class'] });
      added.push({ cleanup: function () { observer.disconnect(); } });
      sync();
    }

    function initVariationProxies() {
      if (!form) return;
      var selects = Array.prototype.slice.call(form.querySelectorAll('table.variations select'));
      if (!selects.length) return;
      selects.forEach(function (select) {
        var labelNode = select.closest('td') && select.closest('td').parentElement.querySelector('label');
        var label = (labelNode ? labelNode.textContent : select.name || '').trim().toLowerCase();
        var isColor = /colou?r|tono/.test(label);
        var chips = remember(document.createElement('div'));
        chips.className = 'cr-product-choice-chips';
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', labelNode ? labelNode.textContent.trim() : 'Opciones');
        select.insertAdjacentElement('afterend', chips);

        function render() {
          chips.replaceChildren();
          Array.prototype.slice.call(select.options).forEach(function (option) {
            if (!option.value) return;
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'cr-product-choice-chip';
            chip.disabled = !!option.disabled;
            chip.setAttribute('aria-pressed', select.value === option.value ? 'true' : 'false');
            if (isColor) {
              var swatch = document.createElement('span');
              swatch.className = 'cr-product-choice-chip__swatch';
              swatch.setAttribute('aria-hidden', 'true');
              chip.appendChild(swatch);
            }
            var text = document.createElement('span');
            text.textContent = option.textContent.trim();
            chip.appendChild(text);
            chip.addEventListener('click', function () {
              if (chip.disabled) return;
              select.value = option.value;
              dispatchNativeChange(select);
              window.requestAnimationFrame(render);
            });
            chips.appendChild(chip);
          });
        }
        select.addEventListener('change', render);
        render();
        if (window.MutationObserver) {
          var optionObserver = new MutationObserver(render);
          optionObserver.observe(select, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
          added.push({ cleanup: function () { optionObserver.disconnect(); } });
        }
      });

      var variationId = form.querySelector('input.variation_id');
      var nativeButton = form.querySelector('button.single_add_to_cart_button');
      var originalButtonText = nativeButton ? nativeButton.textContent.trim() : '';
      function syncVariationState() {
        selects.forEach(function (select) {
          var chips = select.nextElementSibling;
          if (!chips || !chips.classList.contains('cr-product-choice-chips')) return;
          chips.querySelectorAll('button').forEach(function (chip) {
            var option = Array.prototype.find.call(select.options, function (item) {
              return item.textContent.trim() === chip.textContent.trim() && item.value;
            });
            chip.disabled = !option || !!option.disabled;
            chip.setAttribute('aria-pressed', option && select.value === option.value ? 'true' : 'false');
          });
        });
        var validNativeVariation = !!(variationId && Number(variationId.value) > 0);
        if (reserve && reserve.dataset.variable === '1') reserve.disabled = !validNativeVariation;
        if (nativeButton && variationId) {
          nativeButton.textContent = validNativeVariation ? (originalButtonText || 'Añadir al carrito') : 'Elige una combinación';
        }
      }
      form.addEventListener('change', syncVariationState);
      if (window.jQuery) {
        window.jQuery(form).on('woocommerce_update_variation_values found_variation reset_data hide_variation show_variation', syncVariationState);
      }
      syncVariationState();
    }

    function initQuantityStepper() {
      document.querySelectorAll('form.cart .quantity input.qty').forEach(function (input) {
        if (input.closest('.cr-product-quantity-stepper')) return;
        var stepper = remember(document.createElement('div'));
        stepper.className = 'cr-product-quantity-stepper';
        var minus = document.createElement('button');
        minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Reducir cantidad');
        var plus = document.createElement('button');
        plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Aumentar cantidad');
        input.parentNode.insertBefore(stepper, input);
        stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus);
        function sync() {
          var value = Number(input.value || 0);
          var min = input.min === '' ? -Infinity : Number(input.min);
          var max = input.max === '' ? Infinity : Number(input.max);
          minus.disabled = input.disabled || value <= min;
          plus.disabled = input.disabled || value >= max;
        }
        minus.addEventListener('click', function () { if (input.stepDown) input.stepDown(); dispatchNativeChange(input); sync(); });
        plus.addEventListener('click', function () { if (input.stepUp) input.stepUp(); dispatchNativeChange(input); sync(); });
        input.addEventListener('change', sync);
        input.addEventListener('input', sync);
        sync();
      });
    }

    function productPayload() {
      var name = actions ? actions.dataset.productName || document.title : document.title;
      var url = actions ? actions.dataset.productUrl || window.location.href : window.location.href;
      var attributes = [];
      if (form) form.querySelectorAll('table.variations select').forEach(function (select) {
        if (!select.value) return;
        var row = select.closest('tr');
        var label = row && row.querySelector('label');
        attributes.push((label ? label.textContent.trim() + ': ' : '') + select.options[select.selectedIndex].textContent.trim());
      });
      return { name: name, url: url, attributes: attributes };
    }

    function initActions() {
      if (!actions) return;
      var share = actions.querySelector('.cr-product-share');
      if (share) share.addEventListener('click', function () {
        var payload = productPayload();
        var data = { title: payload.name, text: payload.name, url: payload.url };
        if (navigator.share) {
          navigator.share(data).catch(function (error) { if (error && error.name !== 'AbortError') copyLink(payload.url); });
        } else copyLink(payload.url);
      });
      if (reserve) reserve.addEventListener('click', function () {
        if (reserve.disabled) return;
        var payload = productPayload();
        var message = [payload.name].concat(payload.attributes).concat([payload.url]).join('\n');
        window.open('https://wa.me/34633246788?text=' + encodeURIComponent(message), '_blank', 'noopener');
      });
    }

    function copyLink(url) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(function () { fallbackCopy(url); });
      } else fallbackCopy(url);
    }
    function fallbackCopy(url) {
      var field = document.createElement('textarea');
      field.value = url; field.setAttribute('readonly', '');
      field.style.position = 'absolute'; field.style.left = '-9999px';
      document.body.appendChild(field); field.select();
      try { document.execCommand('copy'); } finally { field.remove(); }
    }

    try {
      initGalleryDots();
      initVariationProxies();
      initQuantityStepper();
      initActions();
      body.classList.add('cr-product-ui-enhanced');
      enhanced = true;
    } catch (error) {
      added.forEach(function (node) {
        if (node && typeof node.cleanup === 'function') node.cleanup();
        else if (node && node.parentNode) node.remove();
      });
      body.classList.remove('cr-product-ui-enhanced');
      if (window.console && console.error) console.error('[CR Product UI] Enhancement disabled; native WooCommerce controls remain visible.', error);
    }
  });
})();
