# Quick Start Guide - MLM Business Logic Redesign

## 🚀 Get Started in 5 Minutes

### Step 1: Backup Database
```bash
mysqldump -u root -p finaster_mlm > backup_before_redesign.sql
```

### Step 2: Run Migration
```bash
mysql -u root -p finaster_mlm < database/mysql/03_business_logic_redesign.sql
```

### Step 3: Verify Tables
```sql
SELECT COUNT(*) FROM plan_settings;  -- Should be 7
SELECT COUNT(*) FROM rewards;        -- Should be 4
SHOW TABLES LIKE '%booster%';
SHOW TABLES LIKE '%level_unlocks%';
```

### Step 4: Test Level Unlock
```sql
-- View plan settings
SELECT feature_key, is_active FROM plan_settings;

-- Check level unlock logic
SELECT * FROM level_unlocks LIMIT 5;
```

## ✅ What's Working
- Database schema ✓
- Plan settings ✓
- Level unlock automation ✓
- Services ready ✓

## ⏳ Next Steps
1. Create API routes
2. Update server/index.ts
3. Update frontend
4. Test everything

See IMPLEMENTATION_GUIDE.md for details.
