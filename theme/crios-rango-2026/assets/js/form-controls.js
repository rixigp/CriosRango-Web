(() => {
  'use strict';
  const isFloatingLabel = (label) => label && !label.matches('.woocommerce-form__label-for-checkbox,.woocommerce-form-login__rememberme,[for="terms"],[for="shipping_method"]');
  const makeControl = (row, label, content) => {
    if (!row || row.dataset.crControl === 'true' || !label || !content) return;
    const shell = document.createElement('fieldset');
    shell.className = 'cr-control-shell';
    const legend = document.createElement('legend');
    legend.appendChild(label);
    shell.appendChild(legend);
    row.insertBefore(shell, row.firstChild);
    shell.appendChild(content);
    Array.from(row.childNodes).forEach((node) => {
      if (node !== shell && node.nodeType === Node.ELEMENT_NODE && node.matches('.description,.select2-container')) shell.appendChild(node);
    });
    row.dataset.crControl = 'true';
  };
  const findWooControlContent = (row) => {
    const directChildren = Array.from(row.children);
    const wrapper = directChildren.find((child) =>
      child.matches('.woocommerce-input-wrapper,.password-input,.wp-pwd')
    );
    if (wrapper) return wrapper;
    return directChildren.find((child) =>
      child.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]),select,textarea')
    );
  };
  const enhanceWoo = (root) => {
    root.querySelectorAll(
      'form .form-row,' +
      'form .form-group,' +
      'form .form-field,' +
      '.wpfda-delete-account-container p,' +
      '.woocommerce-address-fields .form-row,' +
      '.wpfda-delete-account-container .form-row'
    ).forEach((row) => {
      if (row.dataset.crControl === 'true') return;
      const label = Array.from(row.children).find((child) => child.tagName === 'LABEL' && isFloatingLabel(child));
      if (!label) return;
      const content = findWooControlContent(row);
      if (!content) return;
      makeControl(row, label, content);
    });
    root.querySelectorAll('.cr-account-birth-date').forEach((row) => {
      if (row.dataset.crControl === 'true') return;
      const label = row.querySelector(':scope > label');
      const value = row.querySelector(':scope > .cr-account-birth-date__value');
      if (!label || !value) return;
      const shell = document.createElement('fieldset');
      shell.className = 'cr-control-shell';
      const legend = document.createElement('legend');
      legend.appendChild(label);
      value.classList.add('cr-control-shell__value');
      shell.append(legend, value);
      row.appendChild(shell);
      row.dataset.crControl = 'true';
    });
  };
  const enhanceWordPressLogin = () => {
    document.querySelectorAll('#loginform, #lostpasswordform, #resetpassform, #registerform').forEach((form) => {
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
        const content = input.closest('.wp-pwd') || input;
        const shell = document.createElement('fieldset');
        shell.className = 'cr-control-shell';
        const legend = document.createElement('legend');
        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.textContent = copy;
        legend.appendChild(label);
        shell.append(legend, content);
        oldLabel.remove();
        row.insertBefore(shell, row.firstChild);
      });
    });
  };
  const enhance = () => { enhanceWoo(document); enhanceWordPressLogin(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once:true });
  else enhance();

  window.addEventListener('load', enhance, { once: true });

  if ('MutationObserver' in window) {
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        enhance();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (window.jQuery) {
    window.jQuery(document.body).on(
      'updated_checkout.crControl country_to_state_changed.crControl',
      enhance
    );
  }
})();