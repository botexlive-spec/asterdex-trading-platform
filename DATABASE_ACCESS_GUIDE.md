# DATABASE ACCESS GUIDE
## Asterdex MLM Platform - MySQL Database

---

## 📋 Connection Details

### MySQL Server Information
```
Host:       localhost
Port:       3306
Database:   finaster_mlm
Username:   root
Password:   root
Version:    MySQL 8.4
```

---

## 🔐 Access Methods

### Method 1: MySQL Command Line (Windows)

#### Quick Access Script
```batch
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -proot finaster_mlm
```

#### Common Commands
```sql
-- Show all databases
SHOW DATABASES;

-- Use the MLM database
USE finaster_mlm;

-- Show all tables
SHOW TABLES;

-- Describe table structure
DESCRIBE users;
DESCRIBE packages;
DESCRIBE user_packages;
DESCRIBE binary_tree;
DESCRIBE commissions;
DESCRIBE mlm_transactions;

-- Quick data overview
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_packages FROM user_packages;
SELECT COUNT(*) as total_transactions FROM mlm_transactions;
```

---

### Method 2: MySQL Workbench (GUI Tool)

**Download:** https://dev.mysql.com/downloads/workbench/

**Connection Setup:**
1. Open MySQL Workbench
2. Click "+" to create new connection
3. Enter connection details:
   - Connection Name: `Asterdex MLM`
   - Hostname: `localhost`
   - Port: `3306`
   - Username: `root`
   - Password: `root` (Click "Store in Keychain")
   - Default Schema: `finaster_mlm`
4. Click "Test Connection"
5. Click "OK" to save

---

### Method 3: phpMyAdmin (Web Interface)

**Install phpMyAdmin:**
```batch
# Download from: https://www.phpmyadmin.net/downloads/
# Extract to: C:\phpMyAdmin\
# Configure config.inc.php with connection details
```

**Access URL:** http://localhost/phpmyadmin/
**Login:** root / root

---

### Method 4: HeidiSQL (Recommended GUI)

**Download:** https://www.heidisql.com/download.php

**Connection Setup:**
- Network type: MySQL (TCP/IP)
- Hostname: localhost
- User: root
- Password: root
- Port: 3306
- Database: finaster_mlm

---

### Method 5: VS Code Extension

**Extension:** MySQL (by cweijan)

**Installation:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "MySQL cweijan"
4. Install "MySQL" extension
5. Click "+" in MySQL panel
6. Enter connection details

---

## 📊 Database Schema

### All Tables (18 total)

```
1.  users                - User accounts & wallet balances
2.  user_packages        - Investment packages purchased by users
3.  packages             - Available investment packages
4.  binary_tree          - Binary genealogy tree structure
5.  commissions          - Commission records (level income, binary)
6.  mlm_transactions     - All financial transactions
7.  sessions             - User sessions
8.  kyc_submissions      - KYC verification requests
9.  withdrawals          - Withdrawal requests
10. deposits             - Deposit records
11. support_tickets      - Customer support tickets
12. notifications        - User notifications
13. audit_logs           - System audit trail
14. ranks                - Rank definitions
15. rank_achievements    - User rank achievements
16. distribution_rules   - Dynamic distribution rules
17. rewards              - Reward configurations
18. booster_income       - Booster income records
```

---

## 🔍 Quick Queries

### User Management
```sql
-- List all users
SELECT id, email, role, wallet_balance, total_investment, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Find admin users
SELECT id, email, full_name, created_at
FROM users
WHERE role = 'admin';

-- Find users with balance
SELECT email, wallet_balance, total_earnings
FROM users
WHERE wallet_balance > 0
ORDER BY wallet_balance DESC;

-- User count by role
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```

### Investment Packages
```sql
-- Active packages
SELECT * FROM packages WHERE is_active = true;

-- User's active investments
SELECT u.email, p.name, up.investment_amount, up.total_roi_earned, up.status
FROM user_packages up
JOIN users u ON up.user_id = u.id
JOIN packages p ON up.package_id = p.id
WHERE up.status = 'active'
ORDER BY up.created_at DESC;

-- Total investments
SELECT
  COUNT(*) as total_packages,
  SUM(investment_amount) as total_invested,
  AVG(investment_amount) as avg_investment
FROM user_packages;
```

