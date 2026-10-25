// src/scripts/createAdmin.js
// Secure CLI command to provision authorized store administrators

const path = require('path');
const db = require('../database');
const { runMigrations } = require('../database/migrator');
const adminUserRepository = require('../repositories/adminUserRepository');
const { hashPassword } = require('../utils/cryptoUtils');

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_EMAIL || 'admin@choudharifarmproducts.com';
  const password = args[1] || process.env.ADMIN_PASSWORD || 'CfpAdminSecure2026!';
  const fullName = args[2] || 'Store Operations Director';
  const role = args[3] || 'super_admin';

  if (!email || !password) {
    console.error('Usage: node src/scripts/createAdmin.js <email> <password> [fullName] [role]');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  // Ensure migrations are run first
  await runMigrations();

  const existing = await adminUserRepository.findByEmail(email);
  if (existing) {
    console.log(`Admin user with email '${email}' already exists. Updating password...`);
    const passwordHash = await hashPassword(password);
    await db.query(
      `UPDATE admin_users SET password_hash = $2, role = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [existing.id, passwordHash, role]
    );
    console.log(`Successfully updated admin '${email}' with role '${role}'.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const created = await adminUserRepository.create({
    email,
    passwordHash,
    fullName,
    role
  });

  console.log(`Successfully created administrator:`);
  console.log(`- ID: ${created.id}`);
  console.log(`- Email: ${created.email}`);
  console.log(`- Role: ${created.role}`);
}

createAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  });
