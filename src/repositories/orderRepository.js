// src/repositories/orderRepository.js
// Order persistence, search, filtering, and dashboard operational metrics

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function create({
  orderNumber,
  userId = null,
  guestEmail = null,
  guestPhone = null,
  guestTrackingToken = null,
  currency = 'INR',
  subtotal,
  discountAmount = 0.00,
  shippingFee = 0.00,
  taxAmount = 0.00,
  totalAmount,
  shippingAddressSnapshot,
  paymentStatus = 'pending',
  fulfillmentStatus = 'placed',
  customerNotes = null,
  adminNotes = null,
  idempotencyKey = null
}, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const id = generateUUID();

  const result = await queryRunner(
    `INSERT INTO orders (
       id, order_number, user_id, guest_email, guest_phone, guest_tracking_token,
       currency, subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
       shipping_address_snapshot, payment_status, fulfillment_status,
       customer_notes, admin_notes, idempotency_key, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     ) RETURNING *`,
    [
      id,
      orderNumber,
      userId,
      guestEmail ? guestEmail.toLowerCase().trim() : null,
      guestPhone ? guestPhone.trim() : null,
      guestTrackingToken,
      currency,
      subtotal,
      discountAmount,
      shippingFee,
      taxAmount,
      totalAmount,
      typeof shippingAddressSnapshot === 'string' ? shippingAddressSnapshot : JSON.stringify(shippingAddressSnapshot),
      paymentStatus,
      fulfillmentStatus,
      customerNotes,
      adminNotes,
      idempotencyKey
    ]
  );
  return result.rows[0];
}

async function findById(id, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `SELECT o.*, u.full_name AS customer_full_name, u.email AS customer_email
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function findByOrderNumber(orderNumber, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `SELECT o.*, u.full_name AS customer_full_name, u.email AS customer_email
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE UPPER(o.order_number) = UPPER($1)`,
    [orderNumber.trim()]
  );
  return result.rows[0] || null;
}

async function findByIdempotencyKey(key, client = null) {
  if (!key) return null;
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `SELECT * FROM orders WHERE idempotency_key = $1`,
    [key.trim()]
  );
  return result.rows[0] || null;
}

async function findByTrackingToken(token) {
  if (!token) return null;
  const result = await db.query(
    `SELECT o.id, o.order_number, o.currency, o.subtotal, o.shipping_fee,
            o.total_amount, o.payment_status, o.fulfillment_status,
            o.created_at, o.updated_at,
            o.shipping_address_snapshot
     FROM orders o
     WHERE o.guest_tracking_token = $1`,
    [token.trim()]
  );
  return result.rows[0] || null;
}

async function listByUserId(userId) {
  const result = await db.query(
    `SELECT id, order_number, currency, total_amount, payment_status,
            fulfillment_status, created_at, updated_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function updateFulfillmentStatus(id, newStatus, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `UPDATE orders
     SET fulfillment_status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, newStatus]
  );
  return result.rows[0] || null;
}

async function updatePaymentStatus(id, newStatus, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `UPDATE orders
     SET payment_status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, newStatus]
  );
  return result.rows[0] || null;
}

async function updateAdminNotes(id, adminNotes) {
  const result = await db.query(
    `UPDATE orders
     SET admin_notes = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, adminNotes]
  );
  return result.rows[0] || null;
}

async function cancelOrder(id, reason, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const result = await queryRunner(
    `UPDATE orders
     SET fulfillment_status = 'cancelled',
         cancellation_reason = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, reason]
  );
  return result.rows[0] || null;
}

async function listForAdmin({
  search = '',
  fulfillmentStatus = '',
  paymentStatus = '',
  startDate = '',
  endDate = '',
  page = 1,
  limit = 20
}) {
  const offset = (Math.max(1, page) - 1) * limit;
  const params = [];
  const whereClauses = [];

  if (search && search.trim() !== '') {
    params.push(`%${search.trim().toLowerCase()}%`);
    const pIdx = params.length;
    whereClauses.push(`(
      LOWER(o.order_number) LIKE $${pIdx} OR
      LOWER(COALESCE(u.full_name, '')) LIKE $${pIdx} OR
      LOWER(COALESCE(u.email, '')) LIKE $${pIdx} OR
      LOWER(COALESCE(o.guest_email, '')) LIKE $${pIdx} OR
      LOWER(COALESCE(o.guest_phone, '')) LIKE $${pIdx}
    )`);
  }

  if (fulfillmentStatus && fulfillmentStatus.trim() !== '') {
    params.push(fulfillmentStatus.trim());
    whereClauses.push(`o.fulfillment_status = $${params.length}`);
  }

  if (paymentStatus && paymentStatus.trim() !== '') {
    params.push(paymentStatus.trim());
    whereClauses.push(`o.payment_status = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    whereClauses.push(`o.created_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    whereClauses.push(`o.created_at <= $${params.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ${whereSql}
  `;
  const countResult = await db.query(countQuery, params);
  const total = countResult.rows[0]?.total || 0;

  const dataParams = [...params, limit, offset];
  const dataQuery = `
    SELECT o.id, o.order_number, o.user_id, o.guest_email, o.guest_phone,
           o.currency, o.subtotal, o.shipping_fee, o.total_amount,
           o.payment_status, o.fulfillment_status, o.created_at, o.updated_at,
           COALESCE(u.full_name, 'Guest Customer') AS customer_name,
           COALESCE(u.email, o.guest_email) AS customer_email
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ${whereSql}
    ORDER BY o.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const dataResult = await db.query(dataQuery, dataParams);

  return {
    orders: dataResult.rows,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(total / limit)
  };
}

async function getDashboardMetrics() {
  const result = await db.query(`
    SELECT
      COUNT(CASE WHEN fulfillment_status = 'placed' THEN 1 END)::int AS awaiting_review,
      COUNT(CASE WHEN fulfillment_status = 'confirmed' THEN 1 END)::int AS awaiting_packing,
      COUNT(CASE WHEN fulfillment_status = 'packed' THEN 1 END)::int AS awaiting_dispatch,
      COUNT(CASE WHEN fulfillment_status = 'shipped' THEN 1 END)::int AS shipped,
      COUNT(CASE WHEN fulfillment_status = 'out_for_delivery' THEN 1 END)::int AS out_for_delivery,
      COUNT(CASE WHEN fulfillment_status = 'delivered' THEN 1 END)::int AS delivered,
      COUNT(CASE WHEN fulfillment_status = 'cancelled' OR payment_status = 'failed' THEN 1 END)::int AS cancelled_or_failed,
      COUNT(CASE WHEN fulfillment_status = 'delivery_exception' THEN 1 END)::int AS delivery_exceptions,
      COUNT(*)::int AS total_orders,
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0)::numeric(10,2) AS total_revenue
    FROM orders
  `);

  const notificationExceptions = await db.query(`
    SELECT COUNT(*)::int AS failed_notifications
    FROM notifications
    WHERE status = 'failed'
  `);

  return {
    ...result.rows[0],
    failed_notifications: notificationExceptions.rows[0]?.failed_notifications || 0
  };
}

module.exports = {
  create,
  findById,
  findByOrderNumber,
  findByIdempotencyKey,
  findByTrackingToken,
  listByUserId,
  updateFulfillmentStatus,
  updatePaymentStatus,
  updateAdminNotes,
  cancelOrder,
  listForAdmin,
  getDashboardMetrics
};
