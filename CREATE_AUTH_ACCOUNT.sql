-- ============================================================================
-- CREATE AUTH ACCOUNT for user@finaster.com
-- ============================================================================

-- IMPORTANT: You need to create this user via Supabase Dashboard because
-- we cannot directly insert into auth.users via SQL for security reasons.

-- STEP 1: Go to Supabase Dashboard
-- Navigate to: Authentication → Users → "Invite" button

-- STEP 2: Create user with these credentials:
-- Email: user@finaster.com
-- Password: user123
-- ✅ Check "Auto Confirm User" (IMPORTANT!)

-- STEP 3: After creation, you'll see the new user's ID in the dashboard
-- Copy that ID, then run this to link the auth account to our existing data:

-- Replace NEW_AUTH_USER_ID with the ID from dashboard
DO $$
DECLARE
  v_new_auth_id UUID := 'PASTE_NEW_USER_ID_HERE'; -- Replace this!
  v_old_user_id UUID := '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
BEGIN
  -- Update the user record to match the new auth ID
  UPDATE users
  SET id = v_new_auth_id
  WHERE id = v_old_user_id;

  -- Update related tables
  UPDATE user_packages
  SET user_id = v_new_auth_id
  WHERE user_id = v_old_user_id;

  UPDATE mlm_transactions
  SET user_id = v_new_auth_id
  WHERE user_id = v_old_user_id;

  RAISE NOTICE 'Auth account linked successfully!';
END $$;

-- ============================================================================
-- ALTERNATIVE FASTER METHOD: Use existing auth user
-- ============================================================================
-- Instead of creating new auth user, let's find existing ones and use those!

-- Run this query to see what auth users already exist:
SELECT
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.created_at,
  u.full_name,
  u.total_earnings
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC
LIMIT 20;

-- Once you tell me what emails exist, I can:
-- 1. Update the Quick Login button to use an existing email
-- 2. Transfer the $1,500 to that existing user
-- 3. You'll be able to login immediately!
