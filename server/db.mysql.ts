/**
 * MySQL Database Client for Backend API
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE || 'finaster_mlm',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create connection pool
const pool = mysql.createPool(config);

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ API Server connected to MySQL');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err.message);
  });

// Export query function compatible with existing code
export async function query(text: string, params?: any[]) {
  try {
    const [rows] = await pool.execute(text, params);
    return { rows: rows as any[] };
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
}

export { pool };
export default { query, pool };
