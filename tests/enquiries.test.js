const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const { app } = require('../src/server');
const db = require('../src/database');
const config = require('../src/config');
const authService = require('../src/services/authService');
const repository = require('../src/repositories/enquiryRepository');
const { runMigrations } = require('../src/database/migrator');

async function runEnquiryTests() {
  console.log('\n--- Running WhatsApp Enquiry Tests ---');
  await runMigrations();
  const input = {
    requestId: randomUUID(), fullName: "QA O'Neil", email: 'enquiry-qa@example.com',
    subject: 'Bulk supply & packing', message: 'Please quote 100 packs.\nDelivery: Pune.', source: 'contact'
  };
  const response = await request(app).post('/api/enquiries').send(input);
  assert.equal(response.status, 201);
  assert.equal(response.body.status, 'submitted');
  const url = new URL(response.body.whatsappUrl);
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/919960725539');
  for (const value of [input.fullName, input.email, input.subject, input.message]) assert.ok(url.searchParams.get('text').includes(value));
  const saved = (await db.query('SELECT * FROM customer_enquiries WHERE id = $1', [input.requestId])).rows[0];
  assert.equal(saved.full_name, input.fullName);
  assert.equal(saved.email, input.email);
  assert.equal(saved.message, input.message);
  assert.equal(saved.whatsapp_number, '919960725539');
  assert.equal(saved.status, 'submitted', 'Saving an enquiry must not claim WhatsApp delivery');

  const retry = await request(app).post('/api/enquiries').send(input);
  assert.equal(retry.status, 201);
  const count = await db.query('SELECT COUNT(*) AS count FROM customer_enquiries WHERE id = $1', [input.requestId]);
  assert.equal(Number(count.rows[0].count), 1, 'Retry must not duplicate a saved enquiry');
  const conflict = await request(app).post('/api/enquiries').send({ ...input, message: 'Changed' });
  assert.equal(conflict.status, 409);
  assert.ok(!JSON.stringify(conflict.body).includes(input.email));

  for (const override of [{ email: 'bad' }, { fullName: ' ' }, { subject: ' ' }, { message: 'x'.repeat(4001) }, { requestId: 'invalid' }, { source: 'untrusted' }]) {
    const bad = await request(app).post('/api/enquiries').send({ ...input, ...override });
    assert.equal(bad.status, 400);
  }
  const turmeric = await request(app).post('/api/enquiries').send({ ...input, requestId: randomUUID(), source: 'turmeric-fingers' });
  assert.equal(turmeric.status, 201);
  assert.equal((await db.query('SELECT source FROM customer_enquiries WHERE id = $1', [turmeric.body.enquiryId])).rows[0].source, 'turmeric-fingers');

  assert.equal((await request(app).get('/api/admin/enquiries')).status, 401);
  assert.equal((await request(app).get('/api/enquiries')).status, 404);
  const customerToken = authService.generateToken({ type: 'customer', userId: 'test' });
  assert.equal((await request(app).get('/api/admin/enquiries').set('Authorization', `Bearer ${customerToken}`)).status, 401);
  const adminToken = authService.generateToken({ type: 'admin', role: 'support', adminId: 'test' });
  const listing = await request(app).get('/api/admin/enquiries').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(listing.status, 200);
  assert.ok(listing.body.enquiries.some(enquiry => enquiry.id === input.requestId));

  if (db.isInMemory()) {
    const original = config.nodeEnv;
    try {
      config.nodeEnv = 'production';
      assert.equal((await request(app).post('/api/enquiries').send({ ...input, requestId: randomUUID() })).status, 503);
    } finally { config.nodeEnv = original; }
  }
  const originalCreate = repository.createOrFind;
  try {
    repository.createOrFind = async () => { throw new Error('Simulated database outage'); };
    assert.equal((await request(app).post('/api/enquiries').send({ ...input, requestId: randomUUID() })).status, 500);
  } finally { repository.createOrFind = originalCreate; }
  console.log('Passed: enquiry persistence, WhatsApp destination/content, retries, validation, protected access, and database failure handling.');
}

module.exports = { runEnquiryTests };
