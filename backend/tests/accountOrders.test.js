const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app } = require('../src/server');
const orderService = require('../src/services/orderService');
const userRepository = require('../src/repositories/userRepository');

async function runAccountOrdersTests() {
  console.log('\n--- Running Account Credentials and Server Order History Tests ---');
  const customer = request.agent(app);
  const email = `history_${Date.now()}@example.com`;
  const password = 'Local-History-QA-2026!';
  const registered = await customer.post('/api/auth/register').send({ fullName: 'History QA', email, password });
  assert.equal(registered.status, 201);
  assert.ok(registered.headers['set-cookie'].some(cookie => cookie.includes('HttpOnly')));
  assert.ok(!JSON.stringify(registered.body).includes('password_hash'));
  const stored = await userRepository.findByEmail(email);
  assert.notEqual(stored.password_hash, password);
  assert.equal(await bcrypt.compare(password, stored.password_hash), true);
  const empty = await customer.get('/api/orders');
  assert.deepEqual(empty.body.orders, [], 'New customers have no invented/sample history');

  const other = await request(app).post('/api/auth/register').send({ fullName: 'Other QA', email: `other_${email}`, password });
  assert.equal(other.status, 201);
  const address = { recipient_name: 'History QA', phone: '9876543210', address_line1: 'Local QA Address', city: 'Pune', state: 'Maharashtra', postal_code: '411001' };
  const ownOrder = await orderService.createOrder({ userId: stored.id, items: [{ id: 'c1', quantity: 2 }], shippingAddress: address, paymentMethod: 'cod' });
  const otherOrder = await orderService.createOrder({ userId: other.body.user.id, items: [{ id: 'c2', quantity: 1 }], shippingAddress: address, paymentMethod: 'cod' });
  const history = await customer.get(`/api/orders?userId=${other.body.user.id}`);
  assert.equal(history.status, 200);
  assert.equal(history.headers['cache-control'], 'no-store');
  assert.equal(history.body.orders.length, 1);
  const order = history.body.orders[0];
  assert.equal(order.id, ownOrder.id);
  assert.notEqual(order.id, otherOrder.id);
  assert.deepEqual(Object.keys(order).sort(), ['id', 'items', 'order_number']);
  assert.deepEqual(order.items, [{ product_id: 'c1', product_name: 'Ragi Sticks', quantity: 2 }]);
  assert.ok(!JSON.stringify(history.body).includes('shipping_address_snapshot'));
  assert.equal((await request(app).get('/api/orders')).status, 401);
  assert.equal((await customer.get(`/api/orders/${otherOrder.id}`)).status, 403);
  await customer.post('/api/auth/logout');
  assert.equal((await customer.get('/api/orders')).status, 401);
  const wrong = await customer.post('/api/auth/login').send({ email, password: 'incorrect' });
  assert.equal(wrong.status, 401);
  const login = await customer.post('/api/auth/login').send({ email, password });
  assert.equal(login.status, 200);
  assert.equal((await customer.get('/api/orders')).body.orders[0].id, ownOrder.id);
  console.log('Passed: hashed credentials, authenticated database history, item-only responses, ownership isolation and no-store headers.');
}
module.exports = { runAccountOrdersTests };
