USE finaster_mlm;

-- Fix admin@finaster.com password (admin123)
UPDATE users
SET password_hash = '$2b$10$.j7.Uwji.zDmgL11ryxTOOkVPb6GnMpY8aHzRMbZhXcsQWBxWaGFa'
WHERE email = 'admin@finaster.com';

-- Add or update admin@asterdex.com
INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  is_active,
  current_rank,
  total_earnings,
  wallet_balance,
  total_investment,
  referral_code,
  created_at,
  updated_at
) VALUES (
  'e1973e19-ec82-4149-bd6e-1cb19336d502',
  'admin@asterdex.com',
  '$2b$10$.j7.Uwji.zDmgL11ryxTOOkVPb6GnMpY8aHzRMbZhXcsQWBxWaGFa',
  'Admin User',
  'admin',
  true,
  'diamond',
  50000.00,
  100000.00,
  500000.00,
  'ADMIN001',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role);

-- Verify
SELECT email, LEFT(password_hash, 20) as hash_check, role
FROM users
WHERE email IN ('admin@finaster.com', 'admin@asterdex.com');
