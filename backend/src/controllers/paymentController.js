// src/controllers/paymentController.js
// Razorpay payment order initialization and signature verification

const paymentService = require('../services/paymentService');
const orderRepository = require('../repositories/orderRepository');
const paymentRepository = require('../repositories/paymentRepository');
const orderStatusHistoryRepository = require('../repositories/orderStatusHistoryRepository');
const notificationRepository = require('../repositories/notificationRepository');
const sseService = require('../services/sseService');
const db = require('../database');
const config = require('../config');

async function createRazorpayOrder(req, res, next) {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required.' });
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, error: 'Order is already marked as paid.' });
    }

    const gatewayOrder = await paymentService.createGatewayOrder({
      orderId: order.id,
      amount: order.total_amount,
      currency: order.currency || 'INR',
      receipt: order.order_number
    });

    return res.json({
      success: true,
      ...gatewayOrder
    });
  } catch (err) {
    next(err);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const { orderId, providerOrderId, providerPaymentId, providerSignature } = req.body;

    if (!orderId || !providerOrderId || !providerPaymentId || !providerSignature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters.'
      });
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const isValid = paymentService.verifyPaymentSignature({
      providerOrderId,
      providerPaymentId,
      providerSignature
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature. Verification failed on server.'
      });
    }

    // Atomically record verified payment and update order status
    await db.transaction(async (client) => {
      // Find or update payment record
      const paymentRecords = await paymentRepository.findByOrderId(orderId, client);
      const targetRecord = paymentRecords.find(p => p.provider_order_id === providerOrderId) || paymentRecords[0];

      if (targetRecord) {
        await paymentRepository.updateStatus(targetRecord.id, {
          status: 'captured',
          providerPaymentId,
          providerSignature,
          verifiedAt: new Date(),
          providerMetadata: { verifiedVia: 'checkout_signature' }
        }, client);
      }

      await orderRepository.updatePaymentStatus(orderId, 'paid', client);

      await orderStatusHistoryRepository.create({
        orderId,
        previousStatus: order.fulfillment_status,
        newStatus: order.fulfillment_status,
        actorType: 'payment_gateway',
        actorId: providerPaymentId,
        reason: 'Payment verified and captured via Razorpay.',
        customerMessage: 'Payment received successfully.',
        source: 'razorpay_verification'
      }, client);

      // Queue payment confirmation notification
      const recipient = order.customer_email || order.guest_email;
      if (recipient) {
        await notificationRepository.queue({
          orderId,
          customerReference: recipient,
          channel: 'email',
          notificationType: 'payment_confirmed',
          recipient,
          templateName: 'payment_confirmed',
          payload: {
            customerName: order.customer_full_name || 'Customer',
            orderNumber: order.order_number,
            totalAmount: order.total_amount
          }
        }, client);
      }
    });

    sseService.publishStatusUpdate(orderId, {
      status: order.fulfillment_status,
      orderNumber: order.order_number,
      customerMessage: 'Payment verified successfully.'
    });

    return res.json({
      success: true,
      message: 'Payment verified and recorded successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRazorpayOrder,
  verifyPayment
};
