# PostgreSQL Installation - Step by Step

## 📥 Step 1: Download (2 minutes)

**Click this link:** https://www.postgresql.org/download/windows/

Then:
1. Click the **"Download the installer"** button
2. On the EDB page, select **Windows x86-64** for PostgreSQL **15.x**
3. Download will start (~280 MB file)
4. File name: `postgresql-15.x-windows-x64.exe`

## 💿 Step 2: Install (5 minutes)

1. **Run the downloaded .exe file as Administrator**
   - Right-click → "Run as administrator"

2. **Setup Wizard will open:**

   **Screen 1 - Welcome**
   - Click "Next"

   **Screen 2 - Installation Directory**
   ```
   C:\Program Files\PostgreSQL\15
   ```
   - Click "Next"

   **Screen 3 - Select Components**
   ```
   ✅ PostgreSQL Server (REQUIRED)
   ✅ pgAdmin 4 (GUI tool - recommended)
   ✅ Stack Builder (optional - you can uncheck)
   ✅ Command Line Tools (REQUIRED)
   ```
   - Click "Next"

   **Screen 4 - Data Directory**
   ```
   C:\Program Files\PostgreSQL\15\data
   ```
   - Click "Next"

   **Screen 5 - Password** ⚠️ IMPORTANT!
   ```
   Password: postgres123

   Retype:  postgres123
   ```
   - **WRITE THIS DOWN!** You'll need it later
   - Click "Next"

   **Screen 6 - Port**
   ```
   Port: 5432
   ```
   - Click "Next"

   **Screen 7 - Locale**
   ```
   [Default locale]
   ```
   - Click "Next"

   **Screen 8 - Summary**
   - Review settings
   - Click "Next"

3. **Installation will run** (~3-5 minutes)
   - Wait for progress bar to complete
   - Do not close the window

4. **Completion**
   - Uncheck "Launch Stack Builder at exit" (not needed)
   - Click "Finish"

## ✅ Step 3: Verify Installation (1 minute)

Open **Command Prompt** or **PowerShell** and run:

```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" --version
```

You should see:
```
psql (PostgreSQL) 15.x
```

## 🗄️ Step 4: Setup Database (2 minutes)

Now run the setup script:

```bash
cd C:\Projects\asterdex-8621-main
setup-database.bat
```

**When prompted for password, enter:** `postgres123`

You should see:
```
✅ Database 'finaster_mlm' created
✅ Schema imported
✅ Seed data imported

Test Credentials:
  Email: user@finaster.com
  Password: user123
  Expected Earnings: $1,500
```

## 🚀 Step 5: Start Application (1 minute)

```bash
npm run dev:all
```

This will start:
- **API Server:** http://localhost:3001
- **Frontend:** http://localhost:5173

Wait for both to show "ready" messages.

## 🔓 Step 6: Test Login

1. Open browser: http://localhost:5173/auth/login
2. Click the **"👤 User"** button (Quick Login)
3. Should automatically login and redirect to dashboard
4. **SUCCESS!** You should see **$1,500** on the dashboard!

## 🎉 Success Indicators

✅ API Server terminal shows:
```
🚀 Finaster MLM API Server
📍 Server running on: http://localhost:3001
✅ API Server connected to PostgreSQL
```

✅ Frontend terminal shows:
```
VITE ready in xxx ms
➜  Local:   http://localhost:5173/
```

✅ Browser shows:
```
Dashboard
Total Earnings: $1,500
Active Packages: 1
Current Rank: GOLD
```

## ⚠️ Troubleshooting

### Installation fails:
- Make sure you're running as Administrator
- Close any antivirus temporarily
- Restart computer and try again

### Port 5432 already in use:
```bash
# Find what's using it
netstat -ano | findstr :5432

# Kill the process
taskkill /PID <PID> /F
```

### Password doesn't work:
- Make sure you typed `postgres123` correctly
- Password is case-sensitive
- Try resetting: Open pgAdmin → Right-click server → Properties → Connection

### setup-database.bat fails:
- Verify PostgreSQL is running:
  ```bash
  net start postgresql-x64-15
  ```
- Check password in the script is correct

## 📞 Need Help?

After completing these steps, let me know:
- ✅ If everything worked
- ❌ Which step failed (screenshot helps!)

---

**Current Status:** Ready to install PostgreSQL
**Next:** Download from link above and follow steps 1-6
**Estimated Time:** 10-15 minutes total
