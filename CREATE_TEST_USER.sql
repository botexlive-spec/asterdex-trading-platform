-- ============================================================================
-- CREATE TEST USER with working credentials
-- ============================================================================

-- First, check what auth method is being used
SELECT id, email FROM auth.users LIMIT 5;

-- Check John Doe's auth.users record
SELECT
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'user@finaster.com';

-- Alternative: Try to find the user's actual email
SELECT DISTINCT
  u.id,
  u.email,
  au.email as auth_email,
  u.full_name
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
