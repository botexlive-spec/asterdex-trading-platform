-- ============================================================================
-- SEED DATA - MySQL Format
-- ============================================================================

USE finaster_mlm;

-- Insert Ranks
INSERT INTO ranks (name, rank_type, min_investment, min_team_volume, reward_amount, badge_color, gradient_from, gradient_to, sort_order, benefits) VALUES
  ('Starter', 'starter', 0, 0, 0, '#10b981', '#10b981', '#059669', 1, '{"description": "Entry level rank"}'),
  ('Bronze', 'bronze', 250, 1000, 100, '#cd7f32', '#cd7f32', '#a86a2a', 2, '{"description": "First achievement rank"}'),
  ('Silver', 'silver', 1000, 5000, 500, '#c0c0c0', '#c0c0c0', '#a8a8a8', 3, '{"description": "Silver tier benefits"}'),
  ('Gold', 'gold', 5000, 25000, 2500, '#ffd700', '#ffd700', '#ffb700', 4, '{"description": "Gold tier benefits"}'),
  ('Platinum', 'platinum', 20000, 100000, 10000, '#e5e4e2', '#e5e4e2', '#c5c4c2', 5, '{"description": "Platinum tier benefits"}'),
  ('Diamond', 'diamond', 50000, 500000, 50000, '#b9f2ff', '#b9f2ff', '#99d2df', 6, '{"description": "Diamond tier benefits"}'),
  ('Crown Diamond', 'crown_diamond', 100000, 2000000, 200000, '#4169e1', '#4169e1', '#2149c1', 7, '{"description": "Crown Diamond tier"}'),
  ('Royal Diamond', 'royal_diamond', 250000, 10000000, 1000000, '#8b00ff', '#8b00ff', '#6b00cf', 8, '{"description": "Royal Diamond tier"}'),
  ('Presidential', 'presidential', 500000, 50000000, 5000000, '#ff1493', '#ff1493', '#df1473', 9, '{"description": "Presidential tier"}'),
  ('Ambassador', 'ambassador', 1000000, 100000000, 21000000, '#ff0000', '#ff0000', '#df0000', 10, '{"description": "Highest achievement"}');

-- Insert Packages
INSERT INTO packages (name, min_investment, max_investment, daily_roi_percentage, duration_days, level_income_percentages, matching_bonus_percentage, is_active) VALUES
  (
    'Starter Package',
    100,
    500,
    5.00,
    40,
    '[10, 5, 3, 2, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]',
    10.00,
    true
  ),
  (
    'Professional Package',
    500,
    2000,
    5.00,
    40,
    '[10, 5, 3, 2, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]',
    10.00,
    true
  ),
  (
    'VIP Package',
    2000,
    10000,
    5.00,
    40,
    '[10, 5, 3, 2, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]',
    10.00,
    true
  );

-- Insert Admin User
-- Password: admin123 (bcrypt hash)
INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  referral_code,
  wallet_balance,
  total_earnings,
  total_investment,
  current_rank,
  email_verified
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@finaster.com',
  '$2b$10$.xkAAqeCn.4na.x/G6NFAOEY10vOz0gM80Y/JLyhhLGYo7aqDFcoi',
  'System Administrator',
  'admin',
  'ADMIN001',
  0,
  0,
  0,
  'ambassador',
  true
);

-- Insert Test User (John Doe) with $1,500 earnings
-- Password: user123 (bcrypt hash)
INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  sponsor_id,
  referral_code,
  wallet_balance,
  total_earnings,
  total_investment,
  current_rank,
  left_volume,
  right_volume,
  email_verified
) VALUES (
  '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87',
  'user@finaster.com',
  '$2b$10$BhLYDRj5ZZYwUapxDMu4aOehJYhADiPVQLrEiqjXVFC2tfC3Whh4G',
  'John Doe',
  'user',
  '00000000-0000-0000-0000-000000000001',
  'JOHNDOE001',
  1500.00,
  1500.00,
  10000.00,
  'gold',
  16000.00,
  16000.00,
  true
);

-- Insert User's Package
INSERT INTO user_packages (
  user_id,
  package_id,
  investment_amount,
  daily_roi_amount,
  total_roi_earned,
  total_roi_limit,
  status,
  activation_date,
  expiry_date,
  last_roi_distribution
) VALUES (
  '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87',
  (SELECT id FROM packages WHERE name = 'VIP Package' LIMIT 1),
  10000.00,
  500.00,
  500.00,
  20000.00,
  'active',
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  DATE_ADD(NOW(), INTERVAL 39 DAY),
  DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- Insert User's Transactions
INSERT INTO mlm_transactions (
  user_id,
  transaction_type,
  amount,
  description,
  status
) VALUES
  (
    '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87',
    'roi_distribution',
    500.00,
    'Daily ROI from VIP Package',
    'completed'
  ),
  (
    '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87',
    'level_income',
    1000.00,
    'Level 1 commission from downline',
    'completed'
  );

-- Create 10 downline users for John Doe
-- Using a stored procedure for MySQL
DELIMITER $$

CREATE PROCEDURE create_downline_users()
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE user_uuid VARCHAR(36);

  WHILE i <= 10 DO
    SET user_uuid = UUID();

    INSERT INTO users (
      id,
      email,
      password_hash,
      full_name,
      role,
      sponsor_id,
      referral_code,
      wallet_balance,
      total_earnings,
      total_investment,
      current_rank,
      email_verified
    ) VALUES (
      user_uuid,
      CONCAT('downline', i, '@finaster.com'),
      '$2b$10$BhLYDRj5ZZYwUapxDMu4aOehJYhADiPVQLrEiqjXVFC2tfC3Whh4G',
      CONCAT('Downline User ', i),
      'user',
      '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87',
      CONCAT('DOWNLINE', LPAD(i, 3, '0')),
      0,
      0,
      1000.00,
      'bronze',
      true
    );

    -- Add package for each downline
    INSERT INTO user_packages (
      user_id,
      package_id,
      investment_amount,
      daily_roi_amount,
      total_roi_earned,
      total_roi_limit,
      status,
      activation_date,
      expiry_date
    ) VALUES (
      user_uuid,
      (SELECT id FROM packages WHERE name = 'Starter Package' LIMIT 1),
      1000.00,
      50.00,
      0,
      2000.00,
      'active',
      DATE_SUB(NOW(), INTERVAL 1 DAY),
      DATE_ADD(NOW(), INTERVAL 39 DAY)
    );

    SET i = i + 1;
  END WHILE;
END$$

DELIMITER ;

-- Execute the procedure
CALL create_downline_users();

-- Drop the procedure after use
DROP PROCEDURE create_downline_users;
