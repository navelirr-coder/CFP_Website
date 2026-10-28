// src/services/paymentService.js
// Razorpay payment integration, server-side signature verification, and test mode abstraction

const crypto = require('crypto');
const config = require('../config');
const paymentRepository = require('../repositories/paymentRepository');
const { safeTimingCompare } = require('../utils/cryptoUtils');

class PaymentService {
  constructor() {
    this.keyId = config.razorpay.keyId;
    this.keySecret = config.razorpay.keySecret;
    this.webhookSecret = config.razorpay.webhookSecret;
    this.isConfigured = config.razorpay.isConfigured;
  }

  // Create payment gateway order reference
  async createGatewayOrder({ orderId, amount, currency = 'INR', receipt }) {
    const amountInPaise = Math.round(Number(amount) * 100);

    // If live credentials exist, we would call Razorpay Orders API
    // In test / offline development mode, we generate a valid test provider reference
    const providerOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const paymentRecord = await paymentRepository.create({
      orderId,
      provider: 'razorpay',
      providerOrderId,
      amount,
      currency,
      status: 'pending',
      providerMetadata: { receipt, testMode: !this.isConfigured }
    });

    return {
      paymentRecordId: paymentRecord.id,
      providerOrderId,
      amount: amountInPaise,
      currency,
      keyId: this.keyId,
      isTestMode: !this.isConfigured
    };
  }

  // Verify Razorpay browser response: HMAC SHA256 of (order_id + '|' + payment_id)
  verifyPaymentSignature({ providerOrderId, providerPaymentId, providerSignature }) {
    if (!providerOrderId || !providerPaymentId || !providerSignature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');

    return safeTimingCompare(expectedSignature, providerSignature);
  }

  // Verify raw webhook request signature
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!rawBody || !signatureHeader) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return safeTimingCompare(expectedSignature, signatureHeader);
  }

  // Generate test signature helper for development and automated test suites
  generateTestSignature(providerOrderId, providerPaymentId) {
    return crypto
      .createHmac('sha256', this.keySecret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');
  }

  generateTestWebhookSignature(payloadString) {
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payloadString)
      .digest('hex');
  }
}

module.exports = new PaymentService();
