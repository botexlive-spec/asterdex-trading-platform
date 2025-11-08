-- ============================================================================
-- BUSINESS LOGIC REDESIGN - Database Schema Updates
-- ============================================================================
-- This migration adds support for:
-- - Plan toggles (Binary, Generation, Robot, Investment)
-- - ROI-on-ROI distribution
-- - Booster income
-- - Principal withdrawal with deductions
-- - Monthly rewards
-- ============================================================================

USE finaster_mlm;

-- ============================================================================
-- 1. PLAN SETTINGS TABLE
-- ============================================================================
-- Stores dynamic configuration for all plans and features
CREATE TABLE IF NOT EXISTS plan_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(100) UNIQUE NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  payload JSON NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_feature_key (feature_key),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Seed initial plan settings
INSERT INTO plan_settings (feature_key, feature_name, is_active, payload, description) VALUES
('binary_plan', 'Binary Plan', TRUE, JSON_OBJECT(
  'matching_bonus_percentage', 10.00,
  'carry_forward_enabled', TRUE,
  'min_binary_points', 0
), 'Binary MLM plan with left/right leg matching bonus'),

('generation_plan', 'Generation Plan (Level Income)', TRUE, JSON_OBJECT(
  'level_percentages', JSON_ARRAY(12, 10, 8, 5, 4, 4, 3, 3, 2, 2, 3, 3, 4, 4, 8),
  'level_unlock_rules', JSON_OBJECT(
    '1', 1, '2', 2, '3', 3, '4', 4, '5', 5,
    '6', 6, '7', 7, '8', 8, '9', 9, '10', 9,
    '11', 10, '12', 10, '13', 10, '14', 10, '15', 10
  ),
  'distribution_type', 'roi_on_roi'
), 'Generation plan with level unlocking based on direct referrals'),

('robot_plan', 'Robot Subscription', TRUE, JSON_OBJECT(
  'subscription_fee', 100.00,
  'duration_days', 365,
  'required_for_investment', FALSE
), 'Robot subscription plan'),

('investment_plan', 'Investment Packages', TRUE, JSON_OBJECT(
  'base_amount', 100.00,
  'multiples_only', TRUE,
  'daily_roi_percentage', 5.00,
  'duration_days', 40,
  'max_investment_per_user', 100000.00
), 'Investment package configuration'),

('booster_income', 'Booster Income', TRUE, JSON_OBJECT(
  'countdown_days', 30,
  'required_directs', 3,
  'bonus_roi_percentage', 0.1,
  'auto_disable_after_countdown', TRUE
), 'Booster income for achieving directs within timeframe'),

('principal_withdrawal', 'Principal Withdrawal', TRUE, JSON_OBJECT(
  'deduction_before_30_days', 15.00,
  'deduction_after_30_days', 5.00,
  'minimum_withdrawal', 50.00
), 'Principal withdrawal with time-based deductions'),

('monthly_rewards', 'Monthly Rewards', TRUE, JSON_OBJECT(
  'leg_ratio', JSON_ARRAY(40, 40, 20),
  'calculation_period', 'monthly',
  'volume_reset', TRUE
), 'Monthly rewards based on 3-leg business volume');


-- ============================================================================
-- 2. REWARDS TABLE
-- ============================================================================
-- Stores monthly reward milestones
CREATE TABLE IF NOT EXISTS rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  target_volume DECIMAL(15, 6) NOT NULL,
  reward_amount DECIMAL(15, 6) NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_month_year (month, year),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- Seed initial rewards
INSERT INTO rewards (name, target_volume, reward_amount, month, year, status, description) VALUES
('Bronze Achiever', 10000.00, 500.00, MONTH(CURDATE()), YEAR(CURDATE()), 'active', 'Achieve $10,000 in 3-leg business volume'),
('Silver Leader', 50000.00, 2500.00, MONTH(CURDATE()), YEAR(CURDATE()), 'active', 'Achieve $50,000 in 3-leg business volume'),
('Gold Champion', 100000.00, 10000.00, MONTH(CURDATE()), YEAR(CURDATE()), 'active', 'Achieve $100,000 in 3-leg business volume'),
('Platinum Elite', 500000.00, 50000.00, MONTH(CURDATE()), YEAR(CURDATE()), 'active', 'Achieve $500,000 in 3-leg business volume');


-- ============================================================================
-- 3. BOOSTERS TABLE
-- ============================================================================
-- Tracks booster income status for users
CREATE TABLE IF NOT EXISTS boosters (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  direct_count INT DEFAULT 0,
  target_directs INT DEFAULT 3,
  bonus_roi_percentage DECIMAL(5, 2) DEFAULT 0.1,
  status ENUM('active', 'achieved', 'expired') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date)
) ENGINE=InnoDB;


