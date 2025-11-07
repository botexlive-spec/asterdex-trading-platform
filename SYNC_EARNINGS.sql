-- ============================================================================
-- SYNC EARNINGS - Force update total_earnings from transactions
-- ============================================================================

-- Update John Doe's total_earnings
UPDATE users
SET total_earnings = 1500.00
WHERE id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- Verify the update
SELECT
  id,
  email,
  full_name,
  total_earnings,
  current_rank
FROM users
WHERE id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
