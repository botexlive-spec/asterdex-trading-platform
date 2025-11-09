# Wallet and Transaction Routes - Schema Fix Summary

**Date**: November 8, 2025
**Issue**: Backend routes were querying non-existent tables and columns, causing 500 errors

---

## Changes Made

### 1. **C:\Projects\asterdex-8621-main\server\routes\wallet.ts**

Fixed all SQL queries to match the actual MySQL schema:

#### GET /api/wallet/balance (Lines 39-83)
**Before**: Queried non-existent `wallets` table
```sql
SELECT available_balance, total_balance, locked_balance
FROM wallets WHERE user_id = ?
```

**After**: Uses `users.wallet_balance` from actual schema
```sql
SELECT wallet_balance FROM users WHERE id = ?
```

#### GET /api/wallet/withdrawal/limits (Lines 209-258)
**Before**: Used non-existent `completed_at` column
```sql
WHERE ... AND completed_at >= ?
```

**After**: Uses `created_at` which exists in schema
```sql
WHERE ... AND created_at >= ?
```
- Fixed 3 queries (daily, weekly, monthly limits)

#### POST /api/wallet/withdrawal (Lines 264-350)
**Before**:
- Queried `wallets.available_balance`
- Used `completed_at` for date filtering

**After**:
- Queries `users.wallet_balance`
- Uses `created_at` for date filtering

**Changes**:
- Line 293: `SELECT wallet_balance FROM users WHERE id = ?`
- Line 313: `AND created_at >= ?`

#### POST /api/wallet/transfer (Lines 356-464)
**Before**:
- Queried `wallets.available_balance`
- Updated `wallets` table balances
- Inserted `completed_at` timestamp (doesn't exist)

**After**:
- Queries `users.wallet_balance`
- Updates `users.wallet_balance` directly
- Removed `completed_at` from INSERT statements

**Changes**:
- Line 384: `SELECT wallet_balance FROM users WHERE id = ?`
- Line 405: `UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?`
- Line 411: `UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`
- Lines 417-419: Removed `completed_at` from sender transaction INSERT
- Lines 431-433: Removed `completed_at` from recipient transaction INSERT
- Lines 445-447: Removed `completed_at` from fee transaction INSERT

---

### 2. **C:\Projects\asterdex-8621-main\server\routes\transactions.ts**

**Status**: ✓ No changes needed - already using correct schema

The file correctly uses:
- `from_user_id` (exists in schema)
- `created_at` (exists in schema)
- No references to non-existent columns

---

### 3. **C:\Projects\asterdex-8621-main\database\mysql_schema.sql**

Added missing columns and transaction types:

#### Line 109: Added transaction types
**Before**:
```sql
transaction_type ENUM('deposit', 'withdrawal', 'level_income',
  'matching_bonus', 'roi_distribution', 'rank_reward',
  'referral_bonus', 'binary_bonus') NOT NULL
```

**After**:
```sql
transaction_type ENUM('deposit', 'withdrawal', 'level_income',
  'matching_bonus', 'roi_distribution', 'rank_reward',
  'referral_bonus', 'binary_bonus', 'transfer_out', 'transfer_in') NOT NULL
```

#### Lines 117-118: Added missing columns
**Added**:
```sql
method VARCHAR(50),
metadata JSON,
```

These columns are used by the wallet routes for storing transaction metadata.

---

### 4. **C:\Projects\asterdex-8621-main\database\migrate-wallet-schema.sql** (NEW)

Created migration script to update existing databases:
- Alters `transaction_type` ENUM to include `transfer_out` and `transfer_in`
- Adds `method` and `metadata` columns if they don't exist
- Includes verification queries to confirm changes

---

## Summary of SQL Schema Mapping

| Route Query | Incorrect Reference | Correct Reference |
|-------------|-------------------|-------------------|
| Get balance | `wallets.available_balance` | `users.wallet_balance` |
| Get balance | `wallets.total_balance` | `users.wallet_balance` |
| Get balance | `wallets.locked_balance` | Not tracked (returns 0) |
| Withdrawal limits | `mlm_transactions.completed_at` | `mlm_transactions.created_at` |
| Check balance | `wallets.available_balance` | `users.wallet_balance` |
| Update balance | `UPDATE wallets SET ...` | `UPDATE users SET wallet_balance ...` |
| Transaction types | Missing `transfer_out/in` | Added to ENUM |
| Transaction metadata | Missing columns | Added `method`, `metadata` |

---

## Database Schema (Confirmed)

### users table
```sql
wallet_balance DECIMAL(15, 6) DEFAULT 0.00 NOT NULL
total_earnings DECIMAL(15, 6) DEFAULT 0.00 NOT NULL
total_investment DECIMAL(15, 6) DEFAULT 0.00 NOT NULL
total_withdrawal DECIMAL(15, 6) DEFAULT 0.00 NOT NULL
```

### mlm_transactions table
```sql
id CHAR(36) PRIMARY KEY
user_id CHAR(36) NOT NULL
transaction_type ENUM(...)
amount DECIMAL(15, 6) NOT NULL
from_user_id CHAR(36)  -- EXISTS (used correctly by transactions.ts)
level INTEGER
package_id CHAR(36)
description TEXT
method VARCHAR(50)  -- ADDED
metadata JSON  -- ADDED
status ENUM('pending', 'completed', 'failed', 'cancelled')
created_at TIMESTAMP  -- EXISTS (NOT completed_at!)
```

---

## What Was Fixed

### Core Issues
1. ✓ **Removed all references to non-existent `wallets` table**
2. ✓ **Changed all `completed_at` to `created_at`**
3. ✓ **Added missing transaction types (`transfer_out`, `transfer_in`)**
4. ✓ **Added missing columns (`method`, `metadata`)**

### Business Logic
- All business logic remains intact
- Balance calculations unchanged
- Withdrawal limits still enforced
- Transfer fees still calculated
- KYC checks still in place

---

## Next Steps

### To Apply Changes:

1. **Run the migration** (if database already exists):
   ```bash
   mysql -u root finaster_mlm < database/migrate-wallet-schema.sql
   ```

2. **Or recreate from fresh schema**:
   ```bash
   mysql -u root finaster_mlm < database/mysql_schema.sql
   mysql -u root finaster_mlm < database/mysql_seed.sql
   ```

3. **Rebuild and restart the server**:
   ```bash
   npm run build
   npm run dev
   ```

---

## Testing Checklist

After applying these fixes, test:

- [ ] GET /api/wallet/balance - Should return wallet balance
- [ ] GET /api/wallet/withdrawal/limits - Should return daily/weekly/monthly limits
- [ ] POST /api/wallet/deposit - Should create pending deposit
- [ ] POST /api/wallet/withdrawal - Should validate balance and create withdrawal
- [ ] POST /api/wallet/transfer - Should transfer between users
- [ ] GET /api/wallet/transactions/pending - Should list pending transactions
- [ ] GET /api/transactions - Should list transaction history with from_user details

---

## Files Modified

1. `server/routes/wallet.ts` - Fixed SQL queries (7 query blocks)
2. `server/routes/transactions.ts` - No changes needed
3. `database/mysql_schema.sql` - Added missing columns and transaction types
4. `database/migrate-wallet-schema.sql` - Created migration script

---

**Status**: ✓ All SQL queries now match actual MySQL schema
