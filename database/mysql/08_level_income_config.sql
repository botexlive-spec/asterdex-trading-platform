/**
 * Add Level Income Configuration to plan_settings
 * Configures 30-level income distribution percentages
 */

INSERT INTO plan_settings (feature_key, feature_name, is_active, payload, description, created_at, updated_at)
VALUES (
  'level_income_30',
  '30-Level Income Distribution',
  1,
  JSON_OBJECT(
    'max_levels', 30,
    'level_percentages', JSON_ARRAY(
      5.0,  -- Level 1: 5%
      3.0,  -- Level 2: 3%
      2.0,  -- Level 3: 2%
      1.5,  -- Level 4: 1.5%
      1.5,  -- Level 5: 1.5%
      1.0,  -- Level 6: 1%
      1.0,  -- Level 7: 1%
      1.0,  -- Level 8: 1%
      1.0,  -- Level 9: 1%
      1.0,  -- Level 10: 1%
      0.5,  -- Level 11: 0.5%
      0.5,  -- Level 12: 0.5%
      0.5,  -- Level 13: 0.5%
      0.5,  -- Level 14: 0.5%
      0.5,  -- Level 15: 0.5%
      0.5,  -- Level 16: 0.5%
      0.5,  -- Level 17: 0.5%
      0.5,  -- Level 18: 0.5%
      0.5,  -- Level 19: 0.5%
      0.5,  -- Level 20: 0.5%
      0.3,  -- Level 21: 0.3%
      0.3,  -- Level 22: 0.3%
      0.3,  -- Level 23: 0.3%
      0.3,  -- Level 24: 0.3%
      0.3,  -- Level 25: 0.3%
      0.3,  -- Level 26: 0.3%
      0.3,  -- Level 27: 0.3%
      0.3,  -- Level 28: 0.3%
      0.3,  -- Level 29: 0.3%
      0.3   -- Level 30: 0.3%
    ),
    'require_level_unlock', true,
    'require_active_status', true,
    'min_package_amount', 100,
    'description', 'Users must have N direct referrals to earn from level N. Active status required.'
  ),
  '30-level income distribution with eligibility checks based on direct referral count and active status',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  payload = VALUES(payload),
  updated_at = NOW();
