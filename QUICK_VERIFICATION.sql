-- ============================================================================
-- QUICK VERIFICATION QUERIES
-- Run these to check if everything is working correctly
-- ============================================================================

-- 1. CHECK USER EARNINGS
-- ============================================================================
SELECT
  email,
  total_investment,
  total_earnings,
  wallet_balance,
  current_rank,
  left_volume,
  right_volume
FROM users
WHERE email = 'test-e2e-1762258004006@example.com';

-- Expected:
-- total_earnings: 46.00 (or similar)
-- total_investment: 10000.00


-- 2. CHECK TRANSACTIONS
-- ============================================================================
SELECT
  transaction_type,
  amount,
  description,
  status,
  created_at
FROM mlm_transactions
WHERE user_id = (
  SELECT id FROM users
  WHERE email = 'test-e2e-1762258004006@example.com'
)
ORDER BY created_at DESC
LIMIT 20;

-- Expected: Should show 6 transactions with types:
-- - level_income
-- - matching_bonus
-- - roi_distribution
-- Total sum should be ~$46


-- 3. CHECK ACTIVE PACKAGES
-- ============================================================================
SELECT
  id,
  investment_amount,
  daily_roi_amount,
  total_roi_earned,
  days_completed,
  status,
  activation_date,
  expiry_date,
  last_roi_date
FROM user_packages
WHERE user_id = (
  SELECT id FROM users
  WHERE email = 'test-e2e-1762258004006@example.com'
)
AND status = 'active';

-- Expected: At least 1 active package with:
-- - investment_amount: 10000.00
-- - daily_roi_amount: calculated based on ROI %
-- - total_roi_earned: should be accumulating


-- 4. CHECK COMMISSION CALCULATION
-- ============================================================================
SELECT
  COUNT(*) as total_commissions,
  SUM(amount) as total_commission_amount,
  transaction_type
FROM mlm_transactions
WHERE user_id = (
  SELECT id FROM users
  WHERE email = 'test-e2e-1762258004006@example.com'
)
GROUP BY transaction_type;

-- Expected breakdown by type:
-- level_income: X commissions, $XX.XX
-- matching_bonus: X commissions, $XX.XX


-- 5. CHECK TEAM STRUCTURE
-- ============================================================================
SELECT
  COUNT(*) as team_size,
  SUM(total_investment) as team_volume
FROM users
WHERE sponsor_id = (
  SELECT id FROM users
  WHERE email = 'test-e2e-1762258004006@example.com'
);

-- Expected:
-- team_size: 29 (or similar)
-- team_volume: 423352.00 (or similar)


-- 6. CHECK BINARY PLACEMENT
-- ============================================================================
SELECT
  binary_position,
  COUNT(*) as count,
  SUM(total_investment) as volume
FROM users
WHERE binary_parent_id = (
  SELECT id FROM users
  WHERE email = 'test-e2e-1762258004006@example.com'
)
GROUP BY binary_position;

-- Expected:
-- left: X members, $XXX,XXX
-- right: X members, $XXX,XXX


-- 7. VERIFY CRON JOBS
-- ============================================================================
SELECT
  jobname,
  schedule,
  command,
  active,
  jobid
FROM cron.job
WHERE jobname IN ('daily-roi-distribution', 'hourly-binary-volume-update');

-- Expected:
-- daily-roi-distribution: 0 0 * * *, active=true
-- hourly-binary-volume-update: 0 * * * *, active=true


-- 8. CHECK RECENT CRON EXECUTIONS
-- ============================================================================
SELECT
  jobid,
  runid,
  status,
  start_time,
  end_time,
  command
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job
  WHERE jobname = 'daily-roi-distribution'
)
ORDER BY start_time DESC
LIMIT 5;

-- Expected: Recent runs with status='succeeded'


-- 9. TODAY'S ROI DISTRIBUTIONS
-- ============================================================================
SELECT
  COUNT(*) as distributions_today,
  SUM(amount) as total_distributed_today
FROM mlm_transactions
WHERE transaction_type = 'roi_distribution'
  AND DATE(created_at) = CURRENT_DATE;

-- Expected: If cron ran today, should show distributions


-- 10. SUMMARY DASHBOARD
-- ============================================================================
SELECT
  'Total Users' as metric,
  COUNT(*)::text as value
FROM users
WHERE role = 'user'

UNION ALL

SELECT
  'Total Transactions',
  COUNT(*)::text
FROM mlm_transactions

UNION ALL

SELECT
  'Total Earnings Distributed',
  '$' || SUM(amount)::text
FROM mlm_transactions

UNION ALL

SELECT
  'Active Packages',
  COUNT(*)::text
FROM user_packages
WHERE status = 'active'

UNION ALL

SELECT
  'Total Investment Volume',
  '$' || SUM(total_investment)::text
FROM users
WHERE role = 'user';

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- If earnings are still $0, check:

-- A. Verify transactions exist
SELECT COUNT(*) as transaction_count
FROM mlm_transactions;
-- Should be > 0

-- B. Verify user record
SELECT * FROM users
WHERE email = 'test-e2e-1762258004006@example.com';
-- Check total_earnings column has value

-- C. Check function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('distribute_daily_roi', 'calculate_level_commissions', 'update_binary_volumes');
-- Should show 3 functions

-- D. Test function execution
SELECT distribute_daily_roi();
-- Should execute without errors

-- E. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, qual
FROM pg_policies
WHERE tablename IN ('mlm_transactions', 'user_packages', 'users')
ORDER BY tablename, policyname;
-- Verify policies allow reads

-- ============================================================================
-- MANUAL FIXES (if needed)
-- ============================================================================

-- If total_earnings not syncing, manually update:
UPDATE users
SET total_earnings = (
  SELECT COALESCE(SUM(amount), 0)
  FROM mlm_transactions
  WHERE mlm_transactions.user_id = users.id
    AND transaction_type IN ('level_income', 'matching_bonus', 'roi_distribution', 'rank_reward')
)
WHERE email = 'test-e2e-1762258004006@example.com';

-- If binary volumes are $0, manually update:
SELECT update_binary_volumes();

-- If packages need ROI distribution:
SELECT distribute_daily_roi();

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================
