// src/repositories/addressRepository.js
// Customer address database operations (max 5 saved addresses per user)

const db = require('../database');
const { generateUUID } = require('../utils/cryptoUtils');

async function listByUserId(userId) {
  const result = await db.query(
    `SELECT id, user_id, recipient_name, phone, address_line1, address_line2,
            locality, city, state, postal_code, country, is_default, created_at, updated_at
     FROM customer_addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findById(id, userId) {
  const result = await db.query(
    `SELECT * FROM customer_addresses WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

async function countByUserId(userId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count FROM customer_addresses WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]?.count || 0;
}

async function create(userId, addressData) {
  const count = await countByUserId(userId);
  if (count >= 5) {
    throw new Error('Maximum limit of 5 saved addresses reached.');
  }

  const id = generateUUID();
  const isFirst = count === 0;
  const isDefault = isFirst || Boolean(addressData.is_default);

  return await db.transaction(async (client) => {
    if (isDefault) {
      await client.query(
        `UPDATE customer_addresses SET is_default = FALSE WHERE user_id = $1`,
        [userId]
      );
    }

    const insertResult = await client.query(
      `INSERT INTO customer_addresses (
         id, user_id, recipient_name, phone, address_line1, address_line2,
         locality, city, state, postal_code, country, is_default, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        id,
        userId,
        addressData.recipient_name.trim(),
        addressData.phone.trim(),
        addressData.address_line1.trim(),
        addressData.address_line2 ? addressData.address_line2.trim() : null,
        addressData.locality ? addressData.locality.trim() : null,
        addressData.city.trim(),
        addressData.state.trim(),
        addressData.postal_code.trim(),
        addressData.country || 'India',
        isDefault
      ]
    );
    return insertResult.rows[0];
  });
}

async function update(id, userId, addressData) {
  return await db.transaction(async (client) => {
    if (addressData.is_default) {
      await client.query(
        `UPDATE customer_addresses SET is_default = FALSE WHERE user_id = $1`,
        [userId]
      );
    }

    const result = await client.query(
      `UPDATE customer_addresses
       SET recipient_name = COALESCE($3, recipient_name),
           phone = COALESCE($4, phone),
           address_line1 = COALESCE($5, address_line1),
           address_line2 = COALESCE($6, address_line2),
           locality = COALESCE($7, locality),
           city = COALESCE($8, city),
           state = COALESCE($9, state),
           postal_code = COALESCE($10, postal_code),
           country = COALESCE($11, country),
           is_default = COALESCE($12, is_default),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        addressData.recipient_name,
        addressData.phone,
        addressData.address_line1,
        addressData.address_line2,
        addressData.locality,
        addressData.city,
        addressData.state,
        addressData.postal_code,
        addressData.country,
        addressData.is_default !== undefined ? addressData.is_default : null
      ]
    );
    return result.rows[0] || null;
  });
}

async function deleteAddress(id, userId) {
  const result = await db.query(
    `DELETE FROM customer_addresses WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  listByUserId,
  findById,
  countByUserId,
  create,
  update,
  deleteAddress
};
