# MySQL Database Web Viewer - Quick Start Guide

## ✅ Server is Currently Running!

**Access URL:** http://localhost:8080

---

## 🚀 How to Use

### Method 1: Use the Running Server (Easiest)
Just open your browser and go to:
```
http://localhost:8080
```

### Method 2: Start Fresh (if server stopped)
Double-click: `start-database-viewer.bat`

### Method 3: Command Line
```batch
cd C:\Projects\asterdex-8621-main
node database-viewer-server.mjs
```

---

## 📊 Features

### 1. **Overview Tab**
- View total users, investments, earnings
- Quick stats at a glance
- Click any table card to view data

### 2. **Tables Tab**
- Browse all database tables
- View table contents (up to 100 rows)
- See row counts for each table

### 3. **Query Tab**
- Execute custom SQL queries
- View results in formatted tables
- Examples provided

---

## 🔍 Example Queries

### View All Users
```sql
SELECT * FROM users LIMIT 10;
```

### Top Investors
```sql
SELECT email, wallet_balance, total_investment, total_earnings
FROM users
WHERE total_investment > 0
ORDER BY total_investment DESC
LIMIT 10;
```

### Recent Transactions
```sql
SELECT * FROM mlm_transactions
ORDER BY created_at DESC
LIMIT 20;
```

### Active Packages
```sql
SELECT u.email, p.name, up.investment_amount, up.status
FROM user_packages up
JOIN users u ON up.user_id = u.id
JOIN packages p ON up.package_id = p.id
WHERE up.status = 'active';
```

### Commission Summary
```sql
SELECT commission_type, COUNT(*) as count, SUM(amount) as total
FROM commissions
GROUP BY commission_type
ORDER BY total DESC;
```

---

## 🛑 How to Stop the Server

1. Press `Ctrl + C` in the terminal
2. Or close the command window

---

## 🔧 Troubleshooting

### Port Already in Use
If port 8080 is busy, edit `database-viewer-server.mjs`:
```javascript
const PORT = 8080; // Change to 8081 or 8082
```

### Can't Connect to Database
Check if MySQL is running:
```batch
net start MySQL84
```

### Server Won't Start
Make sure you have the required packages:
```batch
npm install express mysql2 cors
```

---

## 📱 Access from Other Devices

If you want to access from another computer on your network:

1. Find your IP address:
   ```batch
   ipconfig
   ```

2. Access from other device:
   ```
   http://YOUR_IP_ADDRESS:8080
   ```

---

## 🔒 Security Note

⚠️ **This is for LOCAL DEVELOPMENT ONLY!**

- Do NOT expose port 8080 to the internet
- Do NOT use in production without proper authentication
- The database credentials are visible in the code

---

## 📚 Available Tables

1. **users** - User accounts & wallet balances
2. **packages** - Investment package definitions
3. **user_packages** - User's purchased packages
4. **binary_tree** - Binary genealogy structure
5. **commissions** - Commission records
6. **mlm_transactions** - All financial transactions
7. **ranks** - Rank definitions

---

## 💡 Tips

- **Click table cards** in Overview to quickly view data
- **Use the Query tab** for custom analysis
- **Bookmark** http://localhost:8080 for quick access
- **Refresh the page** to see updated data

---

## 🎯 Common Tasks

### Check User Balance
```sql
SELECT email, wallet_balance FROM users WHERE email = 'your@email.com';
```

### View All Active Investments
```sql
SELECT * FROM user_packages WHERE status = 'active';
```

### See Today's Transactions
```sql
SELECT * FROM mlm_transactions
WHERE DATE(created_at) = CURDATE();
```

### Get Binary Tree Stats
```sql
SELECT email, left_volume, right_volume
FROM users
WHERE left_volume > 0 OR right_volume > 0;
```

---

**Server Status:** ✅ Running on http://localhost:8080
**Database:** finaster_mlm @ localhost:3306
**Last Started:** 2025-11-08

---

**Need Help?** Check the console output for errors or connection issues.
