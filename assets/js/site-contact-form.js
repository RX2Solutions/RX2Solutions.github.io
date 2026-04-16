(function () {
  'use strict';

  const forms = Array.from(document.querySelectorAll('[data-rx2-contact-form]'));

  if (!forms.length) {
    return;
  }

  forms.forEach(function (form) {
    if (!(form instanceof HTMLFormElement) || form.dataset.initialized === 'true') {
      return;
    }

    form.dataset.initialized = 'true';
    form.dataset.loading = 'false';
    form.addEventListener('submit', handleSubmit);
  });

  function handleSubmit(event) {
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

    const endpoint = form.dataset.endpoint || '';
    const messageEl = form.querySelector('[data-rx2-contact-message]');
    const submitButton = form.querySelector('button[type="submit"]');
    const defaultLabel = submitButton ? submitButton.textContent : '';

    if (!endpoint || endpoint === '#') {
      setMessage(messageEl, 'We could not find the submission endpoint. Please reload and try again.', 'is-error');
      return;
    }

    const formData = new FormData(form);
    formData.set('submission_stage', 'profile_completion');

    if (form.dataset.pageName) {
      formData.set('page_name', form.dataset.pageName);
    }

    const payload = formDataToJson(formData);

    setLoading(form, submitButton, true, defaultLabel);
    setMessage(messageEl, 'Sending your information...');

    fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      redirect: 'follow',
      credentials: 'omit'
    })
      .then(function (response) {
        return parseResponse(response).then(function (parsed) {
          if (!response.ok) {
            throw new Error(parsed.error || parsed.message || 'We could not save your information right now.');
          }

          form.reset();
          setMessage(messageEl, form.dataset.successMessage || 'Thanks. We will be in touch shortly.', 'is-success');
        });
      })
      .catch(function (error) {
        console.error('Site contact submission failed', error);
        setMessage(messageEl, error.message || 'We could not submit the form right now. Please try again.', 'is-error');
      })
      .finally(function () {
        setLoading(form, submitButton, false, defaultLabel);
      });
  }

  function setLoading(form, submitButton, isLoading, defaultLabel) {
    form.dataset.loading = isLoading ? 'true' : 'false';

    if (!submitButton) {
      return;
    }

    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Sending...' : defaultLabel;
  }

  function setMessage(element, text, state) {
    if (!element) {
      return;
    }

    element.classList.remove('is-error', 'is-success');

    if (state) {
      element.classList.add(state);
    }

    element.textContent = text || '';
  }

  function formDataToJson(formData) {
    const payload = {};

    formData.forEach(function (value, key) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        if (Array.isArray(payload[key])) {
          payload[key].push(value);
        } else {
          payload[key] = [payload[key], value];
        }
        return;
      }

      payload[key] = value;
    });

    return payload;
  }

  function parseResponse(response) {
    return response.text().then(function (body) {
      if (!body) {
        return {};
      }

      try {
        return JSON.parse(body);
      } catch (error) {
        return {};
      }
    });
  }
}());
