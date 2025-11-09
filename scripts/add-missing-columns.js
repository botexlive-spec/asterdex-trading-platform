/**
 * Add Missing Columns to mlm_transactions
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

async function addColumns() {
  console.log('\n🔧 Adding missing columns to mlm_transactions...\n');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'finaster_mlm',
  });

  try {
    // Get existing columns
    const [existingCols] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'mlm_transactions'",
      [process.env.MYSQL_DATABASE || 'finaster_mlm']
    );

    const existing = existingCols.map(r => r.COLUMN_NAME);
    console.log('📋 Existing columns:', existing.join(', '));

    // Add level column
    if (!existing.includes('level')) {
      console.log('➕ Adding level column...');
      await connection.query(
        "ALTER TABLE mlm_transactions ADD COLUMN level INTEGER NULL AFTER from_user_id"
      );
      console.log('✅ Added level column');
    } else {
      console.log('✓ level column already exists');
    }

    // Add package_id column
    if (!existing.includes('package_id')) {
      console.log('➕ Adding package_id column...');
      await connection.query(
        "ALTER TABLE mlm_transactions ADD COLUMN package_id CHAR(36) NULL AFTER level"
      );
      console.log('✅ Added package_id column');
    } else {
      console.log('✓ package_id column already exists');
    }

    // Add method column
    if (!existing.includes('method')) {
      console.log('➕ Adding method column...');
      await connection.query(
        "ALTER TABLE mlm_transactions ADD COLUMN method VARCHAR(50) NULL AFTER description"
      );
      console.log('✅ Added method column');
    } else {
      console.log('✓ method column already exists');
    }

    // Add metadata column
    if (!existing.includes('metadata')) {
      console.log('➕ Adding metadata column...');
      await connection.query(
        "ALTER TABLE mlm_transactions ADD COLUMN metadata JSON NULL AFTER method"
      );
      console.log('✅ Added metadata column');
    } else {
      console.log('✓ metadata column already exists');
    }

    // Verify
    const [newCols] = await connection.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'mlm_transactions' ORDER BY ORDINAL_POSITION",
      [process.env.MYSQL_DATABASE || 'finaster_mlm']
    );

    console.log('\n📋 Final mlm_transactions schema:');
    newCols.forEach(col => {
      console.log(`  ${col.COLUMN_NAME.padEnd(20)} ${col.COLUMN_TYPE}`);
    });

    console.log('\n✅ All columns added successfully!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addColumns().catch(console.error);
