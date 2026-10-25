// src/utils/cryptoUtils.js
// Cryptographic helpers: high-entropy tokens, UUIDs, and password hashing

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

function generateTrackingToken() {
  return 'trk_' + crypto.randomBytes(24).toString('hex');
}

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CFP-${dateStr}-${randomSuffix}`;
}

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(plainPassword, salt);
}

async function verifyPassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  return await bcrypt.compare(plainPassword, hash);
}

function safeTimingCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  generateUUID,
  generateTrackingToken,
  generateOrderNumber,
  hashPassword,
  verifyPassword,
  safeTimingCompare
};
