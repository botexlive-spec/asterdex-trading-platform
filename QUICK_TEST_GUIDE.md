# 🧪 QUICK TEST GUIDE - Finaster MLM Application

## ⚡ BEFORE YOU START

**Current Status:** Dev server running at http://localhost:5173/

---

## 🎯 PRIORITY 1: Fix Database Schema (MUST DO FIRST)

### ⚠️ CRITICAL: Run These SQL Files

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/dsgtyrwtlpnckvcozfbc/editor
   ```

2. **Run in this order:**

   **File 1:** `database/FIX_USER_PACKAGES_SCHEMA.sql`
   - Adds 14+ MLM columns to user_packages table
   - Creates roi_distributions table
   - Sets up RLS policies

   **File 2:** `database/FIX_COMMISSIONS_SCHEMA.sql`
   - Adds percentage column
   - Adds reference_type and reference_id

   **File 3:** `database/CREATE_TRANSACTIONS_TABLE.sql`
   - Creates complete transaction audit trail

3. **Verify Success:**
   Each SQL file should complete without errors. If you see errors, they may be safe (e.g., "table already exists").

---

## 🧪 PRIORITY 2: Test Application

### Test Credentials

```
Regular User:
Email: test-e2e-1762258004006@example.com
Password: Test123456!

Admin User:
Email: admin@finaster.com
Password: password
```

### Quick Test Checklist (10 minutes)

```bash
# Open browser to: http://localhost:5173/
# Open browser console: Press F12
```

#### ✅ Test 1: Login (2 min)
- [ ] Navigate to /auth/login
- [ ] Login with test user
- [ ] No errors in console
- [ ] Redirects to /dashboard

#### ✅ Test 2: Dashboard (2 min)
- [ ] Dashboard loads (not stuck on "Loading...")
- [ ] Shows metrics (even if all zeros)
- [ ] No fake data (Alice Johnson, Bob Smith, etc.)
- [ ] No red errors in console

#### ✅ Test 3: Critical Pages (3 min)
Visit each page and check if UI loads:

- [ ] /packages - Shows package cards (not stuck on "Loading packages...")
- [ ] /wallet - Shows balance
- [ ] /team - Shows team list
- [ ] /earnings - Shows earnings overview

#### ✅ Test 4: Additional Pages (2 min)
- [ ] /reports - Shows report options
- [ ] /ranks - Shows rank cards
- [ ] /genealogy - Shows binary tree (may be empty if no team)
- [ ] /team-report - Shows level breakdown

#### ✅ Test 5: Console Check (1 min)
Open browser console (F12) and check:
- [ ] No red errors
- [ ] No "Failed to fetch" errors
- [ ] No React hooks errors

---

## 🚨 WHAT TO REPORT

### If Everything Works ✅
Report: "All pages load successfully, no errors in console"

### If Pages Stuck Loading ⚠️
Report:
1. Which page(s) stuck loading
2. Screenshot of browser console errors (F12)
3. Did you run all 3 SQL migration files?

### If React Errors Appear ❌
Report:
1. Full error message from console
2. Which page shows the error
3. Screenshot of console

---

## 🔍 DETAILED PAGE TESTS (Optional - 20 min)

### Test Package Purchase Flow

1. Go to /packages
2. Click "Purchase" on any package
3. Enter amount (e.g., $500)
4. Enter payment password (any 6+ characters)
5. Check "Accept terms"
6. Click "Confirm Purchase"
7. **Expected:** Success message OR error if insufficient balance

### Test Team Page

1. Go to /team
2. Toggle between Table and Tree view
3. **Expected:** Shows team members (or "No team members yet")

### Test Earnings Page

1. Go to /earnings
2. Check filters work
3. **Expected:** Shows earnings breakdown (or "No earnings yet")

### Test Wallet

1. Go to /wallet
2. Click "Deposit" tab
3. Click "Withdraw" tab
4. **Expected:** Forms load correctly

---

## 📊 EXPECTED RESULTS

### ✅ GOOD SIGNS
- Pages load within 2-3 seconds
- UI renders completely
- Shows "No data yet" messages (if no data exists)
- No red errors in console
- Can navigate between pages smoothly

### ⚠️ WARNING SIGNS
- Pages stuck on "Loading..." for >10 seconds
- White/blank pages
- Console shows red errors
- React hooks errors
- "Failed to fetch" errors

### ❌ BAD SIGNS
- Only "finaster" text appears on pages
- Entire app is blank
- Console filled with red errors
- Can't login at all

---

## 🛠️ QUICK FIXES

### If dev server crashed:
```bash
cd C:\Projects\asterdex-8621-main
npm run dev
```

### If pages not loading:
1. Hard refresh browser: Ctrl + Shift + R
2. Clear browser cache
3. Check dev server is running

### If React errors appear:
1. Restart dev server
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Restart again: `npm run dev`

---

## 📋 REPORTING TEMPLATE

Copy and fill out:

```
## Test Results

### Database Migrations
- [ ] FIX_USER_PACKAGES_SCHEMA.sql - Success/Failed
- [ ] FIX_COMMISSIONS_SCHEMA.sql - Success/Failed
- [ ] CREATE_TRANSACTIONS_TABLE.sql - Success/Failed

### Login Test
- Result: ✅ Success / ❌ Failed
- Notes:

### Dashboard Test
- Result: ✅ Success / ❌ Failed
- Notes:

### Package Page Test
- Result: ✅ Success / ❌ Failed
- Shows: Loading forever / Error / Works correctly

### Other Pages Status
- /earnings: ✅/❌
- /reports: ✅/❌
- /ranks: ✅/❌
- /genealogy: ✅/❌
- /team-report: ✅/❌

### Console Errors
- Red errors: Yes/No
- Count:
- First error message:

### Overall Status
- App functional: Yes/No
- Can navigate pages: Yes/No
- Ready for production: Yes/No
```

---

## ⏱️ TIME ESTIMATES

- **Database Migration:** 5-10 minutes
- **Quick Test:** 10 minutes
- **Detailed Test:** 20 minutes
- **Total:** 15-30 minutes

---

## 🎯 SUCCESS CRITERIA

You're done testing when:

1. ✅ All 3 SQL migrations ran successfully
2. ✅ Can login without errors
3. ✅ Dashboard loads with UI (not blank)
4. ✅ At least 6 pages load correctly
5. ✅ Browser console has no red errors
6. ✅ Can navigate between pages smoothly

---

## 📞 NEED HELP?

If stuck, provide:
1. Screenshot of browser (showing page state)
2. Screenshot of console (F12)
3. Which test step failed
4. Error messages (copy/paste)

---

**Good luck! The app should work great after the database migration.** 🚀
