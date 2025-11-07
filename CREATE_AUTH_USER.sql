-- ============================================================================
-- CREATE AUTH USER for user@finaster.com
-- ============================================================================
-- NOTE: This script helps diagnose the auth issue.
-- To create the actual auth user, you need to use Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add User"
-- 3. Email: user@finaster.com
-- 4. Password: user123
-- 5. Check "Auto Confirm Email"
-- 6. After creation, run the UPDATE below to link it to existing data

-- First, check what auth users exist
SELECT 'Existing Auth Users:' as info;
SELECT
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.created_at
FROM auth.users au
ORDER BY au.created_at DESC
LIMIT 10;

-- Check if user@finaster.com exists in auth.users
SELECT 'Checking for user@finaster.com in auth.users:' as info;
SELECT
  id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'user@finaster.com';

-- Check the users table record we've been fixing
SELECT 'Current users table record:' as info;
SELECT
  id,
  email,
  full_name,
  total_earnings,
  current_rank
FROM users
WHERE id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- ============================================================================
-- MANUAL STEPS TO CREATE AUTH USER:
-- ============================================================================
-- Since we can't directly insert into auth.users, you must:
--
-- Option A: Create via Supabase Dashboard
-- 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/users
-- 2. Click "Add User" (invite user button)
-- 3. Enter:
--    - Email: user@finaster.com
--    - Password: user123
--    - Auto Confirm Email: YES (check this box)
-- 4. Copy the new user's ID
-- 5. Run this UPDATE to link to existing data:
--
--    UPDATE users
--    SET id = 'NEW_USER_ID_FROM_DASHBOARD'
--    WHERE id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
--
-- Option B: Use existing auth user (EASIER)
-- If you already have test users in auth.users, we can:
-- 1. Find their email from the query above
-- 2. Update the Quick Login button to use that email
-- 3. Transfer the $1,500 earnings to that user
--
-- Tell me which auth.users exist and I'll update the code accordingly!
