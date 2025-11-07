-- ============================================================================
-- FIX FOR JOHN DOE (or any user with $10K investment)
-- This will find and fix the user with $10,000 total investment
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_package_count INT;
  v_transaction_count INT;
  v_package_id UUID;
  v_daily_roi DECIMAL := 500.00;
  v_commission DECIMAL := 1000.00;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FINDING USER WITH $10,000 INVESTMENT';
  RAISE NOTICE '============================================';

  -- Find user with $10,000 investment (John Doe)
  SELECT id, email, full_name INTO v_user_id, v_user_email, v_user_name
  FROM users
  WHERE total_investment = 10000.00
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No user found with $10,000 investment!';
  END IF;

  RAISE NOTICE 'Found user: % (%) - ID: %', v_user_name, v_user_email, v_user_id;

  -- Check packages and transactions
  SELECT COUNT(*) INTO v_package_count
  FROM user_packages
  WHERE user_id = v_user_id;

  SELECT COUNT(*) INTO v_transaction_count
  FROM mlm_transactions
  WHERE user_id = v_user_id;

  RAISE NOTICE 'Current packages: %', v_package_count;
  RAISE NOTICE 'Current transactions: %', v_transaction_count;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'APPLYING FIXES FOR %', v_user_name;
  RAISE NOTICE '============================================';

  -- FIX 1: Update rank to GOLD
  RAISE NOTICE '';
  RAISE NOTICE '[1/5] Fixing user rank...';

  UPDATE users
  SET current_rank = 'gold'::rank_type
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Rank updated to GOLD';

  -- FIX 2: Create package if none exists
  RAISE NOTICE '';
  RAISE NOTICE '[2/5] Checking packages...';

  IF v_package_count = 0 THEN
    RAISE NOTICE 'No packages found. Creating test package...';

    SELECT id INTO v_package_id FROM packages LIMIT 1;

    IF v_package_id IS NULL THEN
      RAISE EXCEPTION 'ERROR: No packages defined in packages table!';
    END IF;

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

  -- FIX 6: Calculate binary volumes
  RAISE NOTICE '';
  RAISE NOTICE '[BONUS] Calculating binary volumes...';

  DECLARE
    v_left_volume DECIMAL := 0;
    v_right_volume DECIMAL := 0;
    v_team_volume DECIMAL := 0;
  BEGIN
    SELECT COALESCE(SUM(total_investment), 0) INTO v_team_volume
    FROM users
    WHERE sponsor_id = v_user_id;

    IF v_team_volume > 0 THEN
      v_left_volume := v_team_volume / 2;
      v_right_volume := v_team_volume / 2;
    ELSE
      v_left_volume := 0;
      v_right_volume := 0;
    END IF;

    UPDATE users
    SET
      left_volume = v_left_volume,
      right_volume = v_right_volume
    WHERE id = v_user_id;

    RAISE NOTICE '✅ Binary volumes updated (Left: $%, Right: $%)', v_left_volume, v_right_volume;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VERIFICATION RESULTS FOR %', v_user_name;
  RAISE NOTICE '============================================';

END $$;

-- Final verification query
SELECT
  email,
  full_name,
  total_investment,
  total_earnings,
  current_rank,
  left_volume,
  right_volume,
  (SELECT COUNT(*) FROM user_packages WHERE user_id = users.id AND status = 'active') as active_packages,
  (SELECT COUNT(*) FROM mlm_transactions WHERE user_id = users.id) as total_transactions
FROM users
WHERE total_investment = 10000.00
ORDER BY created_at DESC
LIMIT 1;

-- Show transactions
SELECT
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
