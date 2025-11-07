-- ============================================================================
-- SEED DATA - MySQL Version
-- ============================================================================

USE finaster_mlm;

-- Insert Ranks
INSERT INTO ranks (name, rank_type, min_investment, min_team_volume, reward_amount, badge_color, gradient_from, gradient_to, sort_order, benefits) VALUES
  ('Starter', 'starter', 0, 0, 0, '#10b981', '#10b981', '#059669', 1, '{"description": "Entry level rank"}'),
  ('Bronze', 'bronze', 250, 1000, 100, '#cd7f32', '#cd7f32', '#a86a2a', 2, '{"description": "First achievement rank"}'),
  ('Silver', 'silver', 1000, 5000, 500, '#c0c0c0', '#c0c0c0', '#a8a8a8', 3, '{"description": "Silver tier benefits"}'),
  ('Gold', 'gold', 5000, 25000, 2500, '#ffd700', '#ffd700', '#ffb700', 4, '{"description": "Gold tier benefits"}'),
  ('Platinum', 'platinum', 20000, 100000, 10000, '#e5e4e2', '#e5e4e2', '#c5c4c2', 5, '{"description": "Platinum tier benefits"}');

-- Insert Packages
INSERT INTO packages (name, min_investment, max_investment, daily_roi_percentage, duration_days, level_income_percentages, matching_bonus_percentage, is_active) VALUES
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

-- Insert Admin User (password: admin123)
INSERT INTO users (id, email, password_hash, full_name, role, referral_code, email_verified, current_rank) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@finaster.com', '$2a$10$rKZqE1qH7YvF5xE3Z8F.6OxN1YZJGh3YnB.WX7F9h0F8Z1F3Z8F.6O', 'System Administrator', 'admin', 'ADMIN001', true, 'ambassador');

-- Insert Test User John Doe (password: user123) with $1,500
INSERT INTO users (
  id, email, password_hash, full_name, role, sponsor_id, referral_code,
  wallet_balance, total_earnings, total_investment, current_rank,
  left_volume, right_volume, email_verified
) VALUES (
  '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87',
  'user@finaster.com',
  '$2a$10$rKZqE1qH7YvF5xE3Z8F.6OxN1YZJGh3YnB.WX7F9h0F8Z1F3Z8F.6O',
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

-- Insert package for John Doe
INSERT INTO user_packages (
  user_id, package_id, investment_amount, daily_roi_amount,
  total_roi_earned, total_roi_limit, status,
  activation_date, expiry_date, last_roi_distribution
) VALUES (
  '4a6ee960-ddf0-4daf-a029-e2e5a13d8f87',
  (SELECT id FROM packages LIMIT 1),
  10000.00,
  500.00,
  500.00,
  20000.00,
  'active',
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  DATE_ADD(NOW(), INTERVAL 39 DAY),
  DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- Insert transactions
INSERT INTO mlm_transactions (user_id, transaction_type, amount, description, status) VALUES
  ('4a6ee960-ddf0-4daf-a029-e2e5a13d8f87', 'roi_distribution', 500.00, 'Daily ROI from VIP Package', 'completed'),
  ('4a6ee960-ddf0-4daf-a029-e2e5a13d8f87', 'level_income', 1000.00, 'Level 1 commission', 'completed');
