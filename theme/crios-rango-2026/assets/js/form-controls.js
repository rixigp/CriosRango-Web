(() => {
  'use strict';
  const isFloatingLabel = (label) => label && !label.matches('.woocommerce-form__label-for-checkbox,.woocommerce-form-login__rememberme,[for="terms"]');
  const makeControl = (row, label, content) => {
    if (!row || row.dataset.crControl === 'true' || !label || !content) return;
    const control = document.createElement('div');
    control.className = 'cr-control';
    const box = document.createElement('div');
    box.className = 'cr-control__box';
    label.classList.add('cr-control__label');
    row.insertBefore(control, row.firstChild);
    control.append(label, box);
    box.appendChild(content);
    Array.from(row.childNodes).forEach((node) => {
      if (node !== control && node.nodeType === Node.ELEMENT_NODE && node.matches('.description,.select2-container')) box.appendChild(node);
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
      '.woocommerce form .form-row,' +
      'form.woocommerce-EditAccountForm .form-row,' +
      '.woocommerce-address-fields .form-row,' +
      'form.checkout .form-row,' +
      'form.woocommerce-form-login .form-row,' +
      'form.woocommerce-ResetPassword .form-row'
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
      const control = document.createElement('div');
      control.className = 'cr-control';
      const box = document.createElement('div');
      box.className = 'cr-control__box';
      label.classList.add('cr-control__label');
      value.classList.add('cr-control__value');
      control.append(label, box);
      box.appendChild(value);
      row.appendChild(control);
      row.dataset.crControl = 'true';
    });
  };
  const enhanceWordPressLogin = () => {
    document.querySelectorAll('#loginform, #lostpasswordform, #resetpassform').forEach((form) => {
      form.querySelectorAll(':scope > p, :scope > .user-pass-wrap, :scope > .user-pass1-wrap, :scope > .user-pass2-wrap').forEach((row) => {
        if (row.querySelector(':scope > .cr-control')) return;
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
        const control = document.createElement('div');
        control.className = 'cr-control' + (input.type === 'password' ? ' cr-control--password' : '');
        const label = document.createElement('label');
        label.className = 'cr-control__label';
        label.htmlFor = input.id;
        label.textContent = copy;
        const box = document.createElement('div');
        box.className = 'cr-control__box';
        box.appendChild(content);
        oldLabel.remove();
        control.append(label, box);
        row.insertBefore(control, row.firstChild);
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