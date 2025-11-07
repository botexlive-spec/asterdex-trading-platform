-- ============================================================================
-- FINASTER MLM DATABASE SCHEMA - MySQL 8.4
-- ============================================================================

-- Drop database if exists and create fresh
DROP DATABASE IF EXISTS finaster_mlm;
CREATE DATABASE finaster_mlm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finaster_mlm;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user' NOT NULL,

  -- MLM Structure
  sponsor_id VARCHAR(36),
  referral_code VARCHAR(20) UNIQUE NOT NULL,

  -- Financial
  wallet_balance DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  total_earnings DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  total_investment DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  total_withdrawal DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,

  -- Rank System
  current_rank ENUM('starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'crown_diamond', 'royal_diamond', 'presidential', 'ambassador') DEFAULT 'starter' NOT NULL,
  left_volume DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  right_volume DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,

  -- Profile
  wallet_address VARCHAR(255),
  phone_number VARCHAR(20),
  country VARCHAR(100),
  kyc_status ENUM('pending', 'approved', 'rejected', 'not_submitted') DEFAULT 'not_submitted' NOT NULL,

  -- Metadata
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sponsor (sponsor_id),
  INDEX idx_email (email),
  INDEX idx_referral_code (referral_code)
) ENGINE=InnoDB;

-- ============================================================================
-- PACKAGES TABLE
-- ============================================================================

CREATE TABLE packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  min_investment DECIMAL(15, 6) NOT NULL,
  max_investment DECIMAL(15, 6) NOT NULL,
  daily_roi_percentage DECIMAL(5, 2) NOT NULL,
  duration_days INT NOT NULL,
  level_income_percentages JSON NOT NULL,
  matching_bonus_percentage DECIMAL(5, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- USER PACKAGES TABLE
-- ============================================================================

CREATE TABLE user_packages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  package_id INT NOT NULL,
  investment_amount DECIMAL(15, 6) NOT NULL,
  daily_roi_amount DECIMAL(15, 6) NOT NULL,
  total_roi_earned DECIMAL(15, 6) DEFAULT 0.00,
  total_roi_limit DECIMAL(15, 6) NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  activation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP NULL,
  last_roi_distribution TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_activation (activation_date)
) ENGINE=InnoDB;

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE mlm_transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  transaction_type ENUM('deposit', 'withdrawal', 'level_income', 'matching_bonus', 'roi_distribution', 'rank_reward', 'referral_bonus', 'binary_bonus') NOT NULL,
  amount DECIMAL(15, 6) NOT NULL,
  description TEXT,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
  reference_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_type (transaction_type),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- RANKS TABLE
-- ============================================================================

CREATE TABLE ranks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rank_type VARCHAR(50) NOT NULL,
  min_investment DECIMAL(15, 6) NOT NULL,
  min_team_volume DECIMAL(15, 6) NOT NULL,
  reward_amount DECIMAL(15, 6) DEFAULT 0.00,
  badge_color VARCHAR(20),
  gradient_from VARCHAR(20),
  gradient_to VARCHAR(20),
  sort_order INT NOT NULL,
  benefits JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_rank_type (rank_type),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB;

-- ============================================================================
-- COMMISSIONS TABLE
-- ============================================================================

CREATE TABLE commissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  from_user_id VARCHAR(36) NOT NULL,
  commission_type ENUM('level_income', 'matching_bonus', 'referral_bonus', 'binary_bonus') NOT NULL,
  amount DECIMAL(15, 6) NOT NULL,
  level INT,
  package_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_from_user (from_user_id),
  INDEX idx_type (commission_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- Create admin user for database management
-- ============================================================================

-- Note: Root user access is managed separately
-- Application will connect using credentials from .env file
