const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../src/server');

async function runServerLayoutTests() {
  console.log('\n--- Running Frontend/Backend Layout Tests ---');
  for (const route of ['/', '/admin.html', '/shop.html', '/contact.html', '/catalogues.html', '/style.css', '/script.js', '/enquiry-form.js', '/product-information-data.js', '/assets/documents/gst-registration.pdf']) {
    const response = await request(app).get(route);
    assert.equal(response.status, 200, `${route} must remain available`);
  }
  for (const route of ['/src/server.js', '/backend/src/server.js', '/backend/.env', '/.env', '/package.json', '/migrations/003_customer_enquiries.sql', '/docs/ENQUIRY-DEPLOYMENT.md', '/context.md']) {
    const response = await request(app).get(route);
    assert.equal(response.status, 404, `${route} must not be publicly served`);
  }
  assert.equal((await request(app).get('/api/health')).body.status, 'healthy');
  assert.equal((await request(app).get('/api/products')).status, 200);
  console.log('Passed: frontend URLs and APIs work; backend source, configuration and documentation are not served.');
}

module.exports = { runServerLayoutTests };
