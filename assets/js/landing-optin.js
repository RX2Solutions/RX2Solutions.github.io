(function () {
  'use strict';

  const forms = Array.from(document.querySelectorAll('.lp-form'));
  const dialogBackdrop = document.querySelector('[data-lp-dialog]');
  const dialogForm = dialogBackdrop ? dialogBackdrop.querySelector('[data-lp-dialog-form]') : null;
  const dialogClose = dialogBackdrop ? dialogBackdrop.querySelector('[data-lp-dialog-close]') : null;
  const dialogEmailField = dialogBackdrop ? dialogBackdrop.querySelector('[data-lp-dialog-email]') : null;
  const dialogMessage = dialogForm ? dialogForm.querySelector('.lp-form-message') : null;
  const dialogFirstInput = dialogForm ? dialogForm.querySelector('input[name="full_name"]') : null;

  if (!forms.length) {
    return;
  }

  let activeForm = null;
  let lastEmail = '';
  let lastEndpoint = '';
  let fallbackRedirect = '';
  let lastFocusedElement = null;

  const MESSAGE_CLASSES = ['is-error', 'is-success'];
  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  forms.forEach(function (form) {
    form.dataset.loading = 'false';
    form.addEventListener('submit', handlePrimarySubmit);
  });

  if (dialogForm) {
    dialogForm.dataset.loading = 'false';
    dialogForm.addEventListener('submit', handleDialogSubmit);
  }

  if (dialogClose) {
    dialogClose.addEventListener('click', function () {
      closeDialog();
    });
  }

  if (dialogBackdrop) {
    dialogBackdrop.addEventListener('click', function (event) {
      if (event.target === dialogBackdrop) {
        closeDialog();
      }
    });
  }

  document.addEventListener('keydown', function (event) {
    if (!isDialogOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (event.key === 'Tab' && dialogBackdrop) {
      const focusable = Array.prototype.filter.call(
        dialogBackdrop.querySelectorAll(FOCUSABLE_SELECTOR),
        function (element) {
          return element.offsetParent !== null;
        }
      );

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      }
    }
  });

  function handlePrimarySubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
      if (typeof form.reportValidity === 'function') {
        form.reportValidity();
      }
      return;
    }

    const messageEl = form.querySelector('.lp-form-message');
    setMessage(messageEl, '');
    setLoading(form, true, 'Sending...');

    const emailField = form.querySelector('input[type="email"]');
    const emailValue = emailField ? emailField.value.trim() : '';
    if (!emailValue) {
      setLoading(form, false);
      setMessage(messageEl, 'Please enter a valid email address to continue.', 'is-error');
      if (emailField) {
        emailField.focus();
      }
      return;
    }

    const endpoint = form.getAttribute('action') || '';

    if (shouldSimulate(form, endpoint)) {
      simulatePrimarySuccess(form, emailValue, messageEl);
      setLoading(form, false);
      return;
    }

    const formData = new FormData(form);
    formData.append('submission_stage', 'opt_in');

    fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      },
      redirect: 'follow',
      credentials: 'omit'
    })
      .then(function (response) {
        return parseResponse(response).then(function (parsed) {
          if (!response.ok) {
            throw new Error(parsed.message || 'We hit an error while saving your email.');
          }
          activeForm = form;
          lastEmail = emailValue;
          lastEndpoint = endpoint;
          fallbackRedirect = parsed.redirectUrl || form.dataset.contentUrl || (dialogForm ? dialogForm.dataset.contentUrl : '') || '';
          setMessage(messageEl, 'Great! Let\'s finish your profile to unlock the frameworks.', 'is-success');
          openDialog();
        });
      })
      .catch(function (error) {
        console.error('Opt-in primary submission failed', error);
        if (shouldSimulate(form, endpoint)) {
          simulatePrimarySuccess(form, emailValue, messageEl);
        } else {
          setMessage(messageEl, error.message || 'We could not add your email right now. Please try again.', 'is-error');
        }
      })
      .finally(function () {
        setLoading(form, false);
      });
  }

  function handleDialogSubmit(event) {
    event.preventDefault();

    if (!dialogForm) {
      return;
    }

    if (typeof dialogForm.checkValidity === 'function' && !dialogForm.checkValidity()) {
      if (typeof dialogForm.reportValidity === 'function') {
        dialogForm.reportValidity();
      }
      return;
    }

    const endpoint = dialogForm.dataset.endpoint && dialogForm.dataset.endpoint !== '#'
      ? dialogForm.dataset.endpoint
      : lastEndpoint;

    if (shouldSimulate(dialogForm, endpoint)) {
      simulateDialogSuccess();
      return;
    }

    if (!endpoint) {
      setMessage(dialogMessage, 'We could not find the opt-in endpoint. Please reload and try again.', 'is-error');
      return;
    }

    if (!lastEmail && dialogEmailField && dialogEmailField.value) {
      lastEmail = dialogEmailField.value.trim();
    }

    if (!lastEmail) {
      setMessage(dialogMessage, 'We could not determine your email address. Please start again.', 'is-error');
      closeDialog();
      return;
    }

    const formData = new FormData(dialogForm);
    formData.set('email', lastEmail);
    formData.append('submission_stage', 'profile_completion');

    if (activeForm && activeForm.dataset.pageName) {
      formData.append('page_name', activeForm.dataset.pageName);
    }

    setMessage(dialogMessage, '');
    setLoading(dialogForm, true, 'Saving...');

    fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      },
      redirect: 'follow',
      credentials: 'omit'
    })
      .then(function (response) {
        return parseResponse(response).then(function (parsed) {
          if (!response.ok) {
            throw new Error(parsed.message || 'We could not save your profile details.');
          }
          const redirectTo = parsed.redirectUrl || dialogForm.dataset.contentUrl || fallbackRedirect;
          if (redirectTo) {
            window.location.href = redirectTo;
            return;
          }
          setMessage(dialogMessage, 'Profile updated. Check your inbox for the download link.', 'is-success');
          window.setTimeout(function () {
            closeDialog();
          }, 1800);
        });
      })
      .catch(function (error) {
        console.error('Profile completion failed', error);
        if (shouldSimulate(dialogForm, endpoint)) {
          simulateDialogSuccess();
        } else {
          setMessage(dialogMessage, error.message || 'We could not save your details right now. Please try again.', 'is-error');
        }
      })
      .finally(function () {
        setLoading(dialogForm, false);
      });
  }

  function shouldSimulate(target, endpoint) {
    if (!target) {
      return false;
    }
    const datasetFlag = target.dataset && target.dataset.simulateApi;
    if (datasetFlag && datasetFlag.toString() === 'true') {
      return true;
    }
    const finalEndpoint = endpoint || (typeof target.getAttribute === 'function' ? target.getAttribute('action') : '') || '';
    if (!finalEndpoint || finalEndpoint === '#') {
      return true;
    }
    if (/example\.com/i.test(finalEndpoint)) {
      return true;
    }
    return false;
  }

  function openDialog() {
    if (!dialogBackdrop || !dialogForm) {
      return;
    }

    if (dialogForm instanceof HTMLFormElement) {
      dialogForm.reset();
      dialogForm.dataset.loading = 'false';
    }

    if (dialogEmailField) {
      dialogEmailField.value = lastEmail;
    }

    setMessage(dialogMessage, '');

    lastFocusedElement = document.activeElement;
    dialogBackdrop.hidden = false;
    window.requestAnimationFrame(function () {
      dialogBackdrop.classList.add('is-open');
      document.body.classList.add('lp-dialog-open');
      if (dialogForm) {
        dialogForm.dataset.endpoint = lastEndpoint || dialogForm.dataset.endpoint || '';
      }
      if (dialogFirstInput) {
        dialogFirstInput.focus();
      }
    });
  }

  function closeDialog() {
    if (!dialogBackdrop) {
      return;
    }

    dialogBackdrop.classList.remove('is-open');
    document.body.classList.remove('lp-dialog-open');

    if (dialogForm instanceof HTMLFormElement) {
      dialogForm.dataset.loading = 'false';
      dialogForm.reset();
    }

    setMessage(dialogMessage, '');
    if (dialogEmailField) {
      dialogEmailField.value = '';
    }

    window.setTimeout(function () {
      if (dialogBackdrop) {
        dialogBackdrop.hidden = true;
      }
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
      lastFocusedElement = null;
    }, 220);
  }

  function isDialogOpen() {
    return dialogBackdrop ? dialogBackdrop.classList.contains('is-open') : false;
  }

  function setMessage(target, text, type) {
    if (!target) {
      return;
    }
    MESSAGE_CLASSES.forEach(function (cls) {
      target.classList.remove(cls);
    });
    if (type) {
      target.classList.add(type);
    }
    target.textContent = text || '';
  }

  function setLoading(form, isLoading, text) {
    if (!form) {
      return;
    }
    form.dataset.loading = isLoading ? 'true' : 'false';
    const button = form.querySelector('button[type="submit"]');
    if (!button) {
      return;
    }
    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      if (text) {
        button.textContent = text;
      }
      button.disabled = true;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  function parseResponse(response) {
    const result = {
      message: '',
      redirectUrl: '',
      status: response.status
    };

    const contentType = response.headers.get('content-type') || '';

    if (contentType.indexOf('application/json') !== -1) {
      return response.json().then(function (data) {
        if (data && typeof data === 'object') {
          const redirectKeys = ['redirect', 'redirect_url', 'redirectUrl', 'download', 'download_url', 'downloadUrl', 'url', 'location'];
          for (let i = 0; i < redirectKeys.length; i += 1) {
            const key = redirectKeys[i];
            if (data[key] && typeof data[key] === 'string') {
              result.redirectUrl = data[key];
              break;
            }
          }
          const messageKeys = ['message', 'detail', 'error', 'status'];
          for (let j = 0; j < messageKeys.length; j += 1) {
            const key = messageKeys[j];
            if (data[key] && typeof data[key] === 'string') {
              result.message = data[key];
              break;
            }
          }
        }
        if (!result.redirectUrl && response.redirected) {
          result.redirectUrl = response.url;
        }
        return result;
      }).catch(function () {
        if (response.redirected) {
          result.redirectUrl = response.url;
        }
        return result;
      });
    }

    if (contentType.indexOf('text/') !== -1) {
      return response.text().then(function (bodyText) {
        if (bodyText) {
          result.message = bodyText.trim();
          if (!result.redirectUrl) {
            const match = bodyText.match(/https?:\/\/\S+/);
            if (match) {
              result.redirectUrl = match[0];
            }
          }
        }
        if (!result.redirectUrl && response.redirected) {
          result.redirectUrl = response.url;
        }
        return result;
      }).catch(function () {
        if (response.redirected) {
          result.redirectUrl = response.url;
        }
        return result;
      });
    }

    if (response.redirected) {
      result.redirectUrl = response.url;
    }

    return Promise.resolve(result);
  }

  function simulatePrimarySuccess(form, emailValue, messageEl) {
    activeForm = form;
    lastEmail = emailValue;
    lastEndpoint = form.getAttribute('action') || '';
    fallbackRedirect = form.dataset.contentUrl || (dialogForm ? dialogForm.dataset.contentUrl : '') || '';
    setMessage(messageEl, 'Great! Let\'s finish your profile to unlock the frameworks.', 'is-success');
    window.setTimeout(function () {
      openDialog();
    }, 200);
  }

  function simulateDialogSuccess() {
    const redirectTo = dialogForm && (dialogForm.dataset.contentUrl || fallbackRedirect);
    if (redirectTo) {
      window.location.href = redirectTo;
      return;
    }
    setMessage(dialogMessage, 'Profile updated. Check your inbox for the download link.', 'is-success');
    window.setTimeout(function () {
      closeDialog();
    }, 1600);
  }
})();
