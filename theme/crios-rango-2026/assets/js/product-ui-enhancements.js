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

  function buildVariationAddToCartPayload(serializedFields, productId, variationId, quantity) {
    var payload = {};
    var variation = {};
    (serializedFields || []).forEach(function (field) {
      payload[field.name] = field.value;
      if (field.name.indexOf('attribute_') === 0) variation[field.name] = field.value;
    });
    payload.product_id = productId;
    payload.variation_id = variationId;
    payload.quantity = quantity;
    payload.variation = variation;
    return payload;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      COLOR_SWATCH_MAP: COLOR_SWATCH_MAP,
      normalizeColorKey: normalizeColorKey,
      resolveColorSwatch: resolveColorSwatch,
      buildVariationAddToCartPayload: buildVariationAddToCartPayload
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

      function initProductDebug() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('crdebug') !== '1') return null;

        var build = 'loading';
        var panel = document.createElement('details');
        panel.open = true;
        panel.style.cssText = 'position:fixed;z-index:2147483647;right:8px;bottom:8px;width:min(390px,calc(100vw - 16px));max-height:55vh;overflow:auto;background:#171717;color:#f5f5f5;border:1px solid #777;border-radius:8px;padding:8px;font:12px/1.4 monospace;box-shadow:0 3px 18px rgba(0,0,0,.35)';
        var summary = document.createElement('summary');
        summary.textContent = 'CR PRODUCT DEBUG · JS LOADED · BUILD=' + build;
        summary.style.cssText = 'cursor:pointer;font-weight:700;position:sticky;top:0;background:#171717;padding:3px 0';
        var output = document.createElement('pre');
        output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0;max-height:34vh;overflow:auto';
        var controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:8px;position:sticky;bottom:0;background:#171717;padding-top:5px';
        var copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copiar trace';
        var clear = document.createElement('button');
        clear.type = 'button';
        clear.textContent = 'Limpiar';
        [copy, clear].forEach(function (button) {
          button.style.cssText = 'border:1px solid #aaa;border-radius:5px;background:#333;color:#fff;padding:5px 9px;font:inherit';
        });
        controls.appendChild(copy);
        controls.appendChild(clear);
        panel.appendChild(summary);
        panel.appendChild(output);
        panel.appendChild(controls);
        document.body.appendChild(panel);

        var entries = ['JS LOADED'];
        var submitStartedAt = null;
        function now() { return window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now(); }
        function clean(value) { return String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim(); }
        function render() { output.textContent = entries.join('\n'); }
        function log(label, fields) {
          var line = label;
          if (fields) {
            Object.keys(fields).forEach(function (key) { line += ' ' + key + '=' + clean(fields[key]); });
          }
          entries.push(line);
          render();
        }
        function elapsed() { return submitStartedAt === null ? 'NA' : Math.round(now() - submitStartedAt); }
        function parentLabel(node) {
          var parent = node && node.parentElement;
          if (!parent) return 'none';
          var tag = parent.tagName ? parent.tagName.toLowerCase() : 'node';
          return tag + (parent.id ? '#' + parent.id : '') + (parent.className && typeof parent.className === 'string' ? '.' + parent.className.trim().replace(/\s+/g, '.') : '');
        }
        function noticeNodes() {
          return Array.prototype.slice.call(document.querySelectorAll('.woocommerce-error,.woocommerce-message,.woocommerce-info'));
        }
        function logNoticeBefore() {
          var notices = noticeNodes();
          if (!notices.length) log('NOTICE_BEFORE', { text: '(none)', parent: '(none)' });
          notices.forEach(function (notice) {
            log('NOTICE_BEFORE', { text: notice.textContent, parent: parentLabel(notice) });
          });
        }
        function logNoticeAfterClear() {
          var notices = noticeNodes();
          log('NOTICE_AFTER_CLEAR', {
            count: notices.length,
            texts: notices.map(function (notice) { return clean(notice.textContent); }).join(' | ') || '(none)'
          });
        }
        function logInsertedNotice(node) {
          if (!node || node.nodeType !== 1 || panel.contains(node)) return;
          var candidates = [];
          if (node.matches && node.matches('.woocommerce-error,.woocommerce-message,.woocommerce-info')) candidates.push(node);
          if (node.querySelectorAll) candidates = candidates.concat(Array.prototype.slice.call(node.querySelectorAll('.woocommerce-error,.woocommerce-message,.woocommerce-info')));
          candidates.forEach(function (notice) {
            log('NOTICE_INSERTED', { time: elapsed() + 'ms', text: notice.textContent, parent: parentLabel(notice) });
          });
        }
        if (nativeButton && window.MutationObserver) {
          var ctaObserver = new MutationObserver(function () {
            log('CTA_MUTATION', {
              time: elapsed() + 'ms',
              text: nativeButtonLabel ? nativeButtonLabel.textContent : nativeButton.textContent,
              class: nativeButton.className
            });
          });
          ctaObserver.observe(nativeButton, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
        }
        if (window.MutationObserver && document.body) {
          var noticeObserver = new MutationObserver(function (records) {
            records.forEach(function (record) {
              Array.prototype.forEach.call(record.addedNodes, logInsertedNotice);
            });
          });
          noticeObserver.observe(document.body, { subtree: true, childList: true });
        }
        copy.addEventListener('click', function () {
          var value = entries.join('\\n');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value);
          } else {
            var field = document.createElement('textarea');
            field.value = value;
            panel.appendChild(field);
            field.select();
            document.execCommand('copy');
            panel.removeChild(field);
          }
        });
        clear.addEventListener('click', function () {
          entries = ['JS LOADED'];
          render();
        });
        render();

        var scriptTag = Array.prototype.filter.call(document.scripts, function (script) {
          return script.src && /product-ui-enhancements\.js(?:\?|$)/.test(script.src);
        })[0];
        if (scriptTag && window.fetch) {
          var manifestUrl = new URL('../../build.json', scriptTag.src).toString();
          window.fetch(manifestUrl, { cache: 'no-store', credentials: 'same-origin' })
            .then(function (response) {
              if (!response.ok) throw new Error('build manifest HTTP ' + response.status);
              return response.json();
            })
            .then(function (manifest) {
              build = manifest && typeof manifest.sha === 'string' ? manifest.sha.slice(0, 7) : 'unknown';
              summary.textContent = 'CR PRODUCT DEBUG · JS LOADED · BUILD=' + build;
              entries.splice(1, 0, 'BUILD=' + build);
              render();
            })
            .catch(function () {
              build = 'unknown';
              summary.textContent = 'CR PRODUCT DEBUG · JS LOADED · BUILD=' + build;
              entries.splice(1, 0, 'BUILD=' + build);
              render();
            });
        } else {
          entries.splice(1, 0, 'BUILD=unknown');
          render();
        }

        return {
          log: log,
          beginSubmit: function (variation, quantity) {
            submitStartedAt = now();
            log('SUBMIT_START');
            log('variationId=' + clean(variation));
            log('quantity=' + clean(quantity));
            logNoticeBefore();
          },
          noticeAfterClear: logNoticeAfterClear
        };
      }
      var crProductDebug = initProductDebug();

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
        if (crProductDebug) crProductDebug.log('SHOW_ADDED_FEEDBACK_ENTER');
        if (!nativeButton || !nativeButtonLabel) return;
        hasAddedFeedback = true;
        if (addedFeedbackTimer) window.clearTimeout(addedFeedbackTimer);
        nativeButton.classList.add('is-added-to-cart');
        setCartIcon('check');
        nativeButtonLabel.textContent = 'Añadido al carrito';
        if (crProductDebug) crProductDebug.log('SHOW_ADDED_FEEDBACK_WRITTEN', { text: nativeButtonLabel.textContent });
        addedFeedbackTimer = window.setTimeout(function () {
          var textBefore = nativeButtonLabel ? nativeButtonLabel.textContent : '';
          hasAddedFeedback = false;
          nativeButton.classList.remove('is-added-to-cart');
          setCartIcon('bag');
          syncVariationState();
          if (crProductDebug) crProductDebug.log('SUCCESS_TIMER_END', {
            textBefore: textBefore,
            textAfter: nativeButtonLabel ? nativeButtonLabel.textContent : ''
          });
        }, 2200);
      }
      function syncVariationState() {
        var debugTextBefore = nativeButtonLabel ? nativeButtonLabel.textContent : '';
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
        if (crProductDebug) crProductDebug.log('SYNC_VARIATION', {
          hasAddedFeedback: hasAddedFeedback,
          textBefore: debugTextBefore,
          textAfter: nativeButtonLabel ? nativeButtonLabel.textContent : ''
        });
      }
      var isAddingToCart = false;
      function getWooAjaxUrl(endpoint) {
        var params = window.wc_add_to_cart_params;
        if (!params || !params.wc_ajax_url) return '';
        return params.wc_ajax_url.replace('%%endpoint%%', endpoint);
      }
      function buildNativeAddToCartPayload() {
        var productIdInput = form.querySelector('input[name="product_id"]') || form.querySelector('input[name="add-to-cart"]');
        var productId = productIdInput && productIdInput.value ? productIdInput.value : form.getAttribute('data-product_id');
        var quantityInput = form.querySelector('input.qty[name="quantity"], input[name="quantity"]');
        var quantity = quantityInput ? quantityInput.value : '1';
        return buildVariationAddToCartPayload(
          window.jQuery(form).serializeArray(),
          productId,
          variationId ? variationId.value : '',
          quantity
        );
      }
      function getProductDetailNoticeRoot() {
        return document.querySelector('.cr-main--woocommerce') || form.closest('.product') || form.parentNode;
      }
      function clearProductDetailNotices() {
        var noticeRoot = getProductDetailNoticeRoot();
        if (noticeRoot && noticeRoot.querySelectorAll) {
          noticeRoot.querySelectorAll('.woocommerce-notices-wrapper').forEach(function (wrapper) {
            wrapper.replaceChildren();
          });
        }
        if (crProductDebug) crProductDebug.noticeAfterClear();
      }
      function applyWooCartFragments(response) {
        var fragments = response.fragments || {};
        Object.keys(fragments).forEach(function (selector) {
          if (/woocommerce-notices-wrapper/.test(selector)) return;
          window.jQuery(selector).replaceWith(fragments[selector]);
        });
        var params = window.wc_cart_fragments_params || {};
        var cartHashKey = params.cart_hash_key || 'wc_cart_hash';
        var fragmentName = params.fragment_name || 'wc_fragments';
        try {
          window.sessionStorage.setItem(cartHashKey, response.cart_hash);
          window.sessionStorage.setItem(fragmentName, JSON.stringify(fragments));
        } catch (error) {}
        try {
          window.localStorage.setItem(cartHashKey, response.cart_hash);
        } catch (error) {}
      }
      function showWooAddToCartError(message) {
        var noticeRoot = getProductDetailNoticeRoot();
        var wrapper = noticeRoot.querySelector('div.woocommerce-notices-wrapper');
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'woocommerce-notices-wrapper';
          form.parentNode.insertBefore(wrapper, form);
        }
        wrapper.innerHTML = '<ul class="woocommerce-error" role="alert"><li></li></ul>';
        wrapper.querySelector('li').textContent = message;
      }
      function releaseAddToCartLock() {
        isAddingToCart = false;
        if (nativeButton) {
          nativeButton.removeAttribute('aria-busy');
          nativeButton.removeAttribute('aria-disabled');
        }
        syncVariationState();
      }
      function refreshWooErrorNotices() {
        var refreshUrl = getWooAjaxUrl('get_refreshed_fragments');
        if (!refreshUrl) {
          showWooAddToCartError('No se ha podido añadir el producto al carrito. Inténtalo de nuevo.');
          releaseAddToCartLock();
          return;
        }
        var noticeUrl = refreshUrl + (refreshUrl.indexOf('?') === -1 ? '?' : '&') + 'cr_product_detail=1';
        window.jQuery.ajax({ url: noticeUrl, method: 'GET', dataType: 'json' })
          .done(function (response) {
            var fragments = response && response.fragments ? response.fragments : {};
            var renderedNotice = false;
            Object.keys(fragments).forEach(function (selector) {
              var noticeRoot = getProductDetailNoticeRoot();
              var $current = selector === 'div.woocommerce-notices-wrapper'
                ? window.jQuery(noticeRoot).find(selector).first()
                : window.jQuery(selector);
              if ($current.length) $current.replaceWith(fragments[selector]);
              else if (selector === 'div.woocommerce-notices-wrapper') window.jQuery(form).before(fragments[selector]);
              if (selector === 'div.woocommerce-notices-wrapper' && /woocommerce-error/.test(fragments[selector])) renderedNotice = true;
            });
            if (Object.keys(fragments).length) window.jQuery(document.body).trigger('wc_fragments_refreshed');
            if (!renderedNotice) showWooAddToCartError('WooCommerce no ha podido añadir el producto al carrito. Comprueba la combinación y vuelve a intentarlo.');
          })
          .fail(function () {
            showWooAddToCartError('No se ha podido confirmar la operación. Comprueba el carrito antes de volver a intentarlo.');
          })
          .always(releaseAddToCartLock);
      }
      function submitProductDetailAddToCart(event) {
        if (isAddingToCart) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (!variationId || Number(variationId.value) <= 0) return;
        if (typeof form.checkValidity === 'function' && !form.checkValidity()) return;
        var addUrl = getWooAjaxUrl('add_to_cart');
        if (!addUrl || !window.jQuery) return;

        if (crProductDebug) {
          var debugQuantityInput = form.querySelector('input.qty[name="quantity"], input[name="quantity"]');
          crProductDebug.beginSubmit(variationId.value, debugQuantityInput ? debugQuantityInput.value : '1');
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        clearProductDetailNotices();
        isAddingToCart = true;
        if (nativeButton) {
          nativeButton.setAttribute('aria-busy', 'true');
          nativeButton.setAttribute('aria-disabled', 'true');
        }
        window.jQuery.ajax({
          type: 'POST',
          url: addUrl,
          data: buildNativeAddToCartPayload(),
          dataType: 'json'
        }).done(function (response) {
          if (crProductDebug) crProductDebug.log('RESPONSE_RECEIVED', {
            error: response && response.error ? 'yes' : 'no',
            fragments: response && response.fragments && Object.keys(response.fragments).length ? 'yes' : 'no',
            cartHash: response && typeof response.cart_hash !== 'undefined' && response.cart_hash !== '' ? 'yes' : 'no'
          });
          if (!response || response.error || !response.fragments || typeof response.cart_hash === 'undefined') {
            if (crProductDebug) crProductDebug.log('BRANCH_ERROR');
            refreshWooErrorNotices();
            return;
          }
          if (crProductDebug) crProductDebug.log('BRANCH_SUCCESS');
          applyWooCartFragments(response);
          clearProductDetailNotices();
          showAddedFeedback();
          window.jQuery(document.body).trigger('added_to_cart', [
            response.fragments,
            response.cart_hash,
            window.jQuery(nativeButton)
          ]);
          if (crProductDebug) crProductDebug.log('ADDED_TO_CART_EVENT');
          clearProductDetailNotices();
          releaseAddToCartLock();
        }).fail(function () {
          if (crProductDebug) crProductDebug.log('BRANCH_ERROR');
          refreshWooErrorNotices();
        });
      }
      form.addEventListener('submit', submitProductDetailAddToCart, true);
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
