-- ============================================================================
-- CHECK DATABASE - What's actually stored for John Doe
-- ============================================================================

-- 1. Check user's total_earnings in database
SELECT
  id,
  email,
  full_name,
  total_earnings,
  total_investment,
  wallet_balance,
  current_rank
FROM users
WHERE id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- 2. Count packages
SELECT COUNT(*) as package_count
FROM user_packages
WHERE user_id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- 3. List all packages
SELECT
  id,
  investment_amount,
  daily_roi_amount,
  status,
  created_at
FROM user_packages
WHERE user_id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- 4. Count transactions
SELECT COUNT(*) as transaction_count
FROM mlm_transactions
WHERE user_id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- 5. List all transactions
SELECT
  id,
  transaction_type,
  amount,
  description,
  status,
  created_at
FROM mlm_transactions
WHERE user_id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87'
ORDER BY created_at DESC;

-- 6. Calculate sum of transactions
SELECT
  SUM(amount) as total_from_transactions
FROM mlm_transactions
WHERE user_id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87'
  AND transaction_type IN ('level_income', 'matching_bonus', 'roi_distribution', 'rank_reward');
