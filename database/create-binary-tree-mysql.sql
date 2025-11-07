-- ============================================================================
-- CREATE BINARY_TREE TABLE FOR MYSQL
-- ============================================================================
-- This table manages the binary tree structure for MLM genealogy
-- Each user can have max 2 direct children (left and right)
-- ============================================================================

USE finaster_mlm;

-- Create binary_tree table
CREATE TABLE IF NOT EXISTS binary_tree (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) UNIQUE NOT NULL,
  parent_id CHAR(36) NULL,
  left_child_id CHAR(36) NULL,
  right_child_id CHAR(36) NULL,
  level INT DEFAULT 0 NOT NULL,
  position ENUM('root', 'left', 'right') DEFAULT 'root' NOT NULL,
  left_volume DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  right_volume DECIMAL(15, 6) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (left_child_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (right_child_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_left_child (left_child_id),
  INDEX idx_right_child (right_child_id),
  INDEX idx_position (position)
) ENGINE=InnoDB;

-- ============================================================================
-- INITIALIZE BINARY TREE WITH ROOT USER
-- ============================================================================
-- Create binary tree entry for the first admin user as root

INSERT INTO binary_tree (user_id, parent_id, left_child_id, right_child_id, level, position, left_volume, right_volume, created_at, updated_at)
SELECT
  id,
  NULL,
  NULL,
  NULL,
  0,
  'root',
  0.00,
  0.00,
  created_at,
  NOW()
FROM users
WHERE role = 'admin'
ORDER BY created_at ASC
LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = NOW();

SELECT 'Binary tree table created successfully!' AS message;

-- Verify creation
SELECT
  COUNT(*) as total_binary_nodes,
  (SELECT COUNT(*) FROM users) as total_users
FROM binary_tree;