-- ============================================================================
-- 4. WITHDRAWALS TABLE
-- ============================================================================
-- Tracks withdrawal requests with deductions
CREATE TABLE IF NOT EXISTS withdrawals (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  withdrawal_type ENUM('roi', 'principal', 'commission', 'bonus') NOT NULL,
  requested_amount DECIMAL(15, 6) NOT NULL,
  deduction_percentage DECIMAL(5, 2) DEFAULT 0.00,
  deduction_amount DECIMAL(15, 6) DEFAULT 0.00,
  final_amount DECIMAL(15, 6) NOT NULL,
  wallet_address VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  rejection_reason TEXT,
  investment_date TIMESTAMP,
  withdrawal_date TIMESTAMP,
  days_held INT,
  approved_by VARCHAR(36),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_withdrawal_type (withdrawal_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;


-- ============================================================================
-- 5. USER BUSINESS VOLUMES TABLE
-- ============================================================================
-- Tracks monthly business volumes for 3-leg calculation
CREATE TABLE IF NOT EXISTS user_business_volumes (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  leg1_volume DECIMAL(15, 6) DEFAULT 0.00,
  leg2_volume DECIMAL(15, 6) DEFAULT 0.00,
  leg3_volume DECIMAL(15, 6) DEFAULT 0.00,
  total_volume DECIMAL(15, 6) DEFAULT 0.00,
  qualified_volume DECIMAL(15, 6) DEFAULT 0.00,
  reward_earned DECIMAL(15, 6) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_month_year (user_id, month, year),
  INDEX idx_month_year (month, year)
) ENGINE=InnoDB;


-- ============================================================================
-- 6. LEVEL UNLOCKS TABLE
-- ============================================================================
-- Tracks which levels are unlocked for each user based on directs
CREATE TABLE IF NOT EXISTS level_unlocks (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  direct_count INT DEFAULT 0,
  unlocked_levels INT DEFAULT 0,
  level_1_unlocked BOOLEAN DEFAULT FALSE,
  level_2_unlocked BOOLEAN DEFAULT FALSE,
  level_3_unlocked BOOLEAN DEFAULT FALSE,
  level_4_unlocked BOOLEAN DEFAULT FALSE,
  level_5_unlocked BOOLEAN DEFAULT FALSE,
  level_6_unlocked BOOLEAN DEFAULT FALSE,
  level_7_unlocked BOOLEAN DEFAULT FALSE,
  level_8_unlocked BOOLEAN DEFAULT FALSE,
  level_9_unlocked BOOLEAN DEFAULT FALSE,
  level_10_unlocked BOOLEAN DEFAULT FALSE,
  level_11_unlocked BOOLEAN DEFAULT FALSE,
  level_12_unlocked BOOLEAN DEFAULT FALSE,
  level_13_unlocked BOOLEAN DEFAULT FALSE,
  level_14_unlocked BOOLEAN DEFAULT FALSE,
  level_15_unlocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_level_unlock (user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_direct_count (direct_count)
) ENGINE=InnoDB;


-- ============================================================================
-- 7. UPDATE USERS TABLE
-- ============================================================================
-- Add new columns for tracking ROI-on-ROI and booster earnings
ALTER TABLE users
ADD COLUMN roi_on_roi_earnings DECIMAL(15, 6) DEFAULT 0.00,
ADD COLUMN booster_earnings DECIMAL(15, 6) DEFAULT 0.00,
ADD COLUMN reward_earnings DECIMAL(15, 6) DEFAULT 0.00,
ADD COLUMN first_investment_date TIMESTAMP NULL,
ADD COLUMN direct_referrals_count INT DEFAULT 0;


-- ============================================================================
-- 8. UPDATE USER_PACKAGES TABLE
-- ============================================================================
-- Add columns for booster tracking
ALTER TABLE user_packages
ADD COLUMN has_booster BOOLEAN DEFAULT FALSE,
ADD COLUMN booster_roi_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN effective_daily_roi DECIMAL(15, 6) GENERATED ALWAYS AS
  (daily_roi_amount * (1 + booster_roi_percentage / 100)) STORED;


-- ============================================================================
-- 9. UPDATE PACKAGES TABLE
-- ============================================================================
-- Enforce $100 base and multiples only
ALTER TABLE packages
ADD COLUMN base_amount DECIMAL(15, 6) DEFAULT 100.00,
ADD COLUMN multiples_only BOOLEAN DEFAULT TRUE;

-- Update existing packages to enforce $100 multiples
UPDATE packages
SET base_amount = 100.00,
    multiples_only = TRUE,
    min_investment = 100.00;


-- ============================================================================
-- 10. UPDATE MLM_TRANSACTIONS TABLE
-- ============================================================================
-- Add new transaction types
ALTER TABLE mlm_transactions
MODIFY COLUMN transaction_type ENUM(
  'deposit', 'withdrawal', 'level_income', 'matching_bonus',
  'roi_distribution', 'rank_reward', 'referral_bonus', 'binary_bonus',
  'roi_on_roi', 'booster_roi', 'monthly_reward', 'principal_withdrawal'
) NOT NULL;


-- ============================================================================
-- 11. UPDATE COMMISSIONS TABLE
-- ============================================================================
-- Add new commission types
ALTER TABLE commissions
MODIFY COLUMN commission_type ENUM(
  'level_income', 'matching_bonus', 'referral_bonus', 'binary_bonus',
  'roi_on_roi', 'booster_commission', 'monthly_reward'
) NOT NULL;


-- ============================================================================
-- 12. CREATE STORED PROCEDURE: Update Level Unlocks
-- ============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS update_level_unlocks$$

CREATE PROCEDURE update_level_unlocks(IN p_user_id VARCHAR(36))
BEGIN
  DECLARE v_direct_count INT;
  DECLARE v_unlocked_levels INT DEFAULT 0;

  -- Get current direct referrals count
  SELECT COUNT(*) INTO v_direct_count
  FROM users
  WHERE sponsor_id = p_user_id AND is_active = TRUE;

  -- Calculate unlocked levels based on directs
  SET v_unlocked_levels = CASE
    WHEN v_direct_count >= 10 THEN 15
    WHEN v_direct_count >= 9 THEN 10
    WHEN v_direct_count >= 8 THEN 8
    WHEN v_direct_count >= 7 THEN 7
    WHEN v_direct_count >= 6 THEN 6
    WHEN v_direct_count >= 5 THEN 5
    WHEN v_direct_count >= 4 THEN 4
    WHEN v_direct_count >= 3 THEN 3
    WHEN v_direct_count >= 2 THEN 2
    WHEN v_direct_count >= 1 THEN 1
    ELSE 0
  END;

  -- Insert or update level_unlocks
  INSERT INTO level_unlocks (
    user_id, direct_count, unlocked_levels,
    level_1_unlocked, level_2_unlocked, level_3_unlocked, level_4_unlocked,
    level_5_unlocked, level_6_unlocked, level_7_unlocked, level_8_unlocked,
    level_9_unlocked, level_10_unlocked, level_11_unlocked, level_12_unlocked,
    level_13_unlocked, level_14_unlocked, level_15_unlocked
  ) VALUES (
    p_user_id, v_direct_count, v_unlocked_levels,
    v_unlocked_levels >= 1, v_unlocked_levels >= 2, v_unlocked_levels >= 3,
    v_unlocked_levels >= 4, v_unlocked_levels >= 5, v_unlocked_levels >= 6,
    v_unlocked_levels >= 7, v_unlocked_levels >= 8, v_unlocked_levels >= 9,
    v_unlocked_levels >= 10, v_unlocked_levels >= 11, v_unlocked_levels >= 12,
    v_unlocked_levels >= 13, v_unlocked_levels >= 14, v_unlocked_levels >= 15
  )
  ON DUPLICATE KEY UPDATE
    direct_count = v_direct_count,
    unlocked_levels = v_unlocked_levels,
    level_1_unlocked = v_unlocked_levels >= 1,
    level_2_unlocked = v_unlocked_levels >= 2,
    level_3_unlocked = v_unlocked_levels >= 3,
    level_4_unlocked = v_unlocked_levels >= 4,
    level_5_unlocked = v_unlocked_levels >= 5,
    level_6_unlocked = v_unlocked_levels >= 6,
    level_7_unlocked = v_unlocked_levels >= 7,
    level_8_unlocked = v_unlocked_levels >= 8,
    level_9_unlocked = v_unlocked_levels >= 9,
    level_10_unlocked = v_unlocked_levels >= 10,
    level_11_unlocked = v_unlocked_levels >= 11,
    level_12_unlocked = v_unlocked_levels >= 12,
    level_13_unlocked = v_unlocked_levels >= 13,
    level_14_unlocked = v_unlocked_levels >= 14,
    level_15_unlocked = v_unlocked_levels >= 15,
    updated_at = NOW();

  -- Update users table
  UPDATE users
  SET direct_referrals_count = v_direct_count
  WHERE id = p_user_id;
END$$

DELIMITER ;


-- ============================================================================
-- 13. CREATE TRIGGER: Update Level Unlocks on New Referral
-- ============================================================================
DELIMITER $$

DROP TRIGGER IF EXISTS after_user_insert_update_levels$$

CREATE TRIGGER after_user_insert_update_levels
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.sponsor_id IS NOT NULL THEN
    CALL update_level_unlocks(NEW.sponsor_id);
  END IF;
END$$

DELIMITER ;


-- ============================================================================
-- 14. VERIFICATION QUERIES
-- ============================================================================
SELECT 'Database schema updated successfully' AS status;
SELECT COUNT(*) AS plan_settings_count FROM plan_settings;
SELECT COUNT(*) AS rewards_count FROM rewards;

-- Show plan settings
SELECT feature_key, feature_name, is_active FROM plan_settings;
