(() => {
  'use strict';
  const enhance = () => {
    document.querySelectorAll('#loginform, #lostpasswordform, #resetpassform').forEach((form) => {
      form.querySelectorAll(':scope > p label').forEach((label) => {
        if (label.querySelector('.cr-form-control__label')) return;
        const input = label.querySelector('input:not([type="checkbox"]):not([type="submit"])');
        if (!input) return;
        let copy = '';
        for (const child of Array.from(label.childNodes)) {
          if (child === input) break;
          if (child.nodeType === Node.TEXT_NODE) copy += child.textContent;
        }
        copy = copy.replace(/\s+/g, ' ').trim();
        if (!copy) return;
        const floating = document.createElement('span');
        floating.className = 'cr-form-control__label';
        floating.textContent = copy;
        label.insertBefore(floating, label.firstChild);
        Array.from(label.childNodes).forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE || child.nodeName === 'BR') child.remove();
        });
        label.classList.add('cr-form-control');
      });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true });
  else enhance();
})();
