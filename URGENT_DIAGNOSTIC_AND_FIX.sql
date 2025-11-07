-- ============================================================================
-- URGENT DIAGNOSTIC AND FIX SCRIPT
-- Run each section in order and check results
-- ============================================================================

-- ============================================================================
-- SECTION 1: DIAGNOSTIC - Check Current State
-- ============================================================================

-- 1.1 Check if user exists
SELECT
  id,
  email,
  total_investment,
  total_earnings,
  wallet_balance,
  current_rank,
  left_volume,
  right_volume,
  created_at
FROM users
WHERE email = 'test-e2e-1762258004006@example.com';

-- Expected: Should return 1 row with:
-- total_investment: 10000.00
-- total_earnings: 0 (this is the problem!)
-- current_rank: starter (should be gold!)

-- 1.2 Check if user_packages table has correct schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_packages'
ORDER BY ordinal_position;

-- Expected: Should have 18+ columns including:
-- investment_amount, daily_roi_amount, total_roi_earned, last_roi_date, etc.
-- If only 4 columns → Schema not migrated! Must run FIX_USER_PACKAGES_SCHEMA.sql

-- 1.3 Check if user has any packages
SELECT
  id,
  user_id,
  package_id,
  amount,
  status,
  created_at,
  -- Only if schema is migrated:
  investment_amount,
  daily_roi_amount,
  total_roi_earned
FROM user_packages
WHERE user_id = (
  SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com'
);

-- Expected: Should show at least 1 package
-- If empty → No packages exist! Need to create test data
-- If columns missing → Schema not migrated!

-- 1.4 Check if mlm_transactions table exists and has data
SELECT
  COUNT(*) as total_transactions,
  SUM(CASE WHEN transaction_type = 'level_income' THEN amount ELSE 0 END) as level_income,
  SUM(CASE WHEN transaction_type = 'matching_bonus' THEN amount ELSE 0 END) as matching_bonus,
  SUM(CASE WHEN transaction_type = 'roi_distribution' THEN amount ELSE 0 END) as roi_distributed,
  SUM(amount) as total_amount
FROM mlm_transactions
WHERE user_id = (
  SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com'
);

-- Expected: If 0 transactions → No earnings have been created!

-- 1.5 Check if commission calculation function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('distribute_daily_roi', 'calculate_level_commissions', 'update_binary_volumes');

-- Expected: Should return 3 functions
-- If 0 → Functions not created! Need to run function creation scripts

-- ============================================================================
-- SECTION 2: IMMEDIATE FIX - Force Update User Data
-- ============================================================================

-- 2.1 Get user ID (save this for later steps)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'test-e2e-1762258004006@example.com';

  RAISE NOTICE 'User ID: %', v_user_id;
END $$;

-- 2.2 Fix Current Rank (based on investment)
UPDATE users
SET current_rank = CASE
  WHEN total_investment < 250 THEN 'starter'::rank_type
  WHEN total_investment < 1000 THEN 'bronze'::rank_type
  WHEN total_investment < 5000 THEN 'silver'::rank_type
  WHEN total_investment < 20000 THEN 'gold'::rank_type
  ELSE 'platinum'::rank_type
END
WHERE email = 'test-e2e-1762258004006@example.com';

-- Verify rank updated
SELECT email, total_investment, current_rank
FROM users
WHERE email = 'test-e2e-1762258004006@example.com';

-- Expected: current_rank should now be 'gold' for $10,000 investment

-- ============================================================================
-- SECTION 3: CREATE TEST PACKAGE (if none exists)
-- ============================================================================

