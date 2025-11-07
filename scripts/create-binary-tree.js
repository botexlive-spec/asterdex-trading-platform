/**
 * Create binary_tree table in MySQL database
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createBinaryTreeTable() {
  let connection;

  try {
    console.log('🔌 Connecting to MySQL database...');

    // Create connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'finaster',
      multipleStatements: true,
    });

    console.log('✅ Connected to MySQL');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, '../database/create-binary-tree-mysql.sql');
    console.log(`📖 Reading SQL file: ${sqlFilePath}`);

    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute SQL
    console.log('⚙️  Executing SQL...');
    const [results] = await connection.query(sql);

    console.log('✅ Binary tree table created successfully!');

    // Show results
    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        if (result.message) {
          console.log(`   ${result.message}`);
        }
        if (result.total_binary_nodes !== undefined) {
          console.log(`   📊 Total binary nodes: ${result.total_binary_nodes}`);
          console.log(`   👥 Total users: ${result.total_users}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error creating binary tree table:', error.message);
    if (error.sql) {
      console.error('   SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL connection closed');
    }
  }
}

// Run the migration
createBinaryTreeTable();
