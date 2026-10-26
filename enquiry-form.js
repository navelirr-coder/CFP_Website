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
  const enquirySource = new URLSearchParams(location.search).get('enquiry');
  const source = ['turmeric-fingers', 'turmeric-powder'].includes(enquirySource) ? enquirySource : 'contact';
  let pending = null;
  let busy = false;

  function showStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
  }

  function requestId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    for (const field of Object.values(fields)) field.value = field.value.trim();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
    const fingerprint = JSON.stringify({ ...values, source });
    try {
      if (!pending || pending.fingerprint !== fingerprint) pending = { fingerprint, id: requestId() };
    } catch {
      showStatus('Please open this page over HTTPS to submit an enquiry securely.', 'error');
      return;
    }

    // Open during the user's gesture; assigning the destination after saving avoids popup blocking.
    let whatsappWindow = null;
    try {
      whatsappWindow = window.open('about:blank', '_blank');
      if (whatsappWindow) whatsappWindow.opener = null;
    } catch { /* The explicit WhatsApp link remains available if popups are blocked. */ }
    busy = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    Object.values(fields).forEach(field => { field.readOnly = true; });
    const originalLabel = button.textContent;
    button.textContent = 'Recording your enquiry…';
    whatsappLink.hidden = true;
    showStatus('Recording your enquiry before opening WhatsApp…', 'pending');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, source, requestId: pending.id }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        if (response.status === 409) pending = null;
        throw new Error(result?.error || 'We could not record your enquiry. Please try again or contact us directly on WhatsApp.');
      }
      const destination = new URL(result.whatsappUrl);
      if (destination.origin !== 'https://wa.me' || destination.pathname !== '/919960725539') {
        throw new Error('Your enquiry was recorded, but WhatsApp could not be opened. Please contact +91 9960725539.');
      }
      whatsappLink.href = destination.href;
      whatsappLink.hidden = false;
      whatsappLink.textContent = 'Open your prepared WhatsApp message →';
      if (whatsappWindow && !whatsappWindow.closed) {
        try { whatsappWindow.location.replace(destination.href); }
        catch { whatsappWindow.close(); }
      }
      // This confirms a database submission only. A chat link cannot confirm sending or delivery.
      showStatus('Thank you! Your enquiry has been recorded. Please press Send in WhatsApp to send your message to +91 9960725539. If WhatsApp did not open, use the link below.', 'success');
      form.reset();
      Object.values(fields).forEach(field => { field.value = ''; });
      pending = null;
      status.focus();
    } catch (error) {
      try { if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close(); } catch { /* Already closed. */ }
      showStatus(error.name === 'AbortError' ? 'The request timed out. Your form is unchanged. Please try again.' : error.message, 'error');
      const text = `Customer enquiry - Chaudhari Farm Products\nName: ${values.fullName}\nEmail: ${values.email}\nSubject: ${values.subject}\n\n${values.message}`;
      whatsappLink.href = `https://wa.me/919960725539?text=${encodeURIComponent(text)}`;
      whatsappLink.textContent = 'Contact us directly on WhatsApp →';
      whatsappLink.hidden = false;
      status.focus();
    } finally {
      clearTimeout(timer);
      busy = false;
      button.disabled = false;
      button.textContent = originalLabel;
      form.removeAttribute('aria-busy');
      Object.values(fields).forEach(field => { field.readOnly = false; });
    }
  });
});
