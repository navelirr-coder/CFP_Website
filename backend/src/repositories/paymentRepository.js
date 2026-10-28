// src/repositories/paymentRepository.js
// Payment transaction records and verification status persistence

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function create({
  orderId,
  provider,
  providerOrderId = null,
  providerPaymentId = null,
  providerSignature = null,
  amount,
  currency = 'INR',
  status = 'pending',
  paymentAttemptRef = null,
  idempotencyKey = null,
  providerMetadata = null
}, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const id = generateUUID();

  const result = await queryRunner(
    `INSERT INTO payments (
       id, order_id, provider, provider_order_id, provider_payment_id,
       provider_signature, amount, currency, status, payment_attempt_ref,
       idempotency_key, provider_metadata, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      id,
      orderId,
      provider,
      providerOrderId,
      providerPaymentId,
      providerSignature,
      amount,
      currency,
      status,
      paymentAttemptRef,
      idempotencyKey,
      providerMetadata ? JSON.stringify(providerMetadata) : null
    ]
  );
  return result.rows[0];
}

async function findByOrderId(orderId, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC`,
    [orderId]
  );
  return result.rows;
}

async function findByProviderOrderId(providerOrderId) {
  const result = await db.query(
    `SELECT * FROM payments WHERE provider_order_id = $1 LIMIT 1`,
    [providerOrderId]
  );
  return result.rows[0] || null;
}

async function findByProviderPaymentId(providerPaymentId) {
  const result = await db.query(
    `SELECT * FROM payments WHERE provider_payment_id = $1 LIMIT 1`,
    [providerPaymentId]
  );
  return result.rows[0] || null;
}

async function updateStatus(id, {
  status,
  providerPaymentId = null,
  providerSignature = null,
  verifiedAt = null,
  providerMetadata = null
}, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `UPDATE payments
     SET status = $2,
         provider_payment_id = COALESCE($3, provider_payment_id),
         provider_signature = COALESCE($4, provider_signature),
         verified_at = COALESCE($5, verified_at),
         provider_metadata = COALESCE($6, provider_metadata),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      id,
      status,
      providerPaymentId,
      providerSignature,
      verifiedAt,
      providerMetadata ? JSON.stringify(providerMetadata) : null
    ]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  findByOrderId,
  findByProviderOrderId,
  findByProviderPaymentId,
  updateStatus
};