### Transactions
```sql
-- Recent transactions
SELECT
  u.email,
  t.transaction_type,
  t.amount,
  t.status,
  t.created_at
FROM mlm_transactions t
JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 20;

-- Transactions by type
SELECT
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM mlm_transactions
WHERE status = 'completed'
GROUP BY transaction_type
ORDER BY total_amount DESC;

-- Today's transactions
SELECT * FROM mlm_transactions
WHERE DATE(created_at) = CURDATE()
ORDER BY created_at DESC;
```

### Binary Tree
```sql
-- User's binary tree position
SELECT
  u.email,
  bt.position,
  bt.level,
  parent.email as parent_email
FROM binary_tree bt
JOIN users u ON bt.user_id = u.id
LEFT JOIN users parent ON bt.parent_id = parent.id
LIMIT 10;

-- Binary tree statistics
SELECT
  u.email,
  u.left_volume,
  u.right_volume,
  (u.left_volume + u.right_volume) as total_volume
FROM users u
WHERE u.left_volume > 0 OR u.right_volume > 0
ORDER BY total_volume DESC;
```

### Commissions
```sql
-- Commission summary by user
SELECT
  u.email,
  c.commission_type,
  COUNT(*) as count,
  SUM(c.amount) as total_earned
FROM commissions c
JOIN users u ON c.user_id = u.id
GROUP BY u.email, c.commission_type
ORDER BY total_earned DESC;

-- Level income breakdown
SELECT
  level,
  COUNT(*) as payments,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM commissions
WHERE commission_type = 'level_income'
GROUP BY level
ORDER BY level;
```

### System Analytics
```sql
-- Platform overview
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM user_packages WHERE status = 'active') as active_packages,
  (SELECT SUM(wallet_balance) FROM users) as total_wallet_balance,
  (SELECT SUM(total_investment) FROM users) as total_investments,
  (SELECT SUM(total_earnings) FROM users) as total_earnings,
  (SELECT COUNT(*) FROM mlm_transactions WHERE DATE(created_at) = CURDATE()) as today_transactions;

-- Growth metrics
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM users
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🛠️ Database Maintenance

### Backup Database
```batch
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe" -u root -proot finaster_mlm > backup_finaster_mlm_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql
```

### Restore Database
```batch
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -proot finaster_mlm < backup_file.sql
```

### Check Database Size
```sql
SELECT
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'finaster_mlm'
GROUP BY table_schema;
```

### Optimize Tables
```sql
OPTIMIZE TABLE users, user_packages, mlm_transactions, commissions;
```

---

## 🔑 Create New Database User

```sql
-- Create new user with limited permissions
CREATE USER 'mlm_readonly'@'localhost' IDENTIFIED BY 'read_password_123';
GRANT SELECT ON finaster_mlm.* TO 'mlm_readonly'@'localhost';
FLUSH PRIVILEGES;

-- Create admin user
CREATE USER 'mlm_admin'@'localhost' IDENTIFIED BY 'admin_password_123';
GRANT ALL PRIVILEGES ON finaster_mlm.* TO 'mlm_admin'@'localhost';
FLUSH PRIVILEGES;
```

---

## 📱 Mobile Database Access

### Using SSH Tunnel (for remote access)
```batch
# Install SSH client, then:
ssh -L 3307:localhost:3306 your_user@your_server_ip
# Connect to localhost:3307 from your tool
```

---

## 🚨 Common Issues

### Issue 1: Access Denied
**Solution:**
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;
```

### Issue 2: Can't Connect
**Check MySQL Service:**
```batch
net start MySQL84
```

### Issue 3: Port Already in Use
**Find Process:**
```batch
netstat -ano | findstr :3306
taskkill /PID <process_id> /F
```

---

## 📞 Support

**MySQL Documentation:** https://dev.mysql.com/doc/
**Community:** https://forums.mysql.com/

---

**Last Updated:** 2025-11-08
**Database Version:** MySQL 8.4
**Project:** Asterdex MLM Platform
