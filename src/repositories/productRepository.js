// src/repositories/productRepository.js
// Product catalogue and authoritative inventory management

const db = require('../database');

async function findAllActive() {
  const result = await db.query(
    `SELECT id, name, sku, category, price, active, inventory_quantity, image_url
     FROM products
     WHERE active = TRUE
     ORDER BY category, name`
  );
  return result.rows;
}

async function findById(id, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `SELECT id, name, sku, category, price, active, inventory_quantity, image_url
     FROM products
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function findByIds(ids, client = null) {
  if (!ids || ids.length === 0) return [];
  const queryRunner = client ? client.query.bind(client) : db.query;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const result = await queryRunner(
    `SELECT id, name, sku, category, price, active, inventory_quantity, image_url
     FROM products
     WHERE id IN (${placeholders})`,
    ids
  );
  return result.rows;
}

async function decrementInventory(id, quantity, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `UPDATE products
     SET inventory_quantity = inventory_quantity - $2::int,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND inventory_quantity >= $2::int
     RETURNING id, name, inventory_quantity`,
    [id, parseInt(quantity, 10)]
  );
  if (result.rowCount === 0) {
    throw new Error(`Insufficient stock for product ID: ${id}`);
  }
  return result.rows[0];
}

async function restoreInventory(id, quantity, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `UPDATE products
     SET inventory_quantity = inventory_quantity + $2::int,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, inventory_quantity`,
    [id, parseInt(quantity, 10)]
  );
  return result.rows[0];
}

module.exports = {
  findAllActive,
  findById,
  findByIds,
  decrementInventory,
  restoreInventory
};
