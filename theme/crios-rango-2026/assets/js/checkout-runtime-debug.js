(function () {
  'use strict';
  var panel = document.getElementById('cr-checkout-runtime-debug');
  if (!panel) return;

  function visible(el) {
    if (!el || !el.getClientRects().length) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }
  function count(selector) {
    return Array.prototype.filter.call(document.querySelectorAll(selector), visible).length;
  }
  function parentPath(el) {
    var parts = [], node = el ? el.parentElement : null;
    while (node && parts.length < 5) {
      var part = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(part + '#' + node.id); break; }
      if (node.classList && node.classList.length) {
        part += '.' + Array.prototype.slice.call(node.classList).filter(Boolean).slice(0, 2).join('.');
      }
      parts.unshift(part);
      if (node.classList && (node.classList.contains('woocommerce-checkout-review-order-table')
        || node.classList.contains('cr-checkout-shipping-section'))) break;
      node = node.parentElement;
    }
    return parts.join(' > ') || 'ROOT';
  }
  function headingCount() {
    return Array.prototype.filter.call(
      document.querySelectorAll('.cr-checkout-shipping-heading,h1,h2,h3,h4,h5,h6,[role="heading"]'),
      function (el) {
        if (!visible(el)) return false;
        var text = (el.textContent || '').replace(/\s+/g, '').replace(/[·•]/g, '');
        return /^2Envío$/i.test(text);
      }
    ).length;
  }
  function snapshot() {
    var sections = Array.prototype.filter.call(document.querySelectorAll('.cr-checkout-shipping-section'), visible);
    var lists = Array.prototype.filter.call(document.querySelectorAll('#shipping_method'), visible);
    var rows = Array.prototype.filter.call(document.querySelectorAll('tr.woocommerce-shipping-totals.shipping'), visible);
    var headings = headingCount();
    var radios = document.querySelectorAll('input[name^="shipping_method"]').length;
    return {
      headings: headings, lists: lists.length, radios: radios, sections: sections.length, rows: rows.length,
      duplicate: headings > 1 || lists.length > 1 || sections.length > 1,
      sectionPaths: sections.map(parentPath), listPaths: lists.map(parentPath), rowPaths: rows.map(parentPath)
    };
  }
  function write(key, value) {
    var target = panel.querySelector('[data-cr-debug="' + key + '"]');
    if (target) target.textContent = value;
  }
  function summary(data) {
    return 'headings=' + data.headings + '; lists=' + data.lists + '; radios=' + data.radios
      + '; sections=' + data.sections + '; native_rows=' + data.rows;
  }
  function renderCounts(data) {
    write('visible_shipping_heading_count', String(data.headings));
    write('shipping_method_list_count', String(data.lists));
    write('shipping_radio_count', String(data.radios));
    write('cr_shipping_section_count', String(data.sections));
    write('native_shipping_row_count', String(data.rows));
    write('shipping_instance_1_parent_path', data.sectionPaths[0] || 'NONE');
    write('shipping_instance_2_parent_path', data.sectionPaths[1] || 'NONE');
    write('shipping_method_list_parent_paths', data.listPaths.join(' | ') || 'NONE');
    write('native_shipping_row_parent_paths', data.rowPaths.join(' | ') || 'NONE');
  }

  var initial = null;
  function scanInitial() {
    if (initial) return;
    initial = snapshot();
    write('initial', summary(initial));
    write('initial-duplicate', initial.duplicate ? 'YES' : 'NO');
    renderCounts(initial);
  }
  function scanAfterAjax() {
    scanInitial();
    var current = snapshot();
    write('after-ajax', summary(current));
    write('ajax-duplicate', current.duplicate && !initial.duplicate ? 'YES' : 'NO');
    renderCounts(current);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanInitial, { once: true });
  } else {
    scanInitial();
  }
  if (window.jQuery) {
    window.jQuery(document.body).on('updated_checkout.cr2026RuntimeDebug', scanAfterAjax);
  }
})();
