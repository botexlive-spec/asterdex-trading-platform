-- ============================================================================
-- FIX BY EXACT USER ID (from browser console)
-- User ID: 4a6ee960-ddf0-4daf-a029-e2e5a13d8f87
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID := '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
  v_user_email TEXT;
  v_package_id UUID;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FIXING USER: %', v_user_id;
  RAISE NOTICE '============================================';

  -- Verify user exists
  SELECT email INTO v_user_email
  FROM users
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'ERROR: User % not found!', v_user_id;
  END IF;

  RAISE NOTICE 'Found user: %', v_user_email;

  -- Get or create a package
  SELECT id INTO v_package_id FROM packages LIMIT 1;

  IF v_package_id IS NULL THEN
    RAISE NOTICE 'Creating default package...';

    INSERT INTO packages (
      name,
      price,
      daily_roi_percentage,
      duration_days,
      total_roi_percentage,
      description,
      status,
      created_at
    ) VALUES (
      'Standard Package',
      10000.00,
      5.00,
      40,
      200.00,
      'Standard investment package',
      'active',
      NOW()
    ) RETURNING id INTO v_package_id;

    RAISE NOTICE '✅ Default package created';
  END IF;

  -- Clean existing data
  DELETE FROM user_packages WHERE user_id = v_user_id;
  DELETE FROM mlm_transactions WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Cleaned old data';

  -- CREATE PACKAGE
  RAISE NOTICE '';
  RAISE NOTICE 'Creating user package...';

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

  RAISE NOTICE '✅ Package created: $10,000 investment, $500 daily ROI';

  -- CREATE ROI TRANSACTION
  RAISE NOTICE '';
  RAISE NOTICE 'Creating ROI transaction...';

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
    500.00,
    'Daily ROI from package',
    'completed',
    NOW()
  );

  RAISE NOTICE '✅ ROI transaction created: $500';

  -- CREATE COMMISSION TRANSACTION
  RAISE NOTICE '';
  RAISE NOTICE 'Creating commission transaction...';

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

  RAISE NOTICE '✅ Commission transaction created: $1,000';

  -- UPDATE TOTAL EARNINGS
  RAISE NOTICE '';
  RAISE NOTICE 'Updating total_earnings...';

  UPDATE users
  SET total_earnings = 1500.00
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Total earnings set to $1,500';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DATA CREATION COMPLETE';
  RAISE NOTICE '============================================';

END $$;

-- VERIFICATION
SELECT
  id,
  email,
  full_name,
  total_investment,
  total_earnings,
  current_rank,
  (SELECT COUNT(*) FROM user_packages WHERE user_id = users.id AND status = 'active') as active_packages,
  (SELECT COUNT(*) FROM mlm_transactions WHERE user_id = users.id) as transactions
FROM users
WHERE id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- Show packages
SELECT
  investment_amount,
  daily_roi_amount,
  status,
  activation_date,
  expiry_date
FROM user_packages
WHERE user_id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- Show transactions
SELECT
  transaction_type,
  amount,
  description,
  status,
  created_at
FROM mlm_transactions
WHERE user_id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87'
ORDER BY created_at DESC;
