-- Check what users exist in auth.users table
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Check if user@asterdex.com exists
SELECT
  id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'user@asterdex.com';

-- Check if user@finaster.com exists
SELECT
  id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'user@finaster.com';

-- Find the user with our target ID
SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  u.full_name,
  u.total_earnings
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
