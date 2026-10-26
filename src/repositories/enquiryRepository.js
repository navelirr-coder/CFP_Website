const db = require('../database');

async function createOrFind(enquiry) {
  await db.query(`
    INSERT INTO customer_enquiries
      (id, full_name, email, subject, message, source, whatsapp_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO NOTHING
  `, [enquiry.id, enquiry.fullName, enquiry.email, enquiry.subject,
    enquiry.message, enquiry.source, enquiry.whatsappNumber]);
  const result = await db.query('SELECT * FROM customer_enquiries WHERE id = $1', [enquiry.id]);
  return result.rows[0];
}

async function listRecent() {
  const result = await db.query('SELECT * FROM customer_enquiries ORDER BY created_at DESC LIMIT 100');
  return result.rows;
}

module.exports = { createOrFind, listRecent };
