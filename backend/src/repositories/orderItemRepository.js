// src/repositories/orderItemRepository.js
// Order items database persistence and snapshots

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function createMany(orderId, items, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const created = [];

  for (const item of items) {
    const id = generateUUID();
    const result = await queryRunner(
      `INSERT INTO order_items (
         id, order_id, product_id, product_name, sku, unit_price, quantity, line_total, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        id,
        orderId,
        item.productId,
        item.productName,
        item.sku || null,
        item.unitPrice,
        item.quantity,
        item.lineTotal
      ]
    );
    created.push(result.rows[0]);
  }

  return created;
}

async function findByOrderId(orderId, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `SELECT id, order_id, product_id, product_name, sku, unit_price, quantity, line_total, created_at
     FROM order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId]
  );
  return result.rows;
}

module.exports = {
  createMany,
  findByOrderId
};