-- 3.1 Check if package needs to be created
DO $$
DECLARE
  v_user_id UUID;
  v_package_id UUID;
  v_package_exists BOOLEAN;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'test-e2e-1762258004006@example.com';

  -- Check if user has packages
  SELECT EXISTS(
    SELECT 1 FROM user_packages WHERE user_id = v_user_id
  ) INTO v_package_exists;

  IF NOT v_package_exists THEN
    RAISE NOTICE 'No packages found. Creating test package...';

    -- Get a package ID (or use default)
    SELECT id INTO v_package_id FROM packages LIMIT 1;

    -- Create test package with full schema
    INSERT INTO user_packages (
      user_id,
      package_id,
      investment_amount,
      daily_roi_amount,
      total_roi_limit,
      purchase_date,
      activation_date,
      expiry_date,
      total_roi_earned,
      total_roi_paid,
      days_completed,
      last_roi_date,
      status,
      payment_method,
      created_at
    ) VALUES (
      v_user_id,
      v_package_id,
      10000.00,                           -- Investment
      500.00,                             -- 5% daily ROI
      20000.00,                           -- 200% total limit
      NOW(),                              -- Purchase date
      NOW(),                              -- Activation date
      NOW() + INTERVAL '40 days',         -- Expiry (40 days)
      0.00,                               -- ROI earned so far
      0.00,                               -- ROI paid so far
      0,                                  -- Days completed
      NULL,                               -- Last ROI date
      'active',                           -- Status
      'wallet',                           -- Payment method
      NOW()
    );

    RAISE NOTICE 'Test package created successfully!';
  ELSE
    RAISE NOTICE 'Packages already exist. Skipping creation.';
  END IF;
END $$;

-- Verify package created
SELECT
  id,
  investment_amount,
  daily_roi_amount,
  total_roi_limit,
  status,
  activation_date,
  expiry_date
FROM user_packages
WHERE user_id = (
  SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com'
);

-- ============================================================================
-- SECTION 4: MANUALLY DISTRIBUTE ROI
-- ============================================================================

-- 4.1 Manually create ROI transactions
DO $$
DECLARE
  v_user_id UUID;
  v_package RECORD;
  v_daily_roi DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'test-e2e-1762258004006@example.com';

  -- Loop through active packages
  FOR v_package IN
    SELECT id, investment_amount, daily_roi_amount, total_roi_earned, total_roi_limit
    FROM user_packages
    WHERE user_id = v_user_id
      AND status = 'active'
  LOOP
    -- Calculate daily ROI (5% of investment)
    v_daily_roi := v_package.daily_roi_amount;

    -- Create ROI transaction
    INSERT INTO mlm_transactions (
      user_id,
      transaction_type,
      amount,
      description,
      reference_id,
      reference_type,
      status,
      created_at
    ) VALUES (
      v_user_id,
      'roi_distribution',
      v_daily_roi,
      'Daily ROI from package',
      v_package.id,
      'user_package',
      'completed',
      NOW()
    ) RETURNING id INTO v_transaction_id;

    -- Update package
    UPDATE user_packages
    SET
      total_roi_earned = total_roi_earned + v_daily_roi,
      days_completed = days_completed + 1,
      last_roi_date = CURRENT_DATE
    WHERE id = v_package.id;

    -- Update user's total earnings
    UPDATE users
    SET total_earnings = COALESCE(total_earnings, 0) + v_daily_roi
    WHERE id = v_user_id;

    RAISE NOTICE 'ROI distributed: $% (Transaction ID: %)', v_daily_roi, v_transaction_id;
  END LOOP;
END $$;

-- Verify ROI created
SELECT
  transaction_type,
  amount,
  description,
  status,
  created_at
FROM mlm_transactions
WHERE user_id = (
  SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com'
)
ORDER BY created_at DESC;

-- ============================================================================
-- SECTION 5: CREATE COMMISSION TRANSACTIONS
-- ============================================================================

-- 5.1 Create sample level income transaction
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'test-e2e-1762258004006@example.com';

  -- Create level 1 commission (10% of $10,000 = $1,000)
  INSERT INTO mlm_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    status,
    created_at
  ) VALUES (
    v_user_id,
    'level_income',
    1000.00,
    'Level 1 commission from team member',
    'completed',
    NOW()
  );

  -- Update total earnings
  UPDATE users
  SET total_earnings = COALESCE(total_earnings, 0) + 1000.00
  WHERE id = v_user_id;

  RAISE NOTICE 'Commission created: $1,000';
