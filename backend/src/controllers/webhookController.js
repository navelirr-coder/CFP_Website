// src/controllers/webhookController.js
// Verified webhook handlers for Razorpay and Shiprocket integrations

const paymentService = require('../services/paymentService');
const shippingService = require('../services/shippingService');
const orderService = require('../services/orderService');
const orderRepository = require('../repositories/orderRepository');
const paymentRepository = require('../repositories/paymentRepository');
const shipmentRepository = require('../repositories/shipmentRepository');
const orderStatusHistoryRepository = require('../repositories/orderStatusHistoryRepository');
const notificationRepository = require('../repositories/notificationRepository');
const db = require('../database');

async function handleRazorpayWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[Webhook] Rejected unverified Razorpay webhook signature');
      return res.status(400).json({ success: false, error: 'Invalid webhook signature.' });
    }

    const event = req.body;
    const eventType = event.event;
    console.log(`[Webhook] Processing verified Razorpay event: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const providerOrderId = paymentEntity?.order_id;
      const providerPaymentId = paymentEntity?.id;

      if (providerOrderId) {
        const paymentRecord = await paymentRepository.findByProviderOrderId(providerOrderId);
        if (paymentRecord && paymentRecord.status !== 'captured') {
          await db.transaction(async (client) => {
            await paymentRepository.updateStatus(paymentRecord.id, {
              status: 'captured',
              providerPaymentId,
              verifiedAt: new Date(),
              providerMetadata: { webhookEvent: eventType }
            }, client);

            await orderRepository.updatePaymentStatus(paymentRecord.order_id, 'paid', client);

            await orderStatusHistoryRepository.create({
              orderId: paymentRecord.order_id,
              previousStatus: 'pending',
              newStatus: 'pending',
              actorType: 'payment_webhook',
              actorId: providerPaymentId,
              reason: `Payment captured via webhook: ${eventType}`,
              customerMessage: 'Payment verified and captured.',
              source: 'razorpay_webhook'
            }, client);
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const providerOrderId = paymentEntity?.order_id;

      if (providerOrderId) {
        const paymentRecord = await paymentRepository.findByProviderOrderId(providerOrderId);
        if (paymentRecord) {
          await paymentRepository.updateStatus(paymentRecord.id, {
            status: 'failed',
            providerMetadata: { errorDescription: paymentEntity?.error_description }
          });
          await orderRepository.updatePaymentStatus(paymentRecord.order_id, 'failed');
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
}

async function handleShiprocketWebhook(req, res, next) {
  try {
    const isValid = shippingService.verifyWebhook(req);
    if (!isValid) {
      console.warn('[Webhook] Rejected unverified Shiprocket webhook');
      return res.status(400).json({ success: false, error: 'Invalid shipping webhook token.' });
    }

    const { awb, current_status, courier_name, scans, etd } = req.body;
    console.log(`[Webhook] Processing Shiprocket status for AWB ${awb}: ${current_status}`);

    if (awb) {
      const shipment = await shipmentRepository.findByAwbCode(awb);
      if (shipment) {
        const mappedStatus = shippingService.mapCourierStatus(current_status);
        if (mappedStatus) {
          await orderService.updateCourierTracking(shipment.order_id, mappedStatus, {
            courierStatus: current_status,
            courierNotes: scans && scans.length > 0 ? scans[scans.length - 1].activity : null,
            source: 'shiprocket_webhook'
          });

          await shipmentRepository.updateStatus(shipment.id, {
            status: current_status.toLowerCase().replace(/\s+/g, '_'),
            courierName: courier_name || shipment.courier_name,
            lastTrackingUpdate: new Date(),
            safeMetadata: { scansCount: scans?.length || 0, etd }
          });
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleRazorpayWebhook,
  handleShiprocketWebhook
};
