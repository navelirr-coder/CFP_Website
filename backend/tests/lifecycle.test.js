// tests/lifecycle.test.js
// Automated test for the core order lifecycle and inventory management

const assert = require('assert');
const request = require('supertest');
const { app } = require('../src/server');
const { runMigrations } = require('../src/database/migrator');
const authService = require('../src/services/authService');
const adminUserRepository = require('../src/repositories/adminUserRepository');
const orderRepository = require('../src/repositories/orderRepository');
const productRepository = require('../src/repositories/productRepository');
const { hashPassword } = require('../src/utils/cryptoUtils');

async function runLifecycleTests() {
  console.log('\n--- Running Core Lifecycle Test Suite ---');
  await runMigrations();

  // 1. Provision Test Admin and Test Customer
  const adminPass = await hashPassword('AdminPass2026!');
  const admin = await adminUserRepository.create({
    email: `manager_${Date.now()}@choudharifarmproducts.com`,
    passwordHash: adminPass,
    fullName: 'Store Operations Manager',
    role: 'order_manager'
  });

  const { token: adminToken } = await authService.loginAdmin({
    email: admin.email,
    password: 'AdminPass2026!'
  });

  const customerReg = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Aarav Sharma',
      email: `aarav_${Date.now()}@example.com`,
      password: 'CustomerPass2026!',
      phone: '9876543210'
    });

  assert.strictEqual(customerReg.status, 201, 'Customer registration should succeed');
  const customerToken = customerReg.body.token;
  const customer = customerReg.body.user;

  // 2. Customer Places Order with Ragi Sticks (c1, price 99) and Jowar Chips (c3, price 99)
  // Subtotal = 198, below free shipping threshold (499) -> shipping fee 50 -> total 248
  // Notice: Even if browser maliciously claims price: 10, total: 10, backend recalculates!
  const initialRagi = await productRepository.findById('c1');
  const initialStock = initialRagi.inventory_quantity;

  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      items: [
        { id: 'c1', quantity: 2, price: 5 }, // Tampered price
        { id: 'c3', quantity: 1, price: 1 }  // Tampered price
      ],
      shippingAddress: {
        recipient_name: 'Aarav Sharma',
        phone: '9876543210',
        address_line1: 'Flat 402, Green View Apartments',
        city: 'Pune',
        state: 'Maharashtra',
        postal_code: '411001'
      },
      paymentMethod: 'cod'
    });

  assert.strictEqual(orderRes.status, 201, 'Order creation should succeed');
  assert.ok(orderRes.body.order.orderNumber.startsWith('CFP-'), 'Order number should follow CFP prefix format');
  assert.strictEqual(Number(orderRes.body.order.subtotal), 297, 'Subtotal must be recalculate to 2*99 + 1*99 = 297');
  assert.strictEqual(Number(orderRes.body.order.shippingFee), 50, 'Shipping fee must be 50 for subtotal < 499');
  assert.strictEqual(Number(orderRes.body.order.totalAmount), 347, 'Total must be 347');
  assert.strictEqual(orderRes.body.order.fulfillmentStatus, 'placed');

  const orderId = orderRes.body.order.id;

  // Verify inventory decrement
  const updatedRagi = await productRepository.findById('c1');
  assert.strictEqual(updatedRagi.inventory_quantity, initialStock - 2, 'Inventory must be decremented by ordered quantity');

  // 3. Order Appears in Admin Orders List
  const adminListRes = await request(app)
    .get('/api/admin/orders')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(adminListRes.status, 200);
  const foundInAdmin = adminListRes.body.orders.find(o => o.id === orderId);
  assert.ok(foundInAdmin, 'Order must appear in admin orders list');
  assert.strictEqual(foundInAdmin.fulfillment_status, 'placed');

  // 4. Admin Confirms Order
  const confirmRes = await request(app)
    .post(`/api/admin/orders/${orderId}/confirm`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ note: 'Stock verified in farm depot.' });

  assert.strictEqual(confirmRes.status, 200, 'Order confirmation should succeed');
  assert.strictEqual(confirmRes.body.order.fulfillment_status, 'confirmed');

  // Duplicate confirm should be rejected
  const dupConfirm = await request(app)
    .post(`/api/admin/orders/${orderId}/confirm`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});
  assert.strictEqual(dupConfirm.status, 400, 'Duplicate confirmation must be rejected');

  // 5. Admin Marks as Packed
  const packRes = await request(app)
    .post(`/api/admin/orders/${orderId}/pack`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ note: 'Packed in eco-friendly pouch.' });

  assert.strictEqual(packRes.status, 200, 'Packing order should succeed');
  assert.strictEqual(packRes.body.order.fulfillment_status, 'packed');

  // 6. Admin Marks as Shipped with Courier and AWB
  const shipRes = await request(app)
    .post(`/api/admin/orders/${orderId}/ship`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      courierName: 'Blue Dart Express',
      awbCode: 'BLUEDART89214300',
      note: 'Handed over at 10:30 AM dispatch.'
    });

  assert.strictEqual(shipRes.status, 200, 'Shipping order should succeed');
  assert.strictEqual(shipRes.body.order.fulfillment_status, 'shipped');

  // 7. Customer Fetches Order Details and Timeline
  const customerOrderRes = await request(app)
    .get(`/api/orders/${orderId}`)
    .set('Authorization', `Bearer ${customerToken}`);

  assert.strictEqual(customerOrderRes.status, 200);
  assert.strictEqual(customerOrderRes.body.order.fulfillment_status, 'shipped');
  assert.strictEqual(customerOrderRes.body.timeline.length, 4, 'Timeline should have placed, confirmed, packed, shipped');
  assert.strictEqual(customerOrderRes.body.shipments[0].courierName, 'Blue Dart Express');
  assert.strictEqual(customerOrderRes.body.shipments[0].awbCode, 'BLUEDART89214300');

  // 8. Public / Guest Tracking with Tracking Token
  const guestTrackRes = await request(app)
    .get(`/api/orders/track?token=${orderRes.body.order.guestTrackingToken}`);

  assert.strictEqual(guestTrackRes.status, 200);
  assert.strictEqual(guestTrackRes.body.order.fulfillmentStatus, 'shipped');
  assert.strictEqual(guestTrackRes.body.order.deliveryDestination.city, 'Pune');
  // Privacy check: Full address line is NOT exposed
  assert.strictEqual(guestTrackRes.body.order.deliveryDestination.address_line1, undefined);

  console.log('Passed: Core order lifecycle from checkout to dispatch verified successfully.');
}

module.exports = { runLifecycleTests };
