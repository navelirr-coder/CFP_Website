const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../src/server');
const db = require('../src/database');
const { runMigrations } = require('../src/database/migrator');
async function runEnquiryTests() {
  console.log('\n--- Running Frontend-Only Enquiry Boundary Tests ---');
  await runMigrations();
  const before = Number((await db.query('SELECT COUNT(*) AS count FROM customer_enquiries')).rows[0].count);
  assert.equal((await request(app).post('/api/enquiries').send({ fullName: 'QA', message: 'Test' })).status, 404);
  assert.equal((await request(app).get('/api/admin/enquiries')).status, 404);
  const after = Number((await db.query('SELECT COUNT(*) AS count FROM customer_enquiries')).rows[0].count);
  assert.equal(after, before, 'Retired enquiry API must not write database records');
  console.log('Passed: enquiry APIs are not mounted; existing database records are preserved.');
}
module.exports = { runEnquiryTests };
