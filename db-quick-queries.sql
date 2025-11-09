-- ========================================
-- ASTERDEX MLM - QUICK DATABASE QUERIES
-- ========================================

-- Use the MLM database
USE finaster_mlm;

-- ========================================
-- 1. PLATFORM OVERVIEW
-- ========================================

SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users,
  (SELECT COUNT(*) FROM user_packages WHERE status = 'active') as active_packages,
  (SELECT ROUND(SUM(wallet_balance), 2) FROM users) as total_wallet_balance,
  (SELECT ROUND(SUM(total_investment), 2) FROM users) as total_investments,
  (SELECT ROUND(SUM(total_earnings), 2) FROM users) as total_earnings,
  (SELECT COUNT(*) FROM mlm_transactions WHERE DATE(created_at) = CURDATE()) as today_transactions;

-- ========================================
-- 2. TOP USERS BY EARNINGS
-- ========================================

SELECT
  email,
  full_name,
  ROUND(wallet_balance, 2) as wallet,
  ROUND(total_investment, 2) as invested,
  ROUND(total_earnings, 2) as earned,
  ROUND(roi_earnings, 2) as roi,
  ROUND(commission_earnings, 2) as commissions
FROM users
WHERE total_earnings > 0
ORDER BY total_earnings DESC
LIMIT 10;

-- ========================================
-- 3. RECENT TRANSACTIONS (Last 20)
-- ========================================

SELECT
  t.created_at,
  u.email,
  t.transaction_type,
  ROUND(t.amount, 2) as amount,
  t.status,
  t.description
FROM mlm_transactions t
JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 20;

-- ========================================
-- 4. ACTIVE INVESTMENTS
-- ========================================

SELECT
  u.email,
  p.name as package,
  ROUND(up.investment_amount, 2) as invested,
  ROUND(up.daily_roi_amount, 2) as daily_roi,
  ROUND(up.total_roi_earned, 2) as earned,
  ROUND(up.total_roi_limit, 2) as limit_amount,
  ROUND((up.total_roi_earned / up.total_roi_limit * 100), 2) as progress_pct,
  up.status,
  DATEDIFF(up.expiry_date, NOW()) as days_remaining
FROM user_packages up
JOIN users u ON up.user_id = u.id
JOIN packages p ON up.package_id = p.id
WHERE up.status = 'active'
ORDER BY up.created_at DESC
LIMIT 20;

-- ========================================
-- 5. BINARY TREE STRUCTURE
-- ========================================

SELECT
  u.email,
  ROUND(u.left_volume, 2) as left_vol,
  ROUND(u.right_volume, 2) as right_vol,
  ROUND((u.left_volume + u.right_volume), 2) as total_vol,
  bt.position,
  bt.level,
  parent.email as parent_email
FROM users u
LEFT JOIN binary_tree bt ON u.id = bt.user_id
LEFT JOIN users parent ON bt.parent_id = parent.id
WHERE u.left_volume > 0 OR u.right_volume > 0
ORDER BY total_vol DESC
LIMIT 15;

-- ========================================
-- 6. COMMISSION SUMMARY
-- ========================================

SELECT
  c.commission_type,
  COUNT(*) as total_count,
  ROUND(SUM(c.amount), 2) as total_amount,
  ROUND(AVG(c.amount), 2) as avg_amount,
  ROUND(MIN(c.amount), 2) as min_amount,
  ROUND(MAX(c.amount), 2) as max_amount
FROM commissions c
GROUP BY c.commission_type
ORDER BY total_amount DESC;

-- ========================================
-- 7. LEVEL INCOME BREAKDOWN
-- ========================================

SELECT
  level,
  COUNT(*) as payments,
  ROUND(SUM(amount), 2) as total,
  ROUND(AVG(amount), 2) as average
FROM commissions
WHERE commission_type = 'level_income'
GROUP BY level
ORDER BY level;

-- ========================================
-- 8. TEAM STATISTICS
-- ========================================

WITH RECURSIVE team_tree AS (
  -- Get all users with their direct referrals
  SELECT
    u1.id as root_id,
    u1.email as root_email,
    u2.id as member_id,
    u2.email as member_email,
    1 as level
  FROM users u1
  LEFT JOIN users u2 ON u1.id = u2.sponsor_id

  UNION ALL

  -- Recursively get downline
  SELECT
    tt.root_id,
    tt.root_email,
    u.id,
    u.email,
    tt.level + 1
  FROM team_tree tt
  JOIN users u ON tt.member_id = u.sponsor_id
  WHERE tt.level < 5
)
SELECT
  root_email,
  COUNT(DISTINCT member_id) as team_size,
  MAX(level) as max_depth
FROM team_tree
WHERE member_id IS NOT NULL
GROUP BY root_id, root_email
HAVING team_size > 0
ORDER BY team_size DESC
LIMIT 10;

-- ========================================
-- 9. PACKAGES ANALYSIS
-- ========================================

SELECT
  p.name,
  p.daily_roi_percentage,
  p.duration_days,
  COUNT(up.id) as sold_count,
  ROUND(SUM(up.investment_amount), 2) as total_invested,
  ROUND(AVG(up.investment_amount), 2) as avg_investment,
  COUNT(CASE WHEN up.status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN up.status = 'completed' THEN 1 END) as completed_count
FROM packages p
LEFT JOIN user_packages up ON p.id = up.package_id
GROUP BY p.id, p.name, p.daily_roi_percentage, p.duration_days
ORDER BY sold_count DESC;

-- ========================================
-- 10. TODAY'S ACTIVITY
-- ========================================

SELECT 'New Users' as metric, COUNT(*) as count
FROM users WHERE DATE(created_at) = CURDATE()
UNION ALL
SELECT 'New Investments', COUNT(*)
FROM user_packages WHERE DATE(created_at) = CURDATE()
UNION ALL
SELECT 'Transactions', COUNT(*)
FROM mlm_transactions WHERE DATE(created_at) = CURDATE()
UNION ALL
SELECT 'ROI Distributed', ROUND(SUM(amount), 2)
FROM mlm_transactions
WHERE transaction_type = 'roi_distribution'
  AND DATE(created_at) = CURDATE()
UNION ALL
SELECT 'Commissions Paid', ROUND(SUM(amount), 2)
FROM mlm_transactions
WHERE transaction_type = 'level_income'
  AND DATE(created_at) = CURDATE();

-- ========================================
-- 11. USER DETAILS (Replace with specific email)
-- ========================================

-- Example: Get specific user details
SELECT
  email,
  full_name,
  role,
  ROUND(wallet_balance, 2) as wallet,
  ROUND(total_investment, 2) as invested,
  ROUND(total_earnings, 2) as earnings,
  ROUND(roi_earnings, 2) as roi,
  ROUND(commission_earnings, 2) as commissions,
  current_rank,
  referral_code,
  created_at
FROM users
WHERE email = 'admin@finaster.com';

-- ========================================
-- 12. TRANSACTION TYPES BREAKDOWN
-- ========================================

SELECT
  transaction_type,
  status,
  COUNT(*) as count,
  ROUND(SUM(amount), 2) as total_amount
FROM mlm_transactions
GROUP BY transaction_type, status
ORDER BY total_amount DESC;

-- ========================================
-- END OF QUERIES
-- ========================================
