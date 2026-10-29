const assert = require('node:assert/strict');
const request = require('supertest');
const http = require('node:http');
const { once } = require('node:events');
const { app } = require('../src/server');
const { createFrontendApp } = require('../../tools/frontend-server.cjs');

async function runServerLayoutTests() {
  console.log('\n--- Running Independent Frontend/Backend Tests ---');
  const root = await request(app).get('/');
  assert.equal(root.status, 200);
  assert.equal(root.body.service, 'CFP Backend API');
  assert.match(root.headers['content-type'], /application\/json/);
  for (const route of ['/index.html', '/admin.html', '/shop.html', '/contact.html', '/style.css', '/script.js', '/enquiry-form.js', '/assets/documents/gst-registration.pdf', '/src/server.js', '/backend/.env', '/package.json', '/context.md']) {
    assert.equal((await request(app).get(route)).status, 404, `${route} must not be served by the backend`);
  }
  assert.equal((await request(app).get('/api/health')).body.status, 'healthy');
  assert.equal((await request(app).get('/api/products')).status, 200);
  const backendServer = app.listen(0, '127.0.0.1');
  await once(backendServer, 'listening');
  const frontend = createFrontendApp(`http://127.0.0.1:${backendServer.address().port}`);
  try {
    for (const route of ['/', '/admin.html', '/shop.html', '/contact.html', '/catalogues.html', '/style.css', '/order-history.js', '/enquiry-form.js', '/assets/documents/gst-registration.pdf']) {
      assert.equal((await request(frontend).get(route)).status, 200, `${route} remains available in the optional preview`);
    }
    assert.equal((await request(frontend).get('/backend/src/server.js')).status, 404);
    assert.equal((await request(frontend).get('/api/health')).body.status, 'healthy');
    const customer = request.agent(frontend);
    const credentials = { fullName: 'Preview QA', email: `preview_${Date.now()}@example.com`, password: 'Preview-QA-2026!' };
    const registered = await customer.post('/api/auth/register').send(credentials);
    assert.equal(registered.status, 201, 'Preview forwards API body and response');
    assert.ok(registered.headers['set-cookie'].some(cookie => cookie.includes('HttpOnly')));
    assert.equal((await customer.get('/api/auth/me')).status, 200, 'Preview forwards session cookies');
  } finally {
    await new Promise(resolve => backendServer.close(resolve));
  }
  const closed = http.createServer(); closed.listen(0, '127.0.0.1'); await once(closed, 'listening');
  const unusedPort = closed.address().port; await new Promise(resolve => closed.close(resolve));
  const offlinePreview = createFrontendApp(`http://127.0.0.1:${unusedPort}`);
  assert.equal((await request(offlinePreview).get('/contact.html')).status, 200, 'Frontend works with backend off');
  assert.equal((await request(offlinePreview).get('/api/health')).status, 502, 'Preview does not silently start backend');
  console.log('Passed: API-only backend, independent frontend, login proxy/cookies and frontend operation with backend off.');
}
module.exports = { runServerLayoutTests };
