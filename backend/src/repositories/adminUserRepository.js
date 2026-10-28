// src/repositories/adminUserRepository.js
// Admin user management and role-based credential queries

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function findByEmail(email) {
  if (!email) return null;
  const result = await db.query(
    `SELECT * FROM admin_users WHERE LOWER(email) = LOWER($1)`,
    [email.trim()]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await db.query(
    `SELECT id, email, full_name, role, active, last_login_at, created_at, updated_at
     FROM admin_users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateLastLogin(id) {
  await db.query(
    `UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
}

async function create({ email, passwordHash, fullName, role = 'order_manager' }) {
  const id = generateUUID();
  const result = await db.query(
    `INSERT INTO admin_users (
       id, email, password_hash, full_name, role, active, created_at, updated_at
     ) VALUES ($1, LOWER($2), $3, $4, $5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, email, full_name, role, active, created_at`,
    [id, email.trim(), passwordHash, fullName.trim(), role]
  );
  return result.rows[0];
}

async function listAll() {
  const result = await db.query(
    `SELECT id, email, full_name, role, active, last_login_at, created_at
     FROM admin_users
     ORDER BY created_at ASC`
  );
  return result.rows;
}

module.exports = {
  findByEmail,
  findById,
  updateLastLogin,
  create,
  listAll
};
