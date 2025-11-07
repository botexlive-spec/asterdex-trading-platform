-- ============================================================================
-- FINASTER MLM DATABASE SCHEMA - MySQL 8.4
-- ============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS finaster_mlm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finaster_mlm;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user' NOT NULL,

  -- MLM Structure
  sponsor_id CHAR(36),
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
  INDEX idx_email (email),
  INDEX idx_referral_code (referral_code),
  INDEX idx_sponsor_id (sponsor_id),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- ============================================================================
-- PACKAGES TABLE
-- ============================================================================

CREATE TABLE packages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  min_investment DECIMAL(15, 6) NOT NULL,
  max_investment DECIMAL(15, 6) NOT NULL,
  daily_roi_percentage DECIMAL(5, 2) NOT NULL,
  duration_days INTEGER NOT NULL,
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
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  package_id CHAR(36) NOT NULL,

  investment_amount DECIMAL(15, 6) NOT NULL,
  daily_roi_amount DECIMAL(15, 6) NOT NULL,
  total_roi_earned DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  total_roi_limit DECIMAL(15, 6) NOT NULL,

  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active' NOT NULL,
  activation_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  last_roi_distribution TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_expiry_date (expiry_date)
) ENGINE=InnoDB;

-- ============================================================================
-- MLM TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE mlm_transactions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,

  transaction_type ENUM('deposit', 'withdrawal', 'level_income', 'matching_bonus', 'roi_distribution', 'rank_reward', 'referral_bonus', 'binary_bonus') NOT NULL,
  amount DECIMAL(15, 6) NOT NULL,

  from_user_id CHAR(36),
  level INTEGER,
  package_id CHAR(36),

  description TEXT,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed' NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES packages(id),
  INDEX idx_user_id (user_id),
  INDEX idx_type (transaction_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- RANKS TABLE
-- ============================================================================

CREATE TABLE ranks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  rank_type ENUM('starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'crown_diamond', 'royal_diamond', 'presidential', 'ambassador') UNIQUE NOT NULL,
  min_investment DECIMAL(15, 6) NOT NULL,
  min_team_volume DECIMAL(15, 6) NOT NULL,
  reward_amount DECIMAL(15, 6) DEFAULT 0.00,
  badge_color VARCHAR(50),
  gradient_from VARCHAR(50),
  gradient_to VARCHAR(50),
  benefits JSON,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
