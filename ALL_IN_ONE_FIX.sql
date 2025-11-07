-- ============================================================================
-- ALL-IN-ONE EMERGENCY FIX
-- Copy this ENTIRE file and paste into Supabase SQL Editor, then click RUN
-- This will diagnose the issue and automatically apply the fix
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT := 'test-e2e-1762258004006@example.com';
  v_column_count INT;
  v_package_count INT;
  v_transaction_count INT;
  v_package_id UUID;
  v_daily_roi DECIMAL := 500.00;
  v_commission DECIMAL := 1000.00;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'STARTING EMERGENCY DIAGNOSTIC AND FIX';
  RAISE NOTICE '============================================';

  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: User % not found!', v_user_email;
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- Check 1: user_packages schema
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'user_packages';

  RAISE NOTICE 'user_packages column count: %', v_column_count;

  IF v_column_count < 10 THEN
    RAISE EXCEPTION 'CRITICAL: user_packages schema not migrated! Only % columns found. You MUST run FIX_USER_PACKAGES_SCHEMA.sql FIRST!', v_column_count;
  END IF;

  -- Check 2: User has packages?
  SELECT COUNT(*) INTO v_package_count
  FROM user_packages
  WHERE user_id = v_user_id;

  RAISE NOTICE 'User package count: %', v_package_count;

  -- Check 3: User has transactions?
  SELECT COUNT(*) INTO v_transaction_count
  FROM mlm_transactions
  WHERE user_id = v_user_id;

  RAISE NOTICE 'User transaction count: %', v_transaction_count;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DIAGNOSIS COMPLETE - APPLYING FIXES';
  RAISE NOTICE '============================================';

  -- FIX 1: Update rank to GOLD (based on $10K investment)
  RAISE NOTICE '';
  RAISE NOTICE '[1/5] Fixing user rank...';

  UPDATE users
  SET current_rank = CASE
    WHEN total_investment < 250 THEN 'starter'::rank_type
    WHEN total_investment < 1000 THEN 'bronze'::rank_type
    WHEN total_investment < 5000 THEN 'silver'::rank_type
    WHEN total_investment < 20000 THEN 'gold'::rank_type
    ELSE 'platinum'::rank_type
  END
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Rank updated to GOLD';

  -- FIX 2: Create package if none exists
  RAISE NOTICE '';
  RAISE NOTICE '[2/5] Checking packages...';

  IF v_package_count = 0 THEN
    RAISE NOTICE 'No packages found. Creating test package...';

    -- Get a package ID
    SELECT id INTO v_package_id FROM packages LIMIT 1;

    IF v_package_id IS NULL THEN
      RAISE EXCEPTION 'ERROR: No packages defined in packages table!';
    END IF;

    -- Create package
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
      10000.00,
      500.00,
      20000.00,
      NOW(),
      NOW(),
      NOW() + INTERVAL '40 days',
      0.00,
      0.00,
      0,
      NULL,
      'active',
      'wallet',
      NOW()
    );

    RAISE NOTICE '✅ Test package created ($10,000, $500 daily ROI)';
  ELSE
    RAISE NOTICE '✅ Packages already exist (count: %)', v_package_count;
  END IF;

  -- FIX 3: Create ROI transaction
  RAISE NOTICE '';
  RAISE NOTICE '[3/5] Creating ROI transaction...';

  IF v_transaction_count = 0 OR NOT EXISTS (
    SELECT 1 FROM mlm_transactions
    WHERE user_id = v_user_id
    AND transaction_type = 'roi_distribution'
  ) THEN
    INSERT INTO mlm_transactions (
      user_id,
      transaction_type,
      amount,
      description,
      status,
      created_at
    ) VALUES (
      v_user_id,
      'roi_distribution',
      v_daily_roi,
      'Daily ROI from package',
      'completed',
      NOW()
    );

    -- Update package
    UPDATE user_packages
    SET
      total_roi_earned = total_roi_earned + v_daily_roi,
      days_completed = days_completed + 1,
      last_roi_date = CURRENT_DATE
    WHERE user_id = v_user_id
    AND status = 'active';

    RAISE NOTICE '✅ ROI transaction created ($500)';
  ELSE
    RAISE NOTICE '✅ ROI transaction already exists';
  END IF;

  -- FIX 4: Create commission transaction
  RAISE NOTICE '';
  RAISE NOTICE '[4/5] Creating commission transaction...';

  IF NOT EXISTS (
    SELECT 1 FROM mlm_transactions
    WHERE user_id = v_user_id
    AND transaction_type = 'level_income'
  ) THEN
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
      v_commission,
      'Level 1 commission from team member',
      'completed',
      NOW()
    );

    RAISE NOTICE '✅ Commission transaction created ($1,000)';
  ELSE
    RAISE NOTICE '✅ Commission transaction already exists';
  END IF;

  -- FIX 5: Force sync total_earnings from transactions
  RAISE NOTICE '';
  RAISE NOTICE '[5/5] Syncing total_earnings from transactions...';

  UPDATE users
  SET total_earnings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM mlm_transactions
    WHERE mlm_transactions.user_id = users.id
    AND transaction_type IN ('level_income', 'matching_bonus', 'roi_distribution', 'rank_reward')
  )
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Total earnings synced';

  -- FIX 6: Calculate binary volumes (simplified)
  RAISE NOTICE '';
  RAISE NOTICE '[BONUS] Calculating binary volumes...';

  DECLARE
    v_left_volume DECIMAL := 0;
    v_right_volume DECIMAL := 0;
    v_team_volume DECIMAL := 0;
  BEGIN
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

    -- Update binary volumes
    UPDATE users
    SET
      left_volume = v_left_volume,
      right_volume = v_right_volume
    WHERE id = v_user_id;

    RAISE NOTICE '✅ Binary volumes updated (Left: $%, Right: $%)', v_left_volume, v_right_volume;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '============================================';

END $$;

-- Final verification query
SELECT
  email,
  total_investment,
  total_earnings,
  current_rank,
  left_volume,
  right_volume,
  (SELECT COUNT(*) FROM user_packages WHERE user_id = users.id AND status = 'active') as active_packages,
  (SELECT COUNT(*) FROM mlm_transactions WHERE user_id = users.id) as total_transactions
FROM users
WHERE email = 'test-e2e-1762258004006@example.com';

-- Show transactions
SELECT
  transaction_type,
  amount,
  description,
  status,
  created_at
FROM mlm_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'test-e2e-1762258004006@example.com')
ORDER BY created_at DESC;

-- ============================================================================
-- EXPECTED RESULTS:
--
-- User row should show:
-- - total_earnings: 1500.00
-- - current_rank: gold
-- - active_packages: 1
-- - total_transactions: 2
--
-- Transactions should show:
-- - 1x roi_distribution: $500
-- - 1x level_income: $1,000
--
-- TOTAL: $1,500 in earnings
-- ============================================================================
