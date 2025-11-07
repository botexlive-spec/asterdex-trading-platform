-- Find John Doe user details
SELECT
  id,
  email,
  full_name,
  total_investment,
  total_earnings,
  current_rank,
  wallet_balance,
  created_at
FROM users
WHERE full_name = 'John Doe'
   OR email ILIKE '%john%'
   OR email ILIKE '%doe%'
ORDER BY created_at DESC
LIMIT 5;

-- Also check if test-e2e user exists and was updated
SELECT
  id,
  email,
  full_name,
  total_investment,
  total_earnings,
  current_rank,
  wallet_balance
FROM users
WHERE email = 'test-e2e-1762258004006@example.com';
