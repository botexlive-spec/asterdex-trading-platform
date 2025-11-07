-- ============================================================================
-- CREATE MISSING AUTH USER for user@finaster.com
-- ============================================================================

-- Step 1: Check current status
SELECT 'Current Status:' as info;
SELECT
  u.id,
  u.email,
  u.full_name,
  u.total_earnings,
  CASE WHEN au.id IS NULL THEN 'NO AUTH ❌' ELSE 'HAS AUTH ✓' END as auth_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'user@finaster.com';

-- ============================================================================
-- MANUAL CREATION (Required - SQL cannot directly create auth users)
-- ============================================================================

-- You MUST create the auth user via Supabase Dashboard:

-- 1. Open: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to: Authentication → Users (left sidebar)
-- 4. Click: "Invite" or "Add User" button
-- 5. Fill in:
--    Email: user@finaster.com
--    Password: user123
--    ☑️ Auto Confirm User: YES (CHECK THIS BOX!)
-- 6. Click "Create User"

-- After creation, you will get a NEW user ID from the dashboard.
-- That new ID will be DIFFERENT from: 4a6ee960-ddf0-4daf-a029-e2e5a13d8f87

-- ============================================================================
-- STEP 2: Link the new auth user to existing data
-- ============================================================================

-- After creating the auth user in the dashboard, run this SQL:
-- (Replace NEW_USER_ID_FROM_DASHBOARD with the actual ID)

DO $$
DECLARE
  v_new_auth_id UUID := 'PASTE_NEW_USER_ID_FROM_DASHBOARD_HERE'; -- ⚠️ REPLACE THIS!
  v_old_user_id UUID := '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
  v_row_count INT;
BEGIN
  -- Update users table
  UPDATE users
  SET id = v_new_auth_id
  WHERE id = v_old_user_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RAISE NOTICE 'Updated % row(s) in users table', v_row_count;

  -- Update user_packages
  UPDATE user_packages
  SET user_id = v_new_auth_id
  WHERE user_id = v_old_user_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RAISE NOTICE 'Updated % row(s) in user_packages table', v_row_count;

  -- Update mlm_transactions
  UPDATE mlm_transactions
  SET user_id = v_new_auth_id
  WHERE user_id = v_old_user_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RAISE NOTICE 'Updated % row(s) in mlm_transactions table', v_row_count;

  -- Update any sponsor_id references
  UPDATE users
  SET sponsor_id = v_new_auth_id
  WHERE sponsor_id = v_old_user_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RAISE NOTICE 'Updated % sponsor references', v_row_count;

  RAISE NOTICE '✓ Auth account linked successfully!';
END $$;

-- ============================================================================
-- STEP 3: Verify everything is linked correctly
-- ============================================================================

SELECT 'Verification:' as info;

-- Check user record
SELECT
  u.id,
  u.email,
  u.full_name,
  u.total_earnings,
  u.current_rank,
  CASE WHEN au.id IS NULL THEN 'NO AUTH ❌' ELSE 'HAS AUTH ✓' END as auth_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'user@finaster.com';

-- Check packages
SELECT COUNT(*) as package_count
FROM user_packages
WHERE user_id = (SELECT id FROM users WHERE email = 'user@finaster.com');

-- Check transactions
SELECT COUNT(*) as transaction_count
FROM mlm_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'user@finaster.com');

-- ============================================================================
-- ALTERNATIVE: Quick test with existing auth user
-- ============================================================================

-- If you want to test immediately, run this to see ALL auth users:
SELECT
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as confirmed,
  au.created_at
FROM auth.users au
ORDER BY au.created_at DESC;

-- If there's an existing auth user you want to use instead:
-- 1. Tell me their email
-- 2. I'll update the Quick Login button
-- 3. I'll transfer the $1,500 to that account
-- 4. You can login immediately!
