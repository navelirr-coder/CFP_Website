// Enquiries are prepared entirely in the browser; no API or database is involved.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const button = document.getElementById('enquirySubmit');
  const status = document.getElementById('enquiryStatus');
  const whatsappLink = document.getElementById('enquiryWhatsappLink');
  const fields = {
    fullName: document.getElementById('contactName'),
    email: document.getElementById('contactEmail'),
    subject: document.getElementById('contactSubject'),
    message: document.getElementById('contactMessage')
  };

  function showStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
    status.focus();
  }

  function clearForm() {
    form.reset();
    Object.values(fields).forEach(field => { field.value = ''; });
  }

  // If popups were blocked, keep the form until the visitor uses the prepared link.
  whatsappLink.addEventListener('click', () => {
    clearForm();
    showStatus('Your message is ready in WhatsApp. Press Send there to complete your enquiry.', 'success');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const field of Object.values(fields)) field.value = field.value.trim();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
    const text = `Customer enquiry - Chaudhari Farm Products\nName: ${values.fullName}\nEmail: ${values.email}\nSubject: ${values.subject}\n\n${values.message}`;
    const url = `https://wa.me/919960725539?text=${encodeURIComponent(text)}`;
    whatsappLink.href = url;
    whatsappLink.textContent = 'Open your prepared WhatsApp message →';
    whatsappLink.hidden = false;

    // Open synchronously in the user gesture. No credentials or database calls belong here.
    let popup = null;
    try {
      popup = window.open('about:blank', '_blank');
      if (popup) {
        popup.opener = null;
        popup.location.replace(url);
      }
    } catch {
      try { popup?.close(); } catch { /* Already closed. */ }
      popup = null;
    }
    if (popup) {
      clearForm();
      showStatus('Your message is ready in WhatsApp. Press Send there to complete your enquiry.', 'success');
    } else {
      showStatus('Use the link below to open your prepared WhatsApp message.', 'notice');
    }
    button.disabled = false;
  });
});
