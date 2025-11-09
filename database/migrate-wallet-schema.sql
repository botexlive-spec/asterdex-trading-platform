-- ============================================================================
-- MIGRATION: Fix Wallet and Transaction Schema
-- Description: Updates mlm_transactions table to match actual route usage
-- Date: 2025-11-08
-- ============================================================================

USE finaster_mlm;

-- Add missing transaction types to the ENUM
ALTER TABLE mlm_transactions
MODIFY COLUMN transaction_type ENUM(
  'deposit',
  'withdrawal',
  'level_income',
  'matching_bonus',
  'roi_distribution',
  'rank_reward',
  'referral_bonus',
  'binary_bonus',
  'transfer_out',
  'transfer_in'
) NOT NULL;

-- Add missing columns if they don't exist
ALTER TABLE mlm_transactions
ADD COLUMN IF NOT EXISTS method VARCHAR(50) AFTER description,
ADD COLUMN IF NOT EXISTS metadata JSON AFTER method;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify transaction types
SELECT COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'mlm_transactions'
  AND COLUMN_NAME = 'transaction_type';

-- Verify method and metadata columns exist
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'mlm_transactions'
  AND COLUMN_NAME IN ('method', 'metadata');

-- Verify users table has wallet_balance
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'finaster_mlm'
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'wallet_balance';

SELECT '✓ Migration completed successfully!' as status;
