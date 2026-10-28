// src/repositories/notificationRepository.js
// Persistent transactional notification outbox queries

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function queue({
  orderId = null,
  customerReference,
  channel = 'email',
  notificationType,
  recipient,
  templateName,
  payload
}, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const id = generateUUID();

  const result = await queryRunner(
    `INSERT INTO notifications (
       id, order_id, customer_reference, channel, notification_type,
       recipient, template_name, payload, status, attempt_count, max_retries,
       created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued', 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      id,
      orderId,
      customerReference,
      channel,
      notificationType,
      recipient,
      templateName,
      JSON.stringify(payload)
    ]
  );
  return result.rows[0];
}

async function findPending(limit = 20) {
  const result = await db.query(
    `SELECT * FROM notifications
     WHERE status = 'queued' OR (status = 'failed' AND attempt_count < max_retries)
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function markSent(id, providerMessageId = null) {
  const result = await db.query(
    `UPDATE notifications
     SET status = 'sent',
         sent_at = CURRENT_TIMESTAMP,
         provider_message_id = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, providerMessageId]
  );
  return result.rows[0] || null;
}

async function markFailed(id, errorMessage) {
  const result = await db.query(
    `UPDATE notifications
     SET status = 'failed',
         attempt_count = attempt_count + 1,
         last_error = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, errorMessage ? errorMessage.slice(0, 500) : 'Unknown notification delivery error']
  );
  return result.rows[0] || null;
}

async function listByOrderId(orderId) {
  const result = await db.query(
    `SELECT id, order_id, customer_reference, channel, notification_type,
            recipient, template_name, status, attempt_count, last_error,
            created_at, sent_at
     FROM notifications
     WHERE order_id = $1
     ORDER BY created_at DESC`,
    [orderId]
  );
  return result.rows;
}

async function retry(id) {
  const result = await db.query(
    `UPDATE notifications
     SET status = 'queued',
         last_error = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  queue,
  findPending,
  markSent,
  markFailed,
  listByOrderId,
  retry
};
