// src/repositories/orderStatusHistoryRepository.js
// Immutable audit trail for all order status transitions

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function create({
  orderId,
  previousStatus,
  newStatus,
  actorType,
  actorId = null,
  reason = null,
  customerMessage = null,
  source
}, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const id = generateUUID();

  const result = await queryRunner(
    `INSERT INTO order_status_history (
       id, order_id, previous_status, new_status, actor_type,
       actor_id, reason, customer_message, source, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      id,
      orderId,
      previousStatus || null,
      newStatus,
      actorType,
      actorId,
      reason,
      customerMessage,
      source
    ]
  );
  return result.rows[0];
}

async function findByOrderId(orderId, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `SELECT id, order_id, previous_status, new_status, actor_type,
            actor_id, reason, customer_message, source, created_at
     FROM order_status_history
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId]
  );
  return result.rows;
}

module.exports = {
  create,
  findByOrderId
};