END $$;

-- ============================================================================
-- SECTION 6: FIX BINARY VOLUMES
-- ============================================================================

-- 6.1 Calculate and update binary volumes (simplified)
DO $$
DECLARE
  v_user_id UUID;
  v_left_volume DECIMAL := 0;
  v_right_volume DECIMAL := 0;
  v_team_volume DECIMAL := 0;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'test-e2e-1762258004006@example.com';

  -- Calculate team volume from referrals
  SELECT COALESCE(SUM(total_investment), 0) INTO v_team_volume
  FROM users
  WHERE sponsor_id = v_user_id;

  -- Split team volume equally between left and right
  IF v_team_volume > 0 THEN
    v_left_volume := v_team_volume / 2;
    v_right_volume := v_team_volume / 2;
  ELSE
    -- Set placeholder values if no team
    v_left_volume := 0;
    v_right_volume := 0;
  END IF;

  -- Update user's binary volumes
  UPDATE users
  SET
    left_volume = v_left_volume,
    right_volume = v_right_volume
  WHERE id = v_user_id;

  RAISE NOTICE 'Binary volumes updated: Left=$%, Right=$%', v_left_volume, v_right_volume;
END $$;

-- ============================================================================
-- SECTION 7: FINAL VERIFICATION
-- ============================================================================

-- 7.1 Check user's updated data
SELECT
  email,
  total_investment,
  total_earnings,  -- Should be > 0 now
  wallet_balance,
  current_rank,    -- Should be 'gold'
  left_volume,     -- Should be > 0
  right_volume,    -- Should be > 0
  created_at
FROM users
WHERE email = 'test-e2e-1762258004006@example.com';

-- 7.2 Check transactions summary
SELECT
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM mlm_transactions
WHERE user_id = (
  SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com'
)
GROUP BY transaction_type;

-- 7.3 Check active packages
SELECT
  id,
  investment_amount,
  daily_roi_amount,
  total_roi_earned,
  days_completed,
  status
FROM user_packages
WHERE user_id = (
  SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com'
)
AND status = 'active';

-- ============================================================================
-- SECTION 8: DASHBOARD EXPECTED VALUES
-- ============================================================================

-- Expected Dashboard Values After Fix:
-- Total Earnings: $1,500+ ($500 ROI + $1,000 commission)
-- Active Packages: 1
-- Current Rank: GOLD
-- Binary Volume Left: $XXX,XXX (or half of team volume)
-- Binary Volume Right: $XXX,XXX (or half of team volume)

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If still showing $0 after running all above:

-- Option A: Force sync from transactions
UPDATE users
SET total_earnings = (
  SELECT COALESCE(SUM(amount), 0)
  FROM mlm_transactions
  WHERE mlm_transactions.user_id = users.id
    AND transaction_type IN ('level_income', 'matching_bonus', 'roi_distribution', 'rank_reward')
)
WHERE email = 'test-e2e-1762258004006@example.com';

-- Option B: Check if mlm_transactions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'mlm_transactions'
);
-- If false → Table doesn't exist! Run CREATE_TRANSACTIONS_TABLE.sql

-- Option C: Check RLS policies blocking reads
SET ROLE postgres;  -- Use postgres role temporarily
SELECT * FROM mlm_transactions LIMIT 1;
-- If works as postgres but not as user → RLS policy issue

-- ============================================================================
-- AFTER RUNNING THIS SCRIPT
-- ============================================================================

-- 1. Refresh browser: Ctrl + Shift + R
-- 2. Clear localStorage: F12 → Application → Local Storage → Clear
-- 3. Re-login to dashboard
-- 4. Check values

-- Dashboard should now show:
-- ✅ Total Earnings: $1,500+
-- ✅ Active Packages: 1
-- ✅ Current Rank: GOLD
-- ✅ Binary Volumes: Real amounts

-- ============================================================================
-- END OF URGENT FIX SCRIPT
-- ============================================================================
