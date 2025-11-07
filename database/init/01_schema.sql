-- ============================================================================
-- FINASTER MLM DATABASE SCHEMA
-- PostgreSQL 15+ (Migrated from Supabase)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE rank_type AS ENUM (
  'starter',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'crown_diamond',
  'royal_diamond',
  'presidential',
  'ambassador'
);

CREATE TYPE transaction_type AS ENUM (
  'deposit',
  'withdrawal',
  'level_income',
  'matching_bonus',
  'roi_distribution',
  'rank_reward',
  'referral_bonus',
  'binary_bonus'
);

CREATE TYPE transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE package_status AS ENUM (
  'active',
  'expired',
  'cancelled'
);

CREATE TYPE kyc_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'not_submitted'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'user'
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,

  -- MLM Structure
  sponsor_id UUID REFERENCES users(id),
  referral_code VARCHAR(20) UNIQUE NOT NULL,

  -- Financial
  wallet_balance DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  total_earnings DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  total_investment DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  total_withdrawal DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,

  -- Rank System
  current_rank rank_type DEFAULT 'starter' NOT NULL,
  left_volume DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  right_volume DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,

  -- Profile
  wallet_address VARCHAR(255),
  phone_number VARCHAR(20),
  country VARCHAR(100),
  kyc_status kyc_status DEFAULT 'not_submitted' NOT NULL,

  -- Metadata
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PACKAGES TABLE
-- ============================================================================

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  min_investment DECIMAL(15, 6) NOT NULL,
  max_investment DECIMAL(15, 6) NOT NULL,
  daily_roi_percentage DECIMAL(5, 2) NOT NULL,
  duration_days INTEGER NOT NULL,
  level_income_percentages JSONB NOT NULL,
  matching_bonus_percentage DECIMAL(5, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USER PACKAGES TABLE
-- ============================================================================

CREATE TABLE user_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES packages(id) NOT NULL,

  investment_amount DECIMAL(15, 6) NOT NULL,
  daily_roi_amount DECIMAL(15, 6) NOT NULL,
  total_roi_earned DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  total_roi_limit DECIMAL(15, 6) NOT NULL,

  status package_status DEFAULT 'active' NOT NULL,
  activation_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  last_roi_distribution TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MLM TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE mlm_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  transaction_type transaction_type NOT NULL,
  amount DECIMAL(15, 6) NOT NULL,

  from_user_id UUID REFERENCES users(id),
  level INTEGER,
  package_id UUID REFERENCES packages(id),

  description TEXT,
  status transaction_status DEFAULT 'completed' NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RANKS TABLE
-- ============================================================================

CREATE TABLE ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  rank_type rank_type UNIQUE NOT NULL,
  min_investment DECIMAL(15, 6) NOT NULL,
  min_team_volume DECIMAL(15, 6) NOT NULL,
  reward_amount DECIMAL(15, 6) DEFAULT 0.00,
  badge_color VARCHAR(50),
  gradient_from VARCHAR(50),
  gradient_to VARCHAR(50),
  benefits JSONB,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_sponsor_id ON users(sponsor_id);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_user_packages_user_id ON user_packages(user_id);
CREATE INDEX idx_user_packages_status ON user_packages(status);
CREATE INDEX idx_user_packages_expiry_date ON user_packages(expiry_date);

CREATE INDEX idx_transactions_user_id ON mlm_transactions(user_id);
CREATE INDEX idx_transactions_type ON mlm_transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON mlm_transactions(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_packages_updated_at
  BEFORE UPDATE ON user_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
