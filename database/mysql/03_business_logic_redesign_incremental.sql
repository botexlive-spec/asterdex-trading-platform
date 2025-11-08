/**
 * Business Logic Redesign - Incremental Migration
 * Only applies missing changes (tables already created, need to add columns)
 */

USE finaster_mlm;

-- ===========================================
-- 1. UPDATE USERS TABLE
-- ===========================================
ALTER TABLE users
ADD COLUMN roi_on_roi_earnings DECIMAL(15, 6) DEFAULT 0.00,
ADD COLUMN booster_earnings DECIMAL(15, 6) DEFAULT 0.00,
ADD COLUMN reward_earnings DECIMAL(15, 6) DEFAULT 0.00,
ADD COLUMN first_investment_date TIMESTAMP NULL,
ADD COLUMN direct_referrals_count INT DEFAULT 0;

-- ===========================================
-- 2. UPDATE USER_PACKAGES TABLE
-- ===========================================
ALTER TABLE user_packages
ADD COLUMN has_booster BOOLEAN DEFAULT FALSE,
ADD COLUMN booster_roi_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN effective_daily_roi DECIMAL(15, 6) GENERATED ALWAYS AS
  (daily_roi_amount * (1 + booster_roi_percentage / 100)) STORED;

-- ===========================================
-- 3. UPDATE PACKAGES TABLE
-- ===========================================
ALTER TABLE packages
ADD COLUMN base_amount DECIMAL(15, 6) DEFAULT 100.00,
ADD COLUMN multiples_only BOOLEAN DEFAULT TRUE;

UPDATE packages
SET base_amount = 100.00,
    multiples_only = TRUE,
    min_investment = 100.00;

-- ===========================================
-- 4. UPDATE MLM_TRANSACTIONS TABLE
-- ===========================================
ALTER TABLE mlm_transactions
MODIFY COLUMN transaction_type ENUM(
  'deposit', 'withdrawal', 'level_income', 'matching_bonus',
  'roi_distribution', 'rank_reward', 'referral_bonus', 'binary_bonus',
  'roi_on_roi', 'booster_roi', 'monthly_reward', 'principal_withdrawal',
  'transfer_in', 'transfer_out'
) NOT NULL;

-- ===========================================
-- 5. UPDATE COMMISSIONS TABLE
-- ===========================================
ALTER TABLE commissions
MODIFY COLUMN commission_type ENUM(
  'level_income', 'matching_bonus', 'referral_bonus', 'binary_bonus',
  'roi_on_roi', 'booster_commission', 'monthly_reward'
) NOT NULL;

-- ===========================================
-- 6. CREATE STORED PROCEDURE FOR LEVEL UNLOCKS
-- ===========================================
DELIMITER $$

DROP PROCEDURE IF EXISTS update_level_unlocks$$

CREATE PROCEDURE update_level_unlocks(IN target_user_id VARCHAR(36))
BEGIN
  DECLARE direct_count INT DEFAULT 0;
  DECLARE unlocked_levels INT DEFAULT 0;

  -- Get count of active direct referrals
  SELECT COUNT(*) INTO direct_count
  FROM users
  WHERE sponsor_id = target_user_id AND is_active = TRUE;

  -- Calculate unlocked levels based on directs
  IF direct_count >= 10 THEN
    SET unlocked_levels = 15;
  ELSEIF direct_count >= 9 THEN
    SET unlocked_levels = 10;
  ELSEIF direct_count >= 8 THEN
    SET unlocked_levels = 8;
  ELSEIF direct_count >= 7 THEN
    SET unlocked_levels = 7;
  ELSEIF direct_count >= 6 THEN
    SET unlocked_levels = 6;
  ELSEIF direct_count >= 5 THEN
    SET unlocked_levels = 5;
  ELSEIF direct_count >= 4 THEN
    SET unlocked_levels = 4;
  ELSEIF direct_count >= 3 THEN
    SET unlocked_levels = 3;
  ELSEIF direct_count >= 2 THEN
    SET unlocked_levels = 2;
  ELSEIF direct_count >= 1 THEN
    SET unlocked_levels = 1;
  ELSE
    SET unlocked_levels = 0;
  END IF;

  -- Check if record exists
  IF EXISTS (SELECT 1 FROM level_unlocks WHERE user_id = target_user_id) THEN
    -- Update existing record
    UPDATE level_unlocks
    SET direct_count = direct_count,
        unlocked_levels = unlocked_levels,
        level_1_unlocked = (unlocked_levels >= 1),
        level_2_unlocked = (unlocked_levels >= 2),
        level_3_unlocked = (unlocked_levels >= 3),
        level_4_unlocked = (unlocked_levels >= 4),
        level_5_unlocked = (unlocked_levels >= 5),
        level_6_unlocked = (unlocked_levels >= 6),
        level_7_unlocked = (unlocked_levels >= 7),
        level_8_unlocked = (unlocked_levels >= 8),
        level_9_unlocked = (unlocked_levels >= 9),
        level_10_unlocked = (unlocked_levels >= 10),
        level_11_unlocked = (unlocked_levels >= 11),
        level_12_unlocked = (unlocked_levels >= 12),
        level_13_unlocked = (unlocked_levels >= 13),
        level_14_unlocked = (unlocked_levels >= 14),
        level_15_unlocked = (unlocked_levels >= 15),
        last_updated = NOW()
    WHERE user_id = target_user_id;
  ELSE
    -- Insert new record
    INSERT INTO level_unlocks (
      user_id, direct_count, unlocked_levels,
      level_1_unlocked, level_2_unlocked, level_3_unlocked, level_4_unlocked, level_5_unlocked,
      level_6_unlocked, level_7_unlocked, level_8_unlocked, level_9_unlocked, level_10_unlocked,
      level_11_unlocked, level_12_unlocked, level_13_unlocked, level_14_unlocked, level_15_unlocked
    ) VALUES (
      target_user_id, direct_count, unlocked_levels,
      (unlocked_levels >= 1), (unlocked_levels >= 2), (unlocked_levels >= 3), (unlocked_levels >= 4), (unlocked_levels >= 5),
      (unlocked_levels >= 6), (unlocked_levels >= 7), (unlocked_levels >= 8), (unlocked_levels >= 9), (unlocked_levels >= 10),
      (unlocked_levels >= 11), (unlocked_levels >= 12), (unlocked_levels >= 13), (unlocked_levels >= 14), (unlocked_levels >= 15)
    );
  END IF;

  -- Update direct_referrals_count in users table
  UPDATE users
  SET direct_referrals_count = direct_count
  WHERE id = target_user_id;
END$$

DELIMITER ;

-- ===========================================
-- 7. CREATE TRIGGER FOR LEVEL UNLOCK UPDATES
-- ===========================================
DELIMITER $$

DROP TRIGGER IF EXISTS after_user_insert_update_levels$$

CREATE TRIGGER after_user_insert_update_levels
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  -- Update sponsor's level unlocks when new user is added
  IF NEW.sponsor_id IS NOT NULL THEN
    CALL update_level_unlocks(NEW.sponsor_id);
  END IF;
END$$

DELIMITER ;

-- ===========================================
-- DONE
-- ===========================================
SELECT '✅ Incremental migration completed successfully!' AS status;
