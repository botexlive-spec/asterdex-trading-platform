-- Quick diagnostic to check database state

-- Check 1: User exists and current values
SELECT
  email,
  total_investment,
  total_earnings,
  current_rank,
  left_volume,
  right_volume
FROM users
WHERE email = 'test-e2e-1762258004006@example.com';

-- Check 2: user_packages schema (column count)
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'user_packages';

-- Check 3: User has packages?
SELECT COUNT(*) as package_count
FROM user_packages
WHERE user_id = (SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com');

-- Check 4: User has transactions?
SELECT COUNT(*) as transaction_count
FROM mlm_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com');
