const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../frontend/enquiry-form.js'), 'utf8');
function setup({ blocked = false, throws = false } = {}) {
  const elements = {};
  for (const id of ['contactName', 'contactEmail', 'contactSubject', 'contactMessage', 'enquirySubmit', 'enquiryStatus', 'enquiryWhatsappLink']) {
    elements[id] = { value: '', dataset: {}, hidden: true, listeners: {}, focus() {}, addEventListener(name, fn) { this.listeners[name] = fn; } };
  }
  const input = { contactName: '  Local QA  ', contactEmail: 'qa@example.com', contactSubject: 'Bulk supply & packing', contactMessage: 'Please quote 100 packs.\nDestination: Pune.' };
  Object.entries(input).forEach(([id, value]) => { elements[id].value = value; });
  const form = { valid: true, reportValidity() { return this.valid; }, reset() { this.resetCalled = true; }, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } };
  elements.contactForm = form;
  const popup = { closed: false, location: { replace(url) { popup.url = url; } }, close() { this.closed = true; } };
  let opened = 0;
  vm.runInNewContext(code, {
    document: { getElementById: id => elements[id], addEventListener: (name, fn) => fn() },
    fetch() { throw new Error('Enquiries must never depend on an API'); },
    localStorage: { setItem() { throw new Error('Do not store enquiry content'); } },
    window: { open() { opened++; if (throws) throw new Error('Popup denied'); return blocked ? null : popup; } }
  });
  return { elements, form, popup, opened: () => opened, submit: () => form.listeners.submit({ preventDefault() {} }) };
}
const app = setup(); app.submit();
const url = new URL(app.popup.url);
assert.equal(url.origin, 'https://wa.me'); assert.equal(url.pathname, '/919960725539');
for (const value of ['Local QA', 'qa@example.com', 'Bulk supply & packing', 'Please quote 100 packs.\nDestination: Pune.']) assert.ok(url.searchParams.get('text').includes(value));
assert.equal(app.popup.opener, null);
assert.equal(app.elements.enquiryStatus.dataset.state, 'success');
assert.match(app.elements.enquiryStatus.textContent, /Press Send/);
assert.doesNotMatch(app.elements.enquiryStatus.textContent, /recorded|saved|sent successfully/i);
for (const id of ['contactName', 'contactEmail', 'contactSubject', 'contactMessage']) assert.equal(app.elements[id].value, '');
for (const options of [{ blocked: true }, { throws: true }]) {
  const blocked = setup(options); blocked.submit();
  assert.equal(blocked.form.resetCalled, undefined);
  assert.equal(blocked.elements.contactEmail.value, 'qa@example.com');
  assert.equal(blocked.elements.enquiryWhatsappLink.hidden, false);
  assert.equal(new URL(blocked.elements.enquiryWhatsappLink.href).pathname, '/919960725539');
  blocked.elements.enquiryWhatsappLink.listeners.click();
  assert.equal(blocked.form.resetCalled, true); assert.equal(blocked.elements.contactMessage.value, '');
}
const invalid = setup(); invalid.form.valid = false; invalid.submit();
assert.equal(invalid.opened(), 0); assert.equal(invalid.form.resetCalled, undefined);
console.log('PASS: frontend-only WhatsApp enquiries, exact content/destination, no API/storage, validation, clearing and popup recovery.');
