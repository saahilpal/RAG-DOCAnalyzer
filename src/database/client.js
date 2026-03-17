const { Pool } = require('pg');
const env = require('../config/env');

function shouldUseSsl(connectionString) {
  return !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
}

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: shouldUseSsl(env.databaseUrl) ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  withTransaction,
  closePool,
};
