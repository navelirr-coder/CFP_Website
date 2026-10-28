// tests/stateMachine.test.js
// Automated verification of state machine transitions and inventory policies

const assert = require('assert');
const orderStateMachine = require('../src/services/orderStateMachine');
const orderService = require('../src/services/orderService');
const productRepository = require('../src/repositories/productRepository');
const { runMigrations } = require('../src/database/migrator');

async function runStateMachineTests() {
  console.log('\n--- Running Order State Machine & Business Rules Tests ---');
  await runMigrations();

  // 1. Unit tests for allowed transitions
  assert.strictEqual(orderStateMachine.canTransition('placed', 'confirmed'), true);
  assert.strictEqual(orderStateMachine.canTransition('confirmed', 'packed'), true);
  assert.strictEqual(orderStateMachine.canTransition('packed', 'shipped'), true);
  assert.strictEqual(orderStateMachine.canTransition('shipped', 'out_for_delivery'), true);
  assert.strictEqual(orderStateMachine.canTransition('out_for_delivery', 'delivered'), true);

  // Illegal jumps
  assert.strictEqual(orderStateMachine.canTransition('placed', 'shipped'), false, 'Cannot skip confirmation and packing');
  assert.strictEqual(orderStateMachine.canTransition('placed', 'delivered'), false, 'Cannot jump directly to delivered');
  assert.strictEqual(orderStateMachine.canTransition('delivered', 'placed'), false, 'Delivered is terminal');
  assert.strictEqual(orderStateMachine.canTransition('cancelled', 'confirmed'), false, 'Cancelled is terminal');

  // Duplicate state
  assert.strictEqual(orderStateMachine.canTransition('placed', 'placed'), false, 'Duplicate transition rejected');

  // 2. Exception handling on transition
  assert.throws(() => {
    orderStateMachine.validateTransition('placed', 'delivered');
  }, /Illegal transition/, 'Throws on illegal transition');

  // 3. Out-of-stock rejection test
  const testProduct = await productRepository.findById('c2'); // Bajra Chivda
  const excessiveQty = testProduct.inventory_quantity + 500;

  await assert.rejects(async () => {
    await orderService.createOrder({
      items: [{ id: 'c2', quantity: excessiveQty }],
      shippingAddress: {
        recipient_name: 'Test Customer',
        phone: '9876543210',
        address_line1: 'Farm Road',
        city: 'Nagpur',
        state: 'Maharashtra',
        postal_code: '440001'
      }
    });
  }, /Insufficient stock/, 'Orders exceeding available stock must be rejected');

  // 4. Cancellation Restocks Inventory Test
  const ragiBefore = await productRepository.findById('c1');
  const stockBefore = ragiBefore.inventory_quantity;

  const testOrder = await orderService.createOrder({
    items: [{ id: 'c1', quantity: 3 }],
    shippingAddress: {
      recipient_name: 'Cancellation Tester',
      phone: '9876543210',
      address_line1: 'MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      postal_code: '411001'
    }
  });

  const stockAfterOrder = (await productRepository.findById('c1')).inventory_quantity;
  assert.strictEqual(stockAfterOrder, stockBefore - 3, 'Stock decremented after order');

  // Cancel order
  await orderService.cancelOrder(testOrder.id, {
    actorType: 'admin',
    actorId: null,
    actorEmail: 'admin@choudharifarmproducts.com',
    reason: 'Customer requested cancellation prior to packing.'
  });

  const stockAfterCancel = (await productRepository.findById('c1')).inventory_quantity;
  assert.strictEqual(stockAfterCancel, stockBefore, 'Stock must be fully restored upon order cancellation');

  console.log('Passed: State machine transitions, out of stock checks, and inventory restocking verified.');
}

module.exports = { runStateMachineTests };
