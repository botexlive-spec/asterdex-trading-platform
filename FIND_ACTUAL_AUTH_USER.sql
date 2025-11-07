-- Find what auth.users records actually exist
SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  u.full_name,
  u.total_earnings
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC
LIMIT 20;

-- Check if our target user ID exists in auth.users
SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at
FROM auth.users au
WHERE au.id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';

-- Find users table records that might not have auth.users
SELECT
  u.id,
  u.email,
  u.full_name,
  u.total_earnings,
  CASE WHEN au.id IS NULL THEN 'NO AUTH' ELSE 'HAS AUTH' END as auth_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.total_earnings > 0
ORDER BY u.total_earnings DESC;
