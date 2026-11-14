(() => {
  'use strict';
  const isFloatingLabel = (label) => label && !label.matches('.woocommerce-form__label-for-checkbox,.woocommerce-form-login__rememberme,[for="terms"]');
  const makeShell = (row, label, content) => {
    if (!row || row.dataset.crControlShell === 'true' || !label || !content) return;
    const shell = document.createElement('fieldset');
    shell.className = 'cr-control-shell';
    const legend = document.createElement('legend');
    legend.appendChild(label);
    shell.appendChild(legend);
    row.insertBefore(shell, row.firstChild);
    shell.appendChild(content);
    Array.from(row.childNodes).forEach((node) => {
      if (node !== shell && node.nodeType === Node.ELEMENT_NODE && node.matches('.description,.woocommerce-input-wrapper,.select2-container')) shell.appendChild(node);
    });
    row.dataset.crControlShell = 'true';
  };
  const enhanceWoo = (root) => {
    root.querySelectorAll('.woocommerce form .form-row').forEach((row) => {
      if (row.dataset.crControlShell === 'true') return;
      const label = Array.from(row.children).find((child) => child.tagName === 'LABEL' && isFloatingLabel(child));
      if (!label) return;
      const wrapper = Array.from(row.children).find((child) => child.classList.contains('woocommerce-input-wrapper'));
      if (!wrapper) return;
      makeShell(row, label, wrapper);
    });
    root.querySelectorAll('.cr-account-birth-date').forEach((row) => {
      if (row.dataset.crControlShell === 'true') return;
      const label = row.querySelector(':scope > label');
      const value = row.querySelector(':scope > .cr-account-birth-date__value');
      if (!label || !value) return;
      const shell = document.createElement('fieldset');
      shell.className = 'cr-control-shell';
      const legend = document.createElement('legend');
      legend.appendChild(label);
      shell.append(legend, value);
      value.classList.add('cr-control-shell__value');
      row.appendChild(shell);
      row.dataset.crControlShell = 'true';
    });
  };
  const enhanceWordPressLogin = () => {
    document.querySelectorAll('#loginform, #lostpasswordform, #resetpassform').forEach((form) => {
      form.querySelectorAll(':scope > p, :scope > .user-pass-wrap, :scope > .user-pass1-wrap, :scope > .user-pass2-wrap').forEach((row) => {
        if (row.querySelector(':scope > .cr-control-shell')) return;
        const oldLabel = row.querySelector(':scope > label, label');
        const input = oldLabel && oldLabel.querySelector('input:not([type="checkbox"]):not([type="submit"])');
        if (!oldLabel || !input) return;
        let copy = '';
        for (const node of Array.from(oldLabel.childNodes)) {
          if (node === input || (node.nodeType === Node.ELEMENT_NODE && node.contains(input))) break;
          if (node.nodeType === Node.TEXT_NODE) copy += node.textContent;
        }
        copy = copy.replace(/\s+/g, ' ').trim();
        if (!copy) return;
        const control = input.closest('.wp-pwd') || input;
        const shell = document.createElement('fieldset');
        shell.className = 'cr-control-shell';
        const legend = document.createElement('legend');
        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.textContent = copy;
        legend.appendChild(label);
        shell.append(legend, control);
        oldLabel.remove();
        row.insertBefore(shell, row.firstChild);
      });
    });
  };
  const enhance = () => { enhanceWoo(document); enhanceWordPressLogin(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once:true });
  else enhance();
  if (window.jQuery) window.jQuery(document.body).on('updated_checkout.crControlShell country_to_state_changed.crControlShell', enhance);
})();
