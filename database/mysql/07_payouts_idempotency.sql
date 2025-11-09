/**
 * Add Idempotency Constraints to Payouts Table
 * Prevents duplicate payouts from being recorded
 */

-- Add generated columns to handle NULLs for unique constraint
-- These stored columns convert NULL values to defaults for uniqueness checking
ALTER TABLE payouts
ADD COLUMN from_user_id_key VARCHAR(36) GENERATED ALWAYS AS (COALESCE(from_user_id, '')) STORED,
ADD COLUMN level_key INT GENERATED ALWAYS AS (COALESCE(level, 0)) STORED,
ADD COLUMN reference_id_key VARCHAR(100) GENERATED ALWAYS AS (COALESCE(reference_id, '')) STORED,
ADD COLUMN reference_type_key VARCHAR(50) GENERATED ALWAYS AS (COALESCE(reference_type, 'manual')) STORED;

-- Create unique constraint for idempotency using generated columns
-- Prevents duplicate payouts for the same:
-- - recipient (user_id)
-- - source (from_user_id_key - handles NULL)
-- - type (payout_type)
-- - level (level_key - handles NULL)
-- - reference (reference_id_key, reference_type_key - handle NULLs)
-- This ensures we don't double-pay for the same event
CREATE UNIQUE INDEX idx_payouts_idempotency ON payouts(
  user_id,
  from_user_id_key,
  payout_type,
  level_key,
  reference_id_key,
  reference_type_key
);

-- Note: Generated columns convert NULL values to defaults:
-- - from_user_id: NULL -> '' (empty string)
-- - level: NULL -> 0
-- - reference_id: NULL -> '' (empty string)
-- - reference_type: NULL -> 'manual'
