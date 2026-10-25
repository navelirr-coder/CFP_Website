// src/repositories/adminAuditRepository.js
// Immutable audit logging for all administrative store actions

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function logAction({
  adminId = null,
  adminEmail,
  action,
  entityType,
  entityId,
  previousState = null,
  newState = null,
  ipAddress = null
}, client = null) {
  const queryRunner = client ? client.query.bind(client) : db.query;
  const id = generateUUID();

  const result = await queryRunner(
    `INSERT INTO admin_audit_logs (
       id, admin_id, admin_email, action, entity_type, entity_id,
       previous_state, new_state, ip_address, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      id,
      adminId,
      adminEmail,
      action,
      entityType,
      entityId,
      previousState ? JSON.stringify(previousState) : null,
      newState ? JSON.stringify(newState) : null,
      ipAddress
    ]
  );
  return result.rows[0];
}

async function listByEntity(entityType, entityId) {
  const result = await db.query(
    `SELECT id, admin_id, admin_email, action, entity_type, entity_id,
            previous_state, new_state, ip_address, created_at
     FROM admin_audit_logs
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return result.rows;
}

async function listRecent(limit = 50) {
  const result = await db.query(
    `SELECT id, admin_id, admin_email, action, entity_type, entity_id,
            previous_state, new_state, ip_address, created_at
     FROM admin_audit_logs
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = {
  logAction,
  listByEntity,
  listRecent
};
