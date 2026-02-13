import pg from 'pg';
import { config } from '../../config/index.js';

const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.postgres.url,
  max: config.postgres.max,
  idleTimeoutMillis: config.postgres.idleTimeoutMillis,
  connectionTimeoutMillis: config.postgres.connectionTimeoutMillis,
});

// Log connection events
pool.on('connect', () => {
  console.log('[PostgreSQL] Client connected');
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error:', err);
});

// Helper for running queries
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (config.isDev) {
    console.log('[PostgreSQL] Query:', { text: text.substring(0, 100), duration, rows: result.rowCount });
  }

  return result;
}

// Get a client from the pool for transactions
export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

// Transaction helper
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Check connection
export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Close pool (for graceful shutdown)
export async function close(): Promise<void> {
  await pool.end();
  console.log('[PostgreSQL] Pool closed');
}

export { pool };
export default { query, getClient, transaction, checkConnection, close, pool };
