// tests/security.test.js
// Automated security testing: role-based access control and tenant isolation

const assert = require('assert');
const request = require('supertest');
const { app } = require('../src/server');
const { runMigrations } = require('../src/database/migrator');
const authService = require('../src/services/authService');
const adminUserRepository = require('../src/repositories/adminUserRepository');
const orderService = require('../src/services/orderService');
const { hashPassword } = require('../src/utils/cryptoUtils');

async function runSecurityTests() {
  console.log('\n--- Running Security & Authorization Test Suite ---');
  await runMigrations();

  // 1. Unauthenticated request to admin dashboard returns 401
  const unauthRes = await request(app).get('/api/admin/dashboard');
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated admin route access must be blocked');

  // 2. Customer token accessing admin endpoint returns 401
  const customerReg = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Customer Security Tester',
      email: `custsec_${Date.now()}@example.com`,
      password: 'SecurePass2026!'
    });
  const customerToken = customerReg.body.token;

  const forbiddenAdminRes = await request(app)
    .get('/api/admin/dashboard')
    .set('Authorization', `Bearer ${customerToken}`);

  assert.strictEqual(forbiddenAdminRes.status, 401, 'Customer token must not authorize admin routes');

  // 3. Customer A cannot view Customer B's order
  const customerBReg = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Customer B',
      email: `custb_${Date.now()}@example.com`,
      password: 'SecurePass2026!'
    });
  const customerBToken = customerBReg.body.token;
  const customerBId = customerBReg.body.user.id;

  const orderB = await orderService.createOrder({
    userId: customerBId,
    items: [{ id: 'c3', quantity: 1 }],
    shippingAddress: {
      recipient_name: 'Customer B',
      phone: '9876543210',
      address_line1: 'B Residency',
      city: 'Pune',
      state: 'Maharashtra',
      postal_code: '411001'
    }
  });

  const crossTenantAccessRes = await request(app)
    .get(`/api/orders/${orderB.id}`)
    .set('Authorization', `Bearer ${customerToken}`); // Customer A trying to access Customer B's order

  assert.strictEqual(crossTenantAccessRes.status, 403, 'Cross-customer order access must return 403 Forbidden');

  // 4. Maximum 5 addresses limit enforced
  for (let i = 1; i <= 5; i++) {
    const addRes = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        recipient_name: `Address ${i}`,
        phone: '9876543210',
        address_line1: `Lane ${i}, Farm Colony`,
        city: 'Pune',
        state: 'Maharashtra',
        postal_code: '411001'
      });
    assert.strictEqual(addRes.status, 201, `Address ${i} should be created`);
  }

  // 6th address attempt should be rejected
  const sixthAddrRes = await request(app)
    .post('/api/auth/addresses')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      recipient_name: 'Address 6',
      phone: '9876543210',
      address_line1: 'Lane 6, Farm Colony',
      city: 'Pune',
      state: 'Maharashtra',
      postal_code: '411001'
    });

  assert.strictEqual(sixthAddrRes.status, 400, '6th address must be rejected (max 5 limit)');
  assert.ok(sixthAddrRes.body.error.includes('Maximum limit of 5'), 'Must return max limit error message');

  console.log('Passed: Security guards, tenant isolation, and address limits verified.');
}

module.exports = { runSecurityTests };
