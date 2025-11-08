/**
 * Payouts Table Migration
 * Dedicated table for tracking all payout distributions
 */

USE finaster_mlm;

-- Create payouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  from_user_id VARCHAR(36) NULL,
  payout_type ENUM(
    'roi', 'roi_on_roi', 'binary_bonus', 'level_income',
    'matching_bonus', 'referral_bonus', 'booster_roi',
    'monthly_reward', 'rank_reward'
  ) NOT NULL,
  amount DECIMAL(15, 6) NOT NULL,
  level INT NULL,
  description TEXT NULL,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_from_user_id (from_user_id),
  INDEX idx_payout_type (payout_type),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SELECT '✅ Payouts table created successfully!' AS status;
