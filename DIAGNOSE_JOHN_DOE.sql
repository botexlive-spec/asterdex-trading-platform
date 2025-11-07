-- ============================================================================
-- DIAGNOSE JOHN DOE - Check what actually exists in database
-- ============================================================================

-- 1. Find John Doe's full details
SELECT
  id,
  email,
  full_name,
  total_investment,
  total_earnings,
  wallet_balance,
  current_rank,
  left_volume,
  right_volume,
  created_at
FROM users
WHERE total_investment = 10000.00
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check if John Doe has ANY packages
SELECT
  id,
  user_id,
  package_id,
  investment_amount,
  daily_roi_amount,
  status,
  activation_date,
  expiry_date,
  created_at
FROM user_packages
WHERE user_id = (
  SELECT id FROM users WHERE total_investment = 10000.00 ORDER BY created_at DESC LIMIT 1
);

-- 3. Check if John Doe has ANY transactions
SELECT
  id,
  user_id,
  transaction_type,
  amount,
  description,
  status,
  created_at
FROM mlm_transactions
WHERE user_id = (
  SELECT id FROM users WHERE total_investment = 10000.00 ORDER BY created_at DESC LIMIT 1
)
ORDER BY created_at DESC;

-- 4. Check if packages table has any packages defined
SELECT
  id,
  name,
  price,
  daily_roi_percentage,
  created_at
FROM packages
ORDER BY created_at
LIMIT 5;

-- 5. Count everything for John Doe
SELECT
  (SELECT COUNT(*) FROM user_packages WHERE user_id = (SELECT id FROM users WHERE total_investment = 10000.00 ORDER BY created_at DESC LIMIT 1)) as package_count,
  (SELECT COUNT(*) FROM mlm_transactions WHERE user_id = (SELECT id FROM users WHERE total_investment = 10000.00 ORDER BY created_at DESC LIMIT 1)) as transaction_count,
  (SELECT COUNT(*) FROM packages) as available_packages_count;
