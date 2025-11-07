/**
 * PostgreSQL Database Client
 * Direct connection to local PostgreSQL (no Supabase)
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration
const config = {
  host: import.meta.env.POSTGRES_HOST || 'localhost',
  port: parseInt(import.meta.env.POSTGRES_PORT || '5432'),
  database: import.meta.env.POSTGRES_DB || 'finaster_mlm',
  user: import.meta.env.POSTGRES_USER || 'postgres',
  password: import.meta.env.POSTGRES_PASSWORD || 'postgres123',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(config);

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

/**
 * Query the database
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed', { text: text.substring(0, 50), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
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

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

/**
 * Close all connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('🔌 Database pool closed');
}

// Export the pool for advanced usage
export { pool };

// Default export
export default {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  pool,
};
