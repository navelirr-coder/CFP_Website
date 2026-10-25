// src/repositories/shipmentRepository.js
// Shipment records and logistics tracking database queries

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function create({
  orderId,
  provider,
  shipmentId = null,
  courierName = null,
  awbCode = null,
  trackingUrl = null,
  status = 'manifested',
  dispatchDate = null,
  safeMetadata = null
}, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const id = generateUUID();

  const result = await queryRunner(
    `INSERT INTO shipments (
       id, order_id, provider, shipment_id, courier_name, awb_code,
       tracking_url, status, dispatch_date, safe_metadata, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      id,
      orderId,
      provider,
      shipmentId,
      courierName,
      awbCode,
      trackingUrl,
      status,
      dispatchDate,
      safeMetadata ? JSON.stringify(safeMetadata) : null
    ]
  );
  return result.rows[0];
}

async function findByOrderId(orderId, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC`,
    [orderId]
  );
  return result.rows;
}

async function findByAwbCode(awbCode) {
  const result = await db.query(
    `SELECT * FROM shipments WHERE awb_code = $1 LIMIT 1`,
    [awbCode]
  );
  return result.rows[0] || null;
}

async function updateStatus(id, {
  status,
  courierName = null,
  awbCode = null,
  trackingUrl = null,
  lastTrackingUpdate = null,
  deliveryDate = null,
  safeMetadata = null
}, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `UPDATE shipments
     SET status = $2,
         courier_name = COALESCE($3, courier_name),
         awb_code = COALESCE($4, awb_code),
         tracking_url = COALESCE($5, tracking_url),
         last_tracking_update = COALESCE($6, CURRENT_TIMESTAMP),
         delivery_date = COALESCE($7, delivery_date),
         safe_metadata = COALESCE($8, safe_metadata),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      id,
      status,
      courierName,
      awbCode,
      trackingUrl,
      lastTrackingUpdate,
      deliveryDate,
      safeMetadata ? JSON.stringify(safeMetadata) : null
    ]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  findByOrderId,
  findByAwbCode,
  updateStatus
};
