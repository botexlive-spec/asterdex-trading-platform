USE finaster_mlm;

-- Set parent user and node IDs
SET @parent_user_id = '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87';
SET @parent_node_id = 'd1a6e47a-fa38-41b8-9ce0-f3fe66323d67';

-- Create test user 1: Alice Johnson (left position under user@finaster.com)
SET @user1_id = UUID();
SET @user1_node_id = UUID();

INSERT INTO users (
  id, email, password_hash, full_name, role, sponsor_id, referral_code,
  wallet_balance, total_investment, total_earnings, roi_earnings, commission_earnings,
  kyc_status, email_verified, is_active, created_at, updated_at
) VALUES (
  @user1_id,
  'alice@test.com',
  '$2a$10$rFZq5YfJYZJYfJYZJYfJYOE7K1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5',
  'Alice Johnson',
  'user',
  @parent_user_id,
  CONCAT('ALCE', UNIX_TIMESTAMP()),
  500.00,
  500.00,
  50.00,
  25.00,
  25.00,
  'approved',
  true,
  true,
  DATE_SUB(NOW(), INTERVAL 5 DAY),
  DATE_SUB(NOW(), INTERVAL 5 DAY)
);

-- Create binary node for Alice (left child of parent)
INSERT INTO mlm_binary_node (
  id, referralId, parentId, leftChildId, rightChildId
) VALUES (
  @user1_node_id,
  @user1_id,
  @parent_node_id,
  NULL,
  NULL
);

-- Update parent's leftChildId
UPDATE mlm_binary_node
SET leftChildId = @user1_node_id
WHERE id = @parent_node_id;

-- Create test user 2: Bob Smith (right position under user@finaster.com)
SET @user2_id = UUID();
SET @user2_node_id = UUID();

INSERT INTO users (
  id, email, password_hash, full_name, role, sponsor_id, referral_code,
  wallet_balance, total_investment, total_earnings, roi_earnings, commission_earnings,
  kyc_status, email_verified, is_active, created_at, updated_at
) VALUES (
  @user2_id,
  'bob@test.com',
  '$2a$10$rFZq5YfJYZJYfJYZJYfJYOE7K1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5',
  'Bob Smith',
  'user',
  @parent_user_id,
  CONCAT('BOBS', UNIX_TIMESTAMP()),
  750.00,
  750.00,
  75.00,
  40.00,
  35.00,
  'approved',
  true,
  true,
  DATE_SUB(NOW(), INTERVAL 3 DAY),
  DATE_SUB(NOW(), INTERVAL 3 DAY)
);

-- Create binary node for Bob (right child of parent)
INSERT INTO mlm_binary_node (
  id, referralId, parentId, leftChildId, rightChildId
) VALUES (
  @user2_node_id,
  @user2_id,
  @parent_node_id,
  NULL,
  NULL
);

-- Update parent's rightChildId
UPDATE mlm_binary_node
SET rightChildId = @user2_node_id
WHERE id = @parent_node_id;

-- Create test user 3: Charlie Brown (left position under Alice)
SET @user3_id = UUID();
SET @user3_node_id = UUID();

INSERT INTO users (
  id, email, password_hash, full_name, role, sponsor_id, referral_code,
  wallet_balance, total_investment, total_earnings, roi_earnings, commission_earnings,
  kyc_status, email_verified, is_active, created_at, updated_at
) VALUES (
  @user3_id,
  'charlie@test.com',
  '$2a$10$rFZq5YfJYZJYfJYZJYfJYOE7K1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5',
  'Charlie Brown',
  'user',
  @user1_id,  -- Sponsored by Alice
  CONCAT('CHAR', UNIX_TIMESTAMP()),
  300.00,
  300.00,
  30.00,
  15.00,
  15.00,
  'approved',
  true,
  true,
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- Create binary node for Charlie (left child of Alice)
INSERT INTO mlm_binary_node (
  id, referralId, parentId, leftChildId, rightChildId
) VALUES (
  @user3_node_id,
  @user3_id,
  @user1_node_id,  -- Parent is Alice's node
  NULL,
  NULL
);

-- Update Alice's leftChildId
UPDATE mlm_binary_node
SET leftChildId = @user3_node_id
WHERE id = @user1_node_id;

-- Display results
SELECT
  'Users Created' as Summary,
  COUNT(*) as Count
FROM users
WHERE email IN ('alice@test.com', 'bob@test.com', 'charlie@test.com');

SELECT
  'Binary Nodes Created' as Summary,
  COUNT(*) as Count
FROM mlm_binary_node bn
JOIN users u ON bn.referralId = u.id
WHERE u.email IN ('alice@test.com', 'bob@test.com', 'charlie@test.com');

-- Show the team hierarchy
SELECT
  u.email,
  u.full_name,
  u.total_investment,
  u.wallet_balance,
  sponsor.email as sponsor_email,
  bn.parentId as parent_node_id
FROM users u
LEFT JOIN users sponsor ON u.sponsor_id = sponsor.id
LEFT JOIN mlm_binary_node bn ON bn.referralId = u.id
WHERE u.email IN ('user@finaster.com', 'alice@test.com', 'bob@test.com', 'charlie@test.com')
ORDER BY u.created_at;
