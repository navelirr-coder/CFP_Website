// tests/webhooks.test.js
// Automated verification of Razorpay and Shiprocket webhook handlers

const assert = require('assert');
const request = require('supertest');
const { app } = require('../src/server');
const { runMigrations } = require('../src/database/migrator');
const paymentService = require('../src/services/paymentService');
const orderService = require('../src/services/orderService');
const orderRepository = require('../src/repositories/orderRepository');
const paymentRepository = require('../src/repositories/paymentRepository');
const shipmentRepository = require('../src/repositories/shipmentRepository');
const config = require('../src/config');

async function runWebhookTests() {
  console.log('\n--- Running Webhook Integration Tests ---');
  await runMigrations();

  // 1. Create a test order and associate a payment record
  const testOrder = await orderService.createOrder({
    items: [{ id: 'c1', quantity: 1 }],
    shippingAddress: {
      recipient_name: 'Webhook Tester',
      phone: '9876543210',
      address_line1: 'Station Road',
      city: 'Pune',
      state: 'Maharashtra',
      postal_code: '411001'
    }
  });

  const providerOrderId = `order_test_${Date.now()}`;
  await paymentRepository.create({
    orderId: testOrder.id,
    provider: 'razorpay',
    providerOrderId,
    amount: testOrder.total_amount,
    currency: 'INR',
    status: 'pending'
  });

  // 2. Test Invalid Webhook Signature Rejection
  const invalidPayload = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { order_id: providerOrderId, id: 'pay_12345' } } }
  });

  const badSigRes = await request(app)
    .post('/api/webhooks/razorpay')
    .set('x-razorpay-signature', 'invalid_signature_hash_123')
    .set('Content-Type', 'application/json')
    .send(invalidPayload);

  assert.strictEqual(badSigRes.status, 400, 'Invalid webhook signature must be rejected');

  // 3. Test Valid Razorpay Webhook Signature and Capture
  const validPayload = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { order_id: providerOrderId, id: 'pay_verified_99' } } }
  });

  const validSig = paymentService.generateTestWebhookSignature(validPayload);

  const goodSigRes = await request(app)
    .post('/api/webhooks/razorpay')
    .set('x-razorpay-signature', validSig)
    .set('Content-Type', 'application/json')
    .send(validPayload);

  assert.strictEqual(goodSigRes.status, 200, 'Valid webhook signature must return 200 OK');

  // Verify database update
  const updatedOrder = await orderRepository.findById(testOrder.id);
  assert.strictEqual(updatedOrder.payment_status, 'paid', 'Order payment status must be updated to paid');

  // 4. Test Shiprocket Webhook Tracking Update
  const awbCode = `AWBTEST${Date.now()}`;
  await shipmentRepository.create({
    orderId: testOrder.id,
    provider: 'shiprocket',
    shipmentId: 'sr_test_88',
    courierName: 'Delhivery',
    awbCode,
    status: 'manifested'
  });

  // Advance order to packed then shipped so it can receive courier updates
  await orderRepository.updateFulfillmentStatus(testOrder.id, 'confirmed');
  await orderRepository.updateFulfillmentStatus(testOrder.id, 'packed');
  await orderRepository.updateFulfillmentStatus(testOrder.id, 'shipped');

  const shiprocketPayload = {
    awb: awbCode,
    current_status: 'OUT FOR DELIVERY',
    courier_name: 'Delhivery',
    scans: [{ activity: 'Dispatched for morning delivery run' }]
  };

  const shiprocketRes = await request(app)
    .post('/api/webhooks/shiprocket')
    .set('x-api-key', config.shiprocket.webhookSecret)
    .send(shiprocketPayload);

  assert.strictEqual(shiprocketRes.status, 200, 'Verified Shiprocket webhook must return 200');

  const trackedOrder = await orderRepository.findById(testOrder.id);
  assert.strictEqual(trackedOrder.fulfillment_status, 'out_for_delivery', 'Order status must advance to out_for_delivery');

  console.log('Passed: Razorpay signature verification and Shiprocket status updates verified.');
}

module.exports = { runWebhookTests };
