// src/database/index.js
// Database connector with connection pooling, transaction runner,
// and automatic fallback to in-memory PostgreSQL for zero-friction local testing.

const { Pool } = require('pg');
const config = require('../config');

let pool = null;
let isInMemory = false;

function initPool() {
  if (pool) return pool;

  if (config.databaseUrl && config.databaseUrl.trim() !== '') {
    try {
      pool = new Pool({
        connectionString: config.databaseUrl,
        ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });
      pool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client:', err.message);
      });
      isInMemory = false;
      return pool;
    } catch (err) {
      console.warn('Failed to initialize live PostgreSQL pool, falling back to in-memory engine:', err.message);
    }
  }

  // In-memory PostgreSQL engine via pg-mem
  const { newDb } = require('pg-mem');
  const memDb = newDb();

  // Register common Postgres functions needed by migrations
  memDb.public.registerFunction({
    name: 'version',
    args: [],
    returns: memDb.public.getType('text'),
    implementation: () => 'PostgreSQL 15.0 (pg-mem)'
  });

  const pgAdapter = memDb.adapters.createPg();
  pool = new pgAdapter.Pool();
  isInMemory = true;
  return pool;
}

pool = initPool();

async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('Executed query:', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text, message: error.message });
    throw error;
  }
}

async function getClient() {
  return await pool.connect();
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Error during transaction rollback:', rollbackErr.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  getClient,
  transaction,
  pool,
  isInMemory: () => isInMemory
};
