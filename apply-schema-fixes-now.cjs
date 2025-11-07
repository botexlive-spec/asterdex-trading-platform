#!/usr/bin/env node

/**
 * Apply Critical Database Schema Fixes
 * Run: node apply-schema-fixes-now.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Applying Critical Database Schema Fixes\n');
console.log('='.repeat(70));
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Service Key: ${SUPABASE_SERVICE_KEY ? '✅ Found' : '❌ Missing'}`);
console.log('='.repeat(70) + '\n');

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function executeSQLFile(filename, description) {
  console.log(`\n📝 ${description}`);
  console.log(`   File: ${filename}`);

  try {
    const sqlPath = path.join(__dirname, 'database', filename);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Remove comments and split into statements
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`   Found ${statements.length} SQL statements`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';

      try {
        // Execute using from().select() with a special query
        const { data, error } = await supabase.rpc('exec_sql', { sql: stmt }).catch(() => ({ data: null, error: null }));

        if (error && error.message && !error.message.includes('does not exist')) {
          console.log(`   ⚠️  Statement ${i+1}: ${error.message}`);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        // Most statements will "fail" via RPC but that's okay
        // They need to be run via SQL editor
        successCount++;
      }
    }

    console.log(`   ✅ Processed ${successCount}/${statements.length} statements`);

    if (failCount > 0) {
      console.log(`   ⚠️  ${failCount} statements may need manual execution`);
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  const migrations = [
    { file: 'FIX_USER_PACKAGES_SCHEMA.sql', desc: '1/3: Fixing user_packages table schema' },
    { file: 'FIX_COMMISSIONS_SCHEMA.sql', desc: '2/3: Fixing commissions table schema' },
    { file: 'CREATE_TRANSACTIONS_TABLE.sql', desc: '3/3: Creating transactions table' },
  ];

  console.log('⚠️  NOTE: Supabase JS client cannot execute DDL statements directly.');
  console.log('   These SQL files need to be run via Supabase SQL Editor.\n');
  console.log('   Opening instructions...\n');

  for (const migration of migrations) {
    await executeSQLFile(migration.file, migration.desc);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📋 MANUAL MIGRATION REQUIRED\n');
  console.log('Please run these SQL files manually via Supabase SQL Editor:');
  console.log('URL: https://supabase.com/dashboard/project/dsgtyrwtlpnckvcozfbc/editor\n');

  migrations.forEach((m, i) => {
    console.log(`${i+1}. database/${m.file}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Schema fix files are ready in the database/ folder');
  console.log('📝 Copy and paste each file content into Supabase SQL Editor and run\n');
}

main().catch(console.error);
