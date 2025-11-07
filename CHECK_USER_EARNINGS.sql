-- Simple query to check user earnings
SELECT
  id,
  email,
  full_name,
  total_earnings,
  total_investment,
  wallet_balance,
  current_rank
FROM users
WHERE id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
