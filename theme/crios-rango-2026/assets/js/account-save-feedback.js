(() => {
  'use strict';

  // WooCommerce wraps the .woocommerce-address-fields DIV in a plain form.
  // Bind to that outer form rather than incorrectly requiring the DIV class
  // to be present on the form element itself.
  const forms = Array.from(document.querySelectorAll(
    'body.woocommerce-account form.woocommerce-EditAccountForm, body.woocommerce-account form:has(.woocommerce-address-fields)'
  ));
  if (!forms.length) return;

  const submitSelector = 'button[name="save_account_details"], button[name="save_address"]';

  const ensureLabel = (button) => {
    let label = button.querySelector('.cr-account-submit__label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'cr-account-submit__label';
      while (button.firstChild) label.appendChild(button.firstChild);
      button.appendChild(label);
    }

    let spinner = button.querySelector('.cr-account-submit__spinner');
    if (!spinner) {
      spinner = document.createElement('span');
      spinner.className = 'cr-account-submit__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      button.appendChild(spinner);
    }
    return label;
  };

  const restore = (form, button) => {
    form.dataset.crAccountSubmitting = '0';
    form.dataset.crAccountNativeSubmitReady = '0';
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

  const normalizePasswordNotice = (notice) => {
    if (!document.body.classList.contains('cr-account-profile-view-password')) return;
    const items = Array.from(notice.querySelectorAll('li'));
    items.forEach((item) => {
      const message = item.textContent.trim();
      if (/your current password is incorrect|contraseña actual.{0,30}(incorrecta|no es correcta)/i.test(message)) {
        item.textContent = 'La contraseña actual no es correcta.';
      } else if (/new passwords do not match|las nuevas contraseñas no coinciden/i.test(message)) {
        item.textContent = 'Las nuevas contraseñas no coinciden.';
      } else if (/please fill out all password fields|please enter your current password|please re-enter your password/i.test(message)) {
        item.textContent = 'Por favor, rellena todos los campos de contraseña.';
      }
    });
  };

  const showPasswordError = (form, button, message) => {
    const buttonRow = button.closest('p, .form-row') || button;
    let notice = form.querySelector('.cr-password-inline-error');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'cr-password-inline-error';
      notice.setAttribute('role', 'alert');
      notice.setAttribute('aria-live', 'polite');
      const icon = document.createElement('span');
      icon.className = 'cr-password-inline-error__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '!';
      const text = document.createElement('span');
      text.className = 'cr-password-inline-error__text';
      notice.append(icon, text);
    }
    notice.querySelector('.cr-password-inline-error__text').textContent = message;
    if (buttonRow.parentNode) buttonRow.parentNode.insertBefore(notice, buttonRow);
  };

  const neutralizePasswordHint = (form) => {
    if (!document.body.classList.contains('cr-account-profile-view-password')) return;
    form.querySelectorAll('.woocommerce-password-hint').forEach((hint) => {
      hint.textContent = 'Usa una contraseña segura combinando letras, números y símbolos.';
    });
  };

  const moveErrorsInline = (form, button) => {
    const notices = Array.from(document.querySelectorAll(
      '.woocommerce-notices-wrapper .woocommerce-error, .woocommerce .woocommerce-error'
    ));
    notices.forEach((notice) => {
      if (notice.dataset.crAccountInline === '1') return;
      notice.dataset.crAccountInline = '1';
      normalizePasswordNotice(notice);
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
    neutralizePasswordHint(form);
    ensureLabel(button);

    form.addEventListener('submit', (event) => {
      // This second submit is the native continuation after the loading state
      // has had a rendering opportunity. The clicked submitter is captured
      // and preserved through requestSubmit(button) for WooCommerce's POST.
      if (form.dataset.crAccountSubmitting === '1'
        && form.dataset.crAccountNativeSubmitReady === '1') {
        form.dataset.crAccountNativeSubmitReady = '0';

        // Do not disable the submitter until the submit event has dispatched:
        // WooCommerce requires its name/value in the native POST.
        window.setTimeout(() => {
          if (event.defaultPrevented) {
            restore(form, button);
            return;
          }
          button.disabled = true;
        }, 0);
        return;
      }

      if (form.dataset.crAccountSubmitting === '1') {
        event.preventDefault();
        return;
      }

      if (document.body.classList.contains('cr-account-profile-view-password')) {
        const current = form.querySelector('input[name="password_current"]');
        const newPassword = form.querySelector('input[name="password_1"]');
        const confirmation = form.querySelector('input[name="password_2"]');
        const fieldsComplete = current && newPassword && confirmation
          && current.value.length > 0
          && newPassword.value.length > 0
          && confirmation.value.length > 0;

        if (!fieldsComplete) {
          event.preventDefault();
          showPasswordError(form, button, 'Por favor, rellena todos los campos de contraseña.');
          return;
        }

        if (newPassword.value !== confirmation.value) {
          event.preventDefault();
          showPasswordError(form, button, 'Las nuevas contraseñas no coinciden.');
          return;
        }

        const priorClientError = form.querySelector('.cr-password-inline-error');
        if (priorClientError) priorClientError.remove();
      }

      // Intercept once, activate loading, then let the browser paint across
      // two animation frames before resuming the native WooCommerce submit.
      event.preventDefault();
      form.dataset.crAccountSubmitting = '1';
      form.classList.add('cr-account-form--loading');
      button.classList.add('cr-account-submit--loading');
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-disabled', 'true');

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (typeof form.requestSubmit === 'function') {
            form.dataset.crAccountNativeSubmitReady = '1';
            form.requestSubmit(button);
          } else {
            // Legacy fallback: programmatic click preserves the submitter.
            form.dataset.crAccountNativeSubmitReady = '1';
            button.click();
          }
        });
      });
    }, false);
  });
})();
