// src/repositories/userRepository.js
// Customer account database queries using parameterized SQL

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function findById(id) {
  const result = await db.query(
    'SELECT id, full_name, email, email_verified, phone, account_status, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function findByEmail(email) {
  if (!email) return null;
  const result = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email.trim()]
  );
  return result.rows[0] || null;
}

async function create({ fullName, email, passwordHash, phone = null }) {
  const id = generateUUID();
  const result = await db.query(
    `INSERT INTO users (id, full_name, email, password_hash, phone, account_status, created_at, updated_at)
     VALUES ($1, $2, LOWER($3), $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, full_name, email, email_verified, phone, account_status, created_at, updated_at`,
    [id, fullName.trim(), email.trim(), passwordHash, phone ? phone.trim() : null]
  );
  return result.rows[0];
}

async function updateProfile(id, { fullName, phone }) {
  const result = await db.query(
    `UPDATE users
     SET full_name = COALESCE($2, full_name),
         phone = COALESCE($3, phone),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, full_name, email, email_verified, phone, account_status, updated_at`,
    [id, fullName ? fullName.trim() : null, phone ? phone.trim() : null]
  );
  return result.rows[0] || null;
}

module.exports = {
  findById,
  findByEmail,
  create,
  updateProfile
};
