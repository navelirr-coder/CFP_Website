const config = require('../config');
const db = require('../database');
const enquiries = require('../repositories/enquiryRepository');

async function create(req, res, next) {
  try {
    const input = req.body || {};
    const fields = { fullName: [2, 150], email: [3, 254], subject: [1, 200], message: [1, 4000] };
    const values = {};
    for (const [field, [min, max]] of Object.entries(fields)) {
      const value = typeof input[field] === 'string' ? input[field].trim() : '';
      if (value.length < min || value.length > max || value.includes('\u0000')) {
        return res.status(400).json({ success: false, error: `Please provide a valid ${field} (${min}-${max} characters).` });
      }
      values[field] = value;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    if (typeof input.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId)) {
      return res.status(400).json({ success: false, error: 'Invalid enquiry reference. Please refresh and try again.' });
    }
    const source = input.source ?? 'contact';
    if (!['contact', 'turmeric-fingers', 'turmeric-powder'].includes(source)) {
      return res.status(400).json({ success: false, error: 'Invalid enquiry source.' });
    }
    // Do not acknowledge production enquiries into the non-persistent development engine.
    if (config.nodeEnv === 'production' && db.isInMemory()) {
      return res.status(503).json({ success: false, error: 'Enquiry recording is temporarily unavailable. Please contact us directly on WhatsApp.' });
    }
    const whatsappNumber = config.store.whatsappNumber;
    const record = await enquiries.createOrFind({ id: input.requestId.toLowerCase(), ...values, source, whatsappNumber });
    // A retry uses the same reference; different content must not overwrite an existing enquiry.
    if (record.full_name !== values.fullName || record.email !== values.email || record.subject !== values.subject || record.message !== values.message || record.source !== source) {
      return res.status(409).json({ success: false, error: 'This enquiry reference has already been used. Please submit again.' });
    }
    const text = `Customer enquiry - Chaudhari Farm Products\nReference: ${record.id}\nName: ${values.fullName}\nEmail: ${values.email}\nSubject: ${values.subject}\n\n${values.message}`;
    res.status(201).json({ success: true, enquiryId: record.id, status: 'submitted', whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}` });
  } catch (error) { next(error); }
}

async function list(req, res, next) {
  try { res.json({ success: true, enquiries: await enquiries.listRecent() }); }
  catch (error) { next(error); }
}

module.exports = { create, list };
