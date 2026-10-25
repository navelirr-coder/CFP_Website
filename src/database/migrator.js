// src/database/migrator.js
// Migration executor reading and applying SQL migration files sequentially

const fs = require('fs');
const path = require('path');
const db = require('./index');

const appliedMigrations = new Set();
let runningMigrationPromise = null;

async function runMigrations() {
  if (runningMigrationPromise) {
    return runningMigrationPromise;
  }

  runningMigrationPromise = (async () => {
    const migrationsDir = path.resolve(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error('Migrations directory not found at ' + migrationsDir);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

  for (const file of files) {
    if (appliedMigrations.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await db.query(sql);
      appliedMigrations.add(file);
      console.log(`- Applied migration: ${file}`);
    } catch (err) {
      console.error(`- Migration failed on file ${file}:`, err.message);
      throw err;
    }
  }

    console.log(`Database migrations up to date (${db.isInMemory() ? 'In-Memory Engine' : 'Live PostgreSQL'}).`);
  })();

  return runningMigrationPromise;
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal migration failure:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
