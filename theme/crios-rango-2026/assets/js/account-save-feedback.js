(() => {
  'use strict';

  const forms = Array.from(document.querySelectorAll(
    'body.woocommerce-account form.woocommerce-EditAccountForm, body.woocommerce-account form.woocommerce-address-fields'
  ));
  if (!forms.length) return;

  const submitSelector = 'button[name="save_account_details"], button[name="save_address"]';

  const ensureLabel = (button) => {
    let label = button.querySelector('.cr-account-submit__label');
    if (label) return label;
    label = document.createElement('span');
    label.className = 'cr-account-submit__label';
    while (button.firstChild) label.appendChild(button.firstChild);
    button.appendChild(label);
    return label;
  };

  const restore = (form, button) => {
    form.dataset.crAccountSubmitting = '0';
    button.disabled = false;
    form.classList.remove('cr-account-form--loading');
    button.classList.remove('cr-account-submit--loading');
    button.removeAttribute('aria-busy');
    button.removeAttribute('aria-disabled');
  };

  const positionSuccessFeedback = (form, button) => {
    const feedback = form.querySelector('.cr-account-save-feedback')
      || document.querySelector('.cr-account-save-feedback');
    if (!feedback) return;
    const buttonRow = button.closest('p, .form-row') || button;
    if (buttonRow.parentNode && feedback.nextElementSibling !== buttonRow) {
      buttonRow.parentNode.insertBefore(feedback, buttonRow);
    }
  };

  const moveErrorsInline = (form, button) => {
    const notices = Array.from(document.querySelectorAll(
      '.woocommerce-notices-wrapper .woocommerce-error, .woocommerce .woocommerce-error'
    ));
    notices.forEach((notice) => {
      if (notice.dataset.crAccountInline === '1') return;
      notice.dataset.crAccountInline = '1';
      notice.classList.add('cr-account-save-feedback--error');
      const buttonRow = button.closest('p, .form-row') || button;
      buttonRow.parentNode.insertBefore(notice, buttonRow);
    });
  };

  forms.forEach((form) => {
    const button = form.querySelector(submitSelector);
    if (!button) return;

    moveErrorsInline(form, button);
    positionSuccessFeedback(form, button);
    ensureLabel(button);

    form.addEventListener('submit', (event) => {
      if (form.dataset.crAccountSubmitting === '1') {
        event.preventDefault();
        return;
      }

      form.dataset.crAccountSubmitting = '1';
      form.classList.add('cr-account-form--loading');
      button.classList.add('cr-account-submit--loading');
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-disabled', 'true');

      // Defer the native disabled property until after the browser has captured
      // the clicked submitter (WooCommerce relies on its name/value in POST).
      window.setTimeout(() => {
        if (event.defaultPrevented) {
          restore(form, button);
          return;
        }
        button.disabled = true;
      }, 0);
    }, false);
  });
})();
