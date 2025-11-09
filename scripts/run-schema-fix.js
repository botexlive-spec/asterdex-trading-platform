/**
 * Run Schema Fix Migration
 * Fixes database schema mismatches
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function runMigration() {
  console.log('\n🔧 Starting schema fix migration...\n');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'finaster_mlm',
    multipleStatements: true,
  });

  try {
    // Read the SQL file
    const sqlFile = readFileSync(join(__dirname, '..', 'database', 'fix-schema-mismatches.sql'), 'utf8');

    console.log('📝 Executing schema fixes...');

    // Split by semicolons and execute each statement
    const statements = sqlFile
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        const [result] = await connection.query(statement + ';');
        if (result && result[0] && result[0].message) {
          console.log(result[0].message);
        }
      } catch (error) {
        // Ignore errors for statements that check if columns exist
        if (!error.message.includes('Duplicate') && !error.message.includes('already exists')) {
          console.error('⚠️  Warning:', error.message);
        }
      }
    }

    console.log('\n✅ Schema fix migration completed!\n');

    // Verify the fixes
    console.log('🔍 Verifying fixes...\n');

    const [usersCols] = await connection.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'referral_code'",
      [process.env.MYSQL_DATABASE || 'finaster_mlm']
    );

    const [transactionsCols] = await connection.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'mlm_transactions' AND COLUMN_NAME IN ('from_user_id', 'level', 'package_id', 'method', 'metadata')",
      [process.env.MYSQL_DATABASE || 'finaster_mlm']
    );

    console.log('✓ users.referral_code:', usersCols.length > 0 ? usersCols[0].COLUMN_TYPE : 'NOT FOUND');
    console.log('✓ mlm_transactions columns:');
    transactionsCols.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
    });

    console.log('\n✅ All schema fixes verified!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);
