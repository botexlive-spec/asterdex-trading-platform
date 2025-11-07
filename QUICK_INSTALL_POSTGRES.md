# Quick PostgreSQL Installation (Without Docker)

## Problem
Docker Desktop is taking too long to start.

## Solution
Install PostgreSQL 15 natively on Windows (faster and simpler).

---

## Method 1: Using Chocolatey (5 minutes)

### Step 1: Check if Chocolatey is installed
```powershell
choco --version
```

If you get a version number, you have Chocolatey. Skip to Step 3.

### Step 2: Install Chocolatey (if needed)
Open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Step 3: Install PostgreSQL
```powershell
choco install postgresql15 --params '/Password:finaster_secure_2024 /Port:5432' -y
```

### Step 4: Create Database
```powershell
cd C:\Projects\asterdex-8621-main

# Create database
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE finaster_mlm;"

# Create user
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE USER finaster_admin WITH PASSWORD 'finaster_secure_2024';"

# Grant privileges
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE finaster_mlm TO finaster_admin;"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "ALTER DATABASE finaster_mlm OWNER TO finaster_admin;"

# Load schema
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\01_schema.sql

# Load seed data
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\02_seed_data.sql
```

### Step 5: Start Application
```bash
npm run dev:all
```

---

## Method 2: Manual Installation (10 minutes)

### Step 1: Download PostgreSQL
1. Go to: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Download: **PostgreSQL 15.x Windows x86-64**
3. Run the installer

### Step 2: Install with These Settings
- Installation Directory: Default (C:\Program Files\PostgreSQL\15)
- Password: `finaster_secure_2024`
- Port: `5432`
- Locale: Default
- Components: Select all (PostgreSQL Server, pgAdmin 4, Command Line Tools)

### Step 3: Add to PATH (Optional)
Add `C:\Program Files\PostgreSQL\15\bin` to your system PATH.

### Step 4: Create Database
Open Command Prompt or PowerShell:

```bash
cd C:\Projects\asterdex-8621-main

# Create database
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE finaster_mlm;"

# Create user
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE USER finaster_admin WITH PASSWORD 'finaster_secure_2024';"

# Grant privileges
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE finaster_mlm TO finaster_admin;"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "ALTER DATABASE finaster_mlm OWNER TO finaster_admin;"

# Load schema (enter password: finaster_secure_2024)
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\01_schema.sql

# Load seed data
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\02_seed_data.sql
```

### Step 5: Verify Installation
```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -c "SELECT COUNT(*) FROM users;"
```

Expected output: 12 (1 admin + 1 test user + 10 downline)

### Step 6: Start Application
```bash
npm run dev:all
```

---

## Verification

After installation, test the connection:

```bash
# Test database connection
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U finaster_admin -d finaster_mlm -c "SELECT email, total_earnings FROM users WHERE email = 'user@finaster.com';"
```

Expected output:
```
       email        | total_earnings
--------------------+----------------
 user@finaster.com  |        1500.00
```

---

## Start the Application

```bash
cd C:\Projects\asterdex-8621-main

# Terminal 1: Start backend
npm run dev:server

# Terminal 2: Start frontend
npm run dev
```

Or use the combined command:
```bash
npm run dev:all
```

---

## Test Login

1. Open http://localhost:5173
2. Login:
   - Email: user@finaster.com
   - Password: user123
3. Verify dashboard shows $1,500 earnings

---

## Benefits of Native Installation

✅ No Docker overhead
✅ Faster startup
✅ Runs as Windows service (auto-start on boot)
✅ Better Windows integration
✅ pgAdmin 4 included
✅ Simpler troubleshooting

---

## pgAdmin Access

After installation, pgAdmin 4 is available:
- Open pgAdmin from Start Menu
- Add server:
  - Name: Finaster Local
  - Host: localhost
  - Port: 5432
  - Database: finaster_mlm
  - Username: finaster_admin
  - Password: finaster_secure_2024

---

## Troubleshooting

### Port 5432 already in use
```bash
# Check what's using the port
netstat -ano | findstr :5432

# If it's MySQL, change MySQL port or stop it:
net stop MySQL84
```

### Password authentication fails
Make sure you're using the correct password: `finaster_secure_2024`

Or reset it:
```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "ALTER USER finaster_admin WITH PASSWORD 'finaster_secure_2024';"
```

### psql command not found
Use full path:
```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe"
```

---

## Next Steps

Once PostgreSQL is running:
1. ✅ Start application: `npm run dev:all`
2. ✅ Open http://localhost:5173
3. ✅ Login with user@finaster.com / user123
4. ✅ Verify $1,500 earnings displayed

Done! 🎉
