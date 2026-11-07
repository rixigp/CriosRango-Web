(function () {
  'use strict';

  var COLOR_SWATCH_MAP = {
    'amarillo': '#E3C34F',
    'azul': '#477DAA',
    'azul claro': '#8FC5E8',
    'azul marino': '#263B5B',
    'azul pavo': '#1F6F78',
    'azul turquesa': '#39BFC1',
    'azulon': '#2457A6',
    'beige': '#D8C7A5',
    'berenjena': '#583047',
    'blanco': '#F5F3ED',
    'caldero': '#B65A32',
    'camel': '#B78A58',
    'celeste': '#8ECFE8',
    'chicle': '#F47FAE',
    'coral': '#F07868',
    'fucsia': '#D52C88',
    'granate': '#800020',
    'gris': '#969A9B',
    'kaki': '#8B8960',
    'lila': '#B7A1C8',
    'marron': '#805B43',
    'morado': '#76519A',
    'mostaza': '#D5A62E',
    'naranja': '#D9823B',
    'negro': '#292929',
    'oro': '#C6A23A',
    'pistacho': '#A9C96A',
    'rojo': '#C83D45',
    'rosa': '#E7A3B5',
    'salmon': '#F29A82',
    'verde': '#64856A',
    'verde esmeralda': '#16866A',
    'verde fluor': '#B7E334',
    'verde manzana': '#8DBF45',
    'verde oscuro': '#315B3C',
    // Existing legacy entries retained without changing their appearance.
    'marino': '#263B5B',
    'crudo': '#E8E0CF'
  };

  var COLOR_MAPPING_AUDIT_SEEN = Object.create(null);

  function normalizeColorKey(value) {
    return String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function resolveColorSwatch(rawValue, label) {
    var candidates = [label, rawValue].map(normalizeColorKey).filter(Boolean);
    for (var i = 0; i < candidates.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(COLOR_SWATCH_MAP, candidates[i])) {
        return { normalized: candidates[i], color: COLOR_SWATCH_MAP[candidates[i]], fallback: false };
      }
    }
    return { normalized: candidates.join(' | '), color: null, fallback: true };
  }


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      COLOR_SWATCH_MAP: COLOR_SWATCH_MAP,
      normalizeColorKey: normalizeColorKey,
      resolveColorSwatch: resolveColorSwatch
    };
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    var body = document.body;
    if (!body || !body.classList.contains('cr-product-detail-app')) return;

    var added = [];
    var form = document.querySelector('form.variations_form');
    var actions = document.querySelector('.cr-product-actions');
    var reserve = actions && actions.querySelector('.cr-product-reserve');

    function remember(node) { added.push(node); return node; }
    function dispatchNativeChange(input) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function initNativeTouchLightbox() {
      var gallery = document.querySelector('.woocommerce-product-gallery');
      if (!gallery || !window.PointerEvent) return;
      var start = null;
      gallery.addEventListener('pointerdown', function (event) {
        if (event.pointerType !== 'touch') return;
        var slide = event.target.closest('.woocommerce-product-gallery__image');
        if (!slide || !slide.querySelector('a')) return;
        start = { x: event.clientX, y: event.clientY, slide: slide, pointerId: event.pointerId };
      }, true);
      gallery.addEventListener('pointerup', function (event) {
        if (!start || event.pointerType !== 'touch' || event.pointerId !== start.pointerId) return;
        var moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        var tappedSlide = start.slide;
        start = null;
        if (moved > 10) return;
        var slides = gallery.querySelectorAll('.woocommerce-product-gallery__wrapper > .woocommerce-product-gallery__image');
        var isSingleImage = slides.length === 1;
        var isActiveSlide = tappedSlide.classList.contains('flex-active-slide');
        if (!isSingleImage && !isActiveSlide) return;
        var nativeTrigger = gallery.querySelector('.woocommerce-product-gallery__trigger');
        if (!nativeTrigger) return;
        event.preventDefault();
        event.stopPropagation();
        nativeTrigger.click();
      }, true);
      gallery.addEventListener('pointercancel', function () { start = null; }, true);
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
          if (slider && $ && $.fn && typeof $.fn.flexslider === 'function') {
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
            chip.dataset.value = option.value;
            chip.disabled = !!option.disabled;
            chip.setAttribute('aria-pressed', select.value === option.value ? 'true' : 'false');
            if (isColor) {
              var swatch = document.createElement('span');
              swatch.className = 'cr-product-choice-chip__swatch';
              swatch.setAttribute('aria-hidden', 'true');
              var rawColorValue = option.value;
              var rawColorLabel = option.textContent.trim();
              var colorMapping = resolveColorSwatch(rawColorValue, rawColorLabel);
              if (colorMapping.color) swatch.style.backgroundColor = colorMapping.color;
              var auditKey = normalizeColorKey(rawColorLabel) + '|' + normalizeColorKey(rawColorValue);
              if (!COLOR_MAPPING_AUDIT_SEEN[auditKey]) {
                COLOR_MAPPING_AUDIT_SEEN[auditKey] = true;
                if (window.console && console.info) {
                  console.info('[CR Product UI] COLOR_MAPPING_AUDIT', {
                    raw: { label: rawColorLabel, value: rawColorValue, slug: rawColorValue },
                    normalized: colorMapping.normalized,
                    resolved: colorMapping.color || 'neutral',
                    fallback: colorMapping.fallback ? 'YES' : 'NO'
                  });
                }
              }
              chip.appendChild(swatch);
            }
            var text = document.createElement('span');
            text.textContent = option.textContent.trim();
            chip.appendChild(text);
            chip.addEventListener('click', function () {
              if (chip.disabled) return;
              var isSize = /talla|size/.test(label);
              var isToggleAttribute = isSize || isColor;
              select.value = isToggleAttribute && select.value === option.value ? '' : option.value;
              dispatchNativeChange(select);
              window.requestAnimationFrame(function () {
                render();
                syncVariationState();
              });
            });
            chips.appendChild(chip);
          });
          if (isColor) {
            var nativeOptions = Array.prototype.filter.call(select.options, function (option) { return option.value !== ''; });
            select.dataset.crNativeOptionCount = String(nativeOptions.length);
            select.dataset.crChipCount = String(chips.querySelectorAll('.cr-product-choice-chip').length);
          }
        }
        select.addEventListener('change', render);
        render();
        if (isColor) {
          var nativeColorOptions = Array.prototype.filter.call(select.options, function (option) { return option.value !== ''; });
          var renderedColorCount = chips.querySelectorAll('.cr-product-choice-chip').length;
          select.dataset.crNativeOptionCount = String(nativeColorOptions.length);
          select.dataset.crChipCount = String(renderedColorCount);
          if (window.console && console.info) {
            console.info('[CR Product UI] COLOR_OPTIONS_AUDIT', {
              nativeNonempty: nativeColorOptions.length,
              renderedChips: renderedColorCount,
              values: nativeColorOptions.map(function (option) { return option.value; }),
              disabled: nativeColorOptions.filter(function (option) { return option.disabled; }).length,
              selected: select.value
            });
          }
        }
        if (window.MutationObserver) {
          var optionObserver = new MutationObserver(render);
          optionObserver.observe(select, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
          added.push({ cleanup: function () { optionObserver.disconnect(); } });
        }
      });

      var variationId = form.querySelector('input.variation_id');
      var nativeButton = form.querySelector('button.single_add_to_cart_button');
      var nativeButtonLabel = null;
      var cartIcon = null;
      var bagIconTemplate = null;
      var addedFeedbackTimer = null;
      var hasAddedFeedback = false;
      if (nativeButton) {
        nativeButton.textContent = '';
        var bagSource = document.querySelector('.cr-cart-link .cr-icon svg');
        cartIcon = bagSource ? bagSource.cloneNode(true) : document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        cartIcon.setAttribute('viewBox', '0 0 24 24');
        cartIcon.setAttribute('aria-hidden', 'true');
        cartIcon.setAttribute('focusable', 'false');
        cartIcon.classList.add('cr-product-cart-icon');
        if (!bagSource) {
          var cartBody = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          cartBody.setAttribute('d', 'M5 8h14l-1 12H6L5 8Z');
          var cartHandle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          cartHandle.setAttribute('d', 'M9 9V6a3 3 0 0 1 6 0v3');
          cartIcon.appendChild(cartBody);
          cartIcon.appendChild(cartHandle);
        }
        bagIconTemplate = cartIcon.cloneNode(true);
        nativeButtonLabel = document.createElement('span');
        nativeButtonLabel.className = 'cr-product-cart-label';
        nativeButton.appendChild(cartIcon);
        nativeButton.appendChild(nativeButtonLabel);
      }
      function setCartIcon(state) {
        if (!cartIcon) return;
        while (cartIcon.firstChild) cartIcon.removeChild(cartIcon.firstChild);
        if (state === 'check') {
          var checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          checkPath.setAttribute('d', 'm5 12 4 4L19 6');
          cartIcon.appendChild(checkPath);
        } else if (bagIconTemplate) {
          Array.prototype.forEach.call(bagIconTemplate.childNodes, function (node) {
            cartIcon.appendChild(node.cloneNode(true));
          });
        }
        cartIcon.classList.toggle('is-check', state === 'check');
      }
      function showAddedFeedback() {
        if (!nativeButton || !nativeButtonLabel) return;
        hasAddedFeedback = true;
        if (addedFeedbackTimer) window.clearTimeout(addedFeedbackTimer);
        nativeButton.classList.add('is-added-to-cart');
        setCartIcon('check');
        nativeButtonLabel.textContent = 'Añadido al carrito';
        addedFeedbackTimer = window.setTimeout(function () {
          hasAddedFeedback = false;
          nativeButton.classList.remove('is-added-to-cart');
          setCartIcon('bag');
          syncVariationState();
        }, 2200);
      }
      function syncVariationState() {
        selects.forEach(function (select) {
          var chips = select.nextElementSibling;
          if (!chips || !chips.classList.contains('cr-product-choice-chips')) return;
          chips.querySelectorAll('button').forEach(function (chip) {
            var option = Array.prototype.find.call(select.options, function (item) {
              return item.value === chip.dataset.value;
            });
            chip.disabled = !option || !!option.disabled;
            chip.setAttribute('aria-pressed', option && select.value === option.value ? 'true' : 'false');
          });
        });
        var validNativeVariation = !!(variationId && Number(variationId.value) > 0);
        if (reserve && reserve.dataset.variable === '1') reserve.disabled = !validNativeVariation;
        if (nativeButtonLabel && variationId && !hasAddedFeedback) {
          nativeButtonLabel.textContent = validNativeVariation ? 'Añadir al carrito' : 'Elige una combinación';
        }
      }
      function getProductDetailNoticeRoot() {
        return document.querySelector('.cr-main--woocommerce') || form.closest('.product') || form.parentNode;
      }
      function clearProductDetailNotices() {
        var noticeRoot = getProductDetailNoticeRoot();
        if (!noticeRoot || !noticeRoot.querySelectorAll) return;
        noticeRoot.querySelectorAll('.woocommerce-notices-wrapper').forEach(function (wrapper) {
          wrapper.replaceChildren();
        });
      }
      function initVariationAjaxAddToCart() {
        if (!form || !nativeButton || !variationId || !window.jQuery) return;

        var $ = window.jQuery;
        var isAddingToCart = false;

        form.addEventListener('submit', function (event) {
          var selectedVariationId = Number(variationId.value);
          var ajaxParams = window.wc_add_to_cart_params;
          if (!Number.isFinite(selectedVariationId) || selectedVariationId <= 0 || !ajaxParams || !ajaxParams.wc_ajax_url) return;

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          if (isAddingToCart) return;

          var quantityInput = form.querySelector('input.qty[name="quantity"]');
          var data = {
            product_id: selectedVariationId,
            quantity: quantityInput ? quantityInput.value : 1
          };
          var endpoint = String(ajaxParams.wc_ajax_url).replace('%%endpoint%%', 'add_to_cart');
          var $button = $(nativeButton);

          isAddingToCart = true;
          nativeButton.classList.add('loading');
          nativeButton.setAttribute('aria-busy', 'true');
          $(document.body).trigger('adding_to_cart', [$button, data]);

          $.ajax({
            type: 'POST',
            url: endpoint,
            data: data,
            dataType: 'json'
          }).done(function (response) {
            if (!response || response.error || response.success === false) {
              if (window.console && console.error) {
                console.error('[CR Product UI] WooCommerce variation add-to-cart failed.', response);
              }
              return;
            }

            $(document.body).trigger('added_to_cart', [
              response.fragments || {},
              response.cart_hash || '',
              $button
            ]);
          }).fail(function (xhr, status, error) {
            if (window.console && console.error) {
              console.error('[CR Product UI] WooCommerce variation add-to-cart request failed.', status, error);
            }
          }).always(function () {
            isAddingToCart = false;
            nativeButton.classList.remove('loading');
            nativeButton.removeAttribute('aria-busy');
          });
        }, true);
      }

      initVariationAjaxAddToCart();
      form.addEventListener('change', syncVariationState);
      if (window.jQuery) {
        window.jQuery(form).on('woocommerce_update_variation_values reset_data hide_variation', syncVariationState);
        window.jQuery(form).on('found_variation show_variation', function () {
          clearProductDetailNotices();
          syncVariationState();
        });
        window.jQuery(document.body).on('added_to_cart.crProductDetail', function (event, fragments, cartHash, $button) {
          var addedButton = $button && $button.jquery ? $button[0] : $button;
          if (!addedButton || (addedButton !== nativeButton && !(addedButton.closest && addedButton.closest('form.cart') === form))) return;
          if (!hasAddedFeedback) showAddedFeedback();
        });
      }
      syncVariationState();
      if (body.classList.contains('cr-product-added-to-cart')) showAddedFeedback();
    }

    function initQuantityStepper() {
      document.querySelectorAll('form.cart .quantity input.qty').forEach(function (input) {
        if (input.closest('.cr-product-quantity-stepper')) return;
        var originalParent = input.parentNode;
        var originalNext = input.nextSibling;
        var quantity = input.closest('.quantity');
        var quantityLabel = document.createElement('span');
        quantityLabel.className = 'cr-product-quantity-label';
        quantityLabel.textContent = 'Cantidad';
        if (quantity) {
          quantity.classList.add('cr-product-quantity-row');
          quantity.appendChild(quantityLabel);
        }
        var stepper = document.createElement('div');
        stepper.className = 'cr-product-quantity-stepper';
        var minus = document.createElement('button');
        minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Reducir cantidad');
        var plus = document.createElement('button');
        plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Aumentar cantidad');
        input.parentNode.insertBefore(stepper, input);
        stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus);
        if (quantity && quantityLabel.parentNode === quantity) quantity.insertBefore(quantityLabel, stepper);
        function sync() {
          minus.disabled = !!input.disabled;
          plus.disabled = !!input.disabled;
        }
        minus.addEventListener('click', function () { if (input.stepDown) input.stepDown(); dispatchNativeChange(input); sync(); });
        plus.addEventListener('click', function () { if (input.stepUp) input.stepUp(); dispatchNativeChange(input); sync(); });
        input.addEventListener('change', sync);
        input.addEventListener('input', sync);
        sync();
        added.push({ cleanup: function () {
          if (originalNext && originalNext.parentNode === originalParent) originalParent.insertBefore(input, originalNext);
          else originalParent.appendChild(input);
          if (stepper.parentNode) stepper.remove();
          if (quantityLabel.parentNode) quantityLabel.remove();
          if (quantity) quantity.classList.remove('cr-product-quantity-row');
        } });
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
      initNativeTouchLightbox();
      initGalleryDots();
      initVariationProxies();
      initQuantityStepper();
      initActions();
      body.classList.add('cr-product-ui-enhanced');
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
