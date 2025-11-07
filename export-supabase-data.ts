/**
 * Export Data from Supabase
 * This script connects to Supabase and exports all data to SQL format
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Supabase configuration
const SUPABASE_URL = 'https://dsgtyrwtlpnckvcozfbc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZ3R5cnd0bHBuY2t2Y296ZmJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTg0MTQwNywiZXhwIjoyMDc3NDE3NDA3fQ.O6HLc6lQHgFkYpb1scfBGa2iaWwfo3yXIxHlbGEyOxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  sponsor_id: string | null;
  referral_code: string;
  wallet_balance: number;
  total_earnings: number;
  total_investment: number;
  total_withdrawal: number;
  current_rank: string;
  left_volume: number;
  right_volume: number;
  wallet_address: string | null;
  phone_number: string | null;
  country: string | null;
  kyc_status: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

async function exportUsers(): Promise<string> {
  console.log('📤 Exporting users...');

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching users:', error);
    return '';
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No users found');
    return '';
  }

  console.log(`✅ Found ${users.length} users`);

  let sql = `-- ============================================================================\n`;
  sql += `-- USERS DATA EXPORT FROM SUPABASE\n`;
  sql += `-- Exported: ${new Date().toISOString()}\n`;
  sql += `-- Total Users: ${users.length}\n`;
  sql += `-- ============================================================================\n\n`;

  for (const user of users as User[]) {
    const values = [
      `'${user.id}'`,
      `'${user.email}'`,
      `'${user.password_hash}'`,
      `'${user.full_name.replace(/'/g, "''")}'`,
      `'${user.role}'`,
      user.sponsor_id ? `'${user.sponsor_id}'` : 'NULL',
      `'${user.referral_code}'`,
      user.wallet_balance || 0,
      user.total_earnings || 0,
      user.total_investment || 0,
      user.total_withdrawal || 0,
      `'${user.current_rank}'::rank_type`,
      user.left_volume || 0,
      user.right_volume || 0,
      user.wallet_address ? `'${user.wallet_address}'` : 'NULL',
      user.phone_number ? `'${user.phone_number}'` : 'NULL',
      user.country ? `'${user.country}'` : 'NULL',
      `'${user.kyc_status}'::kyc_status`,
      user.email_verified,
      user.is_active,
      `'${user.created_at}'`,
      `'${user.updated_at}'`
    ];

    sql += `INSERT INTO users (id, email, password_hash, full_name, role, sponsor_id, referral_code, wallet_balance, total_earnings, total_investment, total_withdrawal, current_rank, left_volume, right_volume, wallet_address, phone_number, country, kyc_status, email_verified, is_active, created_at, updated_at)\n`;
    sql += `VALUES (${values.join(', ')})\n`;
    sql += `ON CONFLICT (id) DO UPDATE SET\n`;
    sql += `  email = EXCLUDED.email,\n`;
    sql += `  password_hash = EXCLUDED.password_hash,\n`;
    sql += `  full_name = EXCLUDED.full_name,\n`;
    sql += `  wallet_balance = EXCLUDED.wallet_balance,\n`;
    sql += `  total_earnings = EXCLUDED.total_earnings,\n`;
    sql += `  total_investment = EXCLUDED.total_investment,\n`;
    sql += `  total_withdrawal = EXCLUDED.total_withdrawal,\n`;
    sql += `  current_rank = EXCLUDED.current_rank,\n`;
    sql += `  left_volume = EXCLUDED.left_volume,\n`;
    sql += `  right_volume = EXCLUDED.right_volume,\n`;
    sql += `  updated_at = EXCLUDED.updated_at;\n\n`;
  }

  return sql;
}

async function exportUserPackages(): Promise<string> {
  console.log('📤 Exporting user packages...');

  const { data: packages, error } = await supabase
    .from('user_packages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching packages:', error);
    return '';
  }

  if (!packages || packages.length === 0) {
    console.log('⚠️  No packages found');
    return '';
  }

  console.log(`✅ Found ${packages.length} packages`);

  let sql = `-- ============================================================================\n`;
  sql += `-- USER PACKAGES DATA EXPORT\n`;
  sql += `-- Total Packages: ${packages.length}\n`;
  sql += `-- ============================================================================\n\n`;

  for (const pkg of packages) {
    sql += `INSERT INTO user_packages (id, user_id, package_amount, roi_percentage, roi_frequency_days, roi_paid_count, roi_total_count, status, activated_at, expires_at, created_at, updated_at)\n`;
    sql += `VALUES (\n`;
    sql += `  '${pkg.id}',\n`;
    sql += `  '${pkg.user_id}',\n`;
    sql += `  ${pkg.package_amount || 0},\n`;
    sql += `  ${pkg.roi_percentage || 5},\n`;
    sql += `  ${pkg.roi_frequency_days || 1},\n`;
    sql += `  ${pkg.roi_paid_count || 0},\n`;
    sql += `  ${pkg.roi_total_count || 200},\n`;
    sql += `  '${pkg.status}'::package_status,\n`;
    sql += `  ${pkg.activated_at ? `'${pkg.activated_at}'` : 'NULL'},\n`;
    sql += `  ${pkg.expires_at ? `'${pkg.expires_at}'` : 'NULL'},\n`;
    sql += `  '${pkg.created_at}',\n`;
    sql += `  '${pkg.updated_at}'\n`;
    sql += `)\n`;
    sql += `ON CONFLICT (id) DO UPDATE SET\n`;
    sql += `  roi_paid_count = EXCLUDED.roi_paid_count,\n`;
    sql += `  status = EXCLUDED.status,\n`;
    sql += `  updated_at = EXCLUDED.updated_at;\n\n`;
  }

  return sql;
}

async function exportTransactions(): Promise<string> {
  console.log('📤 Exporting transactions...');

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching transactions:', error);
    return '';
  }

  if (!transactions || transactions.length === 0) {
    console.log('⚠️  No transactions found');
    return '';
  }

  console.log(`✅ Found ${transactions.length} transactions`);

  let sql = `-- ============================================================================\n`;
  sql += `-- TRANSACTIONS DATA EXPORT\n`;
  sql += `-- Total Transactions: ${transactions.length}\n`;
  sql += `-- ============================================================================\n\n`;

  for (const tx of transactions) {
    sql += `INSERT INTO transactions (id, user_id, amount, type, status, reference_id, description, created_at, updated_at)\n`;
    sql += `VALUES (\n`;
    sql += `  '${tx.id}',\n`;
    sql += `  '${tx.user_id}',\n`;
    sql += `  ${tx.amount},\n`;
    sql += `  '${tx.type}'::transaction_type,\n`;
    sql += `  '${tx.status}'::transaction_status,\n`;
    sql += `  ${tx.reference_id ? `'${tx.reference_id}'` : 'NULL'},\n`;
    sql += `  ${tx.description ? `'${tx.description.replace(/'/g, "''")}'` : 'NULL'},\n`;
    sql += `  '${tx.created_at}',\n`;
    sql += `  '${tx.updated_at}'\n`;
    sql += `)\n`;
    sql += `ON CONFLICT (id) DO UPDATE SET\n`;
    sql += `  status = EXCLUDED.status,\n`;
    sql += `  updated_at = EXCLUDED.updated_at;\n\n`;
  }

  return sql;
}

async function exportAll() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 SUPABASE DATA EXPORT');
    console.log('='.repeat(70) + '\n');

    let fullSQL = `-- ============================================================================\n`;
    fullSQL += `-- COMPLETE DATA EXPORT FROM SUPABASE TO LOCAL POSTGRESQL\n`;
    fullSQL += `-- Project: Finaster MLM\n`;
    fullSQL += `-- Exported: ${new Date().toISOString()}\n`;
    fullSQL += `-- ============================================================================\n\n`;

    fullSQL += `-- Disable triggers for bulk import\n`;
    fullSQL += `SET session_replication_role = replica;\n\n`;

    // Export each table
    const usersSql = await exportUsers();
    const packagesSql = await exportUserPackages();
    const transactionsSql = await exportTransactions();

    fullSQL += usersSql;
    fullSQL += '\n\n';
    fullSQL += packagesSql;
    fullSQL += '\n\n';
    fullSQL += transactionsSql;

    fullSQL += `\n-- Re-enable triggers\n`;
    fullSQL += `SET session_replication_role = DEFAULT;\n\n`;

    fullSQL += `-- Update sequences\n`;
    fullSQL += `SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));\n`;
    fullSQL += `SELECT setval(pg_get_serial_sequence('user_packages', 'id'), (SELECT MAX(id) FROM user_packages));\n`;
    fullSQL += `SELECT setval(pg_get_serial_sequence('transactions', 'id'), (SELECT MAX(id) FROM transactions));\n\n`;

    fullSQL += `-- Verification\n`;
    fullSQL += `SELECT 'Users' as table_name, COUNT(*) as count FROM users\n`;
    fullSQL += `UNION ALL\n`;
    fullSQL += `SELECT 'Packages', COUNT(*) FROM user_packages\n`;
    fullSQL += `UNION ALL\n`;
    fullSQL += `SELECT 'Transactions', COUNT(*) FROM transactions;\n`;

    // Write to file
    const filename = 'supabase-data-export.sql';
    fs.writeFileSync(filename, fullSQL);

    console.log('\n' + '='.repeat(70));
    console.log('✅ EXPORT COMPLETE');
    console.log('='.repeat(70));
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Size: ${(fullSQL.length / 1024).toFixed(2)} KB`);
    console.log('='.repeat(70) + '\n');

    console.log('📋 Next steps:');
    console.log('1. Start PostgreSQL: docker-compose up -d');
    console.log(`2. Import data: docker exec -i finaster-postgres psql -U finaster_admin -d finaster_mlm < ${filename}`);
    console.log('3. Verify: Check user count and data\n');

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  }
}

// Run export
exportAll();
