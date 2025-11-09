/**
 * Security Enhancements
 * - Refresh tokens storage
 * - Failed login attempt tracking
 * - Rate limiting tracking
 */

USE finaster_mlm;

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  is_revoked BOOLEAN DEFAULT FALSE,

  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_attempted_at (attempted_at),
  INDEX idx_email_time (email, attempted_at)
) ENGINE=InnoDB;

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  attempts INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_identifier_endpoint (identifier, endpoint),
  INDEX idx_identifier (identifier),
  INDEX idx_window_start (window_start)
) ENGINE=InnoDB;

-- Add session tracking to users table
ALTER TABLE users
ADD COLUMN last_login_at TIMESTAMP NULL,
ADD COLUMN last_login_ip VARCHAR(45) NULL,
ADD COLUMN failed_login_attempts INT DEFAULT 0,
ADD COLUMN account_locked_until TIMESTAMP NULL;

SELECT '✅ Security enhancements schema completed!' AS status;
