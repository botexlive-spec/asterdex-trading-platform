-- ============================================================================
-- VERIFICATION: Wallet and Transaction Schema
-- Run this to verify the schema matches the route expectations
-- ============================================================================

USE finaster_mlm;

-- ============================================================================
-- 1. Verify users table has wallet columns
-- ============================================================================
SELECT '=== USERS TABLE WALLET COLUMNS ===' as check_section;

SELECT
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_TYPE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME IN ('wallet_balance', 'total_earnings', 'total_investment', 'total_withdrawal')
ORDER BY ORDINAL_POSITION;

-- Verify no 'wallets' table exists (should return empty)
SELECT '=== CHECKING FOR WALLETS TABLE (should be empty) ===' as check_section;
SELECT COUNT(*) as wallets_table_count
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'wallets';

-- ============================================================================
-- 2. Verify mlm_transactions table structure
-- ============================================================================
SELECT '=== MLM_TRANSACTIONS TABLE COLUMNS ===' as check_section;

SELECT
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'mlm_transactions'
  AND COLUMN_NAME IN (
    'id', 'user_id', 'transaction_type', 'amount',
    'from_user_id', 'level', 'package_id', 'description',
    'method', 'metadata', 'status', 'created_at'
  )
ORDER BY ORDINAL_POSITION;

-- ============================================================================
-- 3. Verify transaction_type ENUM includes transfer types
-- ============================================================================
SELECT '=== TRANSACTION TYPES (should include transfer_out, transfer_in) ===' as check_section;

SELECT COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'mlm_transactions'
  AND COLUMN_NAME = 'transaction_type';

-- ============================================================================
-- 4. Verify method and metadata columns exist
-- ============================================================================
SELECT '=== METHOD AND METADATA COLUMNS (should exist) ===' as check_section;

SELECT
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'mlm_transactions'
  AND COLUMN_NAME IN ('method', 'metadata');

-- ============================================================================
-- 5. Verify NO completed_at column (should be empty)
-- ============================================================================
SELECT '=== COMPLETED_AT COLUMN (should NOT exist) ===' as check_section;

SELECT COUNT(*) as completed_at_column_count
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'mlm_transactions'
  AND COLUMN_NAME = 'completed_at';

-- ============================================================================
-- 6. Verify created_at column exists
-- ============================================================================
SELECT '=== CREATED_AT COLUMN (should exist) ===' as check_section;

SELECT
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'mlm_transactions'
  AND COLUMN_NAME = 'created_at';

-- ============================================================================
-- FINAL STATUS
-- ============================================================================
SELECT '✓ Verification script completed!' as status;
