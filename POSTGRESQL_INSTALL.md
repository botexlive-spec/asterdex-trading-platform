# PostgreSQL Installation Guide - Windows

## Step 1: Download PostgreSQL

1. **Download PostgreSQL 15:**
   - URL: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Select Windows x86-64 version
   - File: postgresql-15.x-windows-x64.exe (~280 MB)

## Step 2: Install PostgreSQL

1. **Run the installer** (as Administrator)

2. **Installation Settings:**
   - Installation Directory: `C:\Program Files\PostgreSQL\15`
   - Select Components:
     ✅ PostgreSQL Server
     ✅ pgAdmin 4 (GUI tool)
     ✅ Command Line Tools
     ✅ Stack Builder (optional)

3. **Data Directory:**
   - Default: `C:\Program Files\PostgreSQL\15\data`

4. **Set Password:**
   - Username: `postgres` (default superuser)
   - **Password:** `postgres123` (or your choice - remember this!)
   - ⚠️ Write this down!

5. **Port:**
   - Default: `5432`
   - Keep default unless port is in use

6. **Locale:**
   - Default locale (English)

7. **Click "Next" and wait for installation** (~5 minutes)

8. **Launch Stack Builder:** Uncheck (not needed)

## Step 3: Verify Installation

```bash
# Open PowerShell or CMD
cd "C:\Program Files\PostgreSQL\15\bin"

# Test connection (enter password when prompted)
psql -U postgres -h localhost

# Should see:
# postgres=#
```

## Step 4: Create Database

```bash
# In PowerShell/CMD
cd "C:\Program Files\PostgreSQL\15\bin"

# Create database
psql -U postgres -h localhost -c "CREATE DATABASE finaster_mlm;"

# Verify
psql -U postgres -h localhost -c "\l" | findstr finaster
```

## Step 5: Import Schema

```bash
# Navigate to project
cd C:\Projects\asterdex-8621-main

# Import schema
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h localhost -d finaster_mlm -f database\init\01_schema.sql

# Import seed data
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h localhost -d finaster_mlm -f database\init\02_seed_data.sql
```

## Step 6: Update .env

Create `.env` file:

```bash
# Copy template
cd C:\Projects\asterdex-8621-main
copy .env.local .env
```

Edit `.env` and update password:
```
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/finaster_mlm
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
```

## Step 7: Install Node Packages

```bash
cd C:\Projects\asterdex-8621-main

npm install pg bcryptjs jsonwebtoken
npm install -D @types/pg @types/bcryptjs @types/jsonwebtoken
```

## Step 8: Start Dev Server

```bash
npm run dev
```

Open http://localhost:5173/auth/login and click "👤 User" button!

## Troubleshooting

### Port 5432 in use:
```bash
# Find what's using port 5432
netstat -ano | findstr :5432

# Stop service
net stop postgresql-x64-15
net start postgresql-x64-15
```

### Password not working:
```bash
# Reset password
cd "C:\Program Files\PostgreSQL\15\bin"
psql -U postgres -h localhost
ALTER USER postgres PASSWORD 'postgres123';
```

### pgAdmin 4:
- Open pgAdmin from Start Menu
- Add server:
  - Name: Local PostgreSQL
  - Host: localhost
  - Port: 5432
  - Username: postgres
  - Password: postgres123

## Quick Commands

```bash
# Connect to database
psql -U postgres -h localhost -d finaster_mlm

# List tables
\dt

# Check users
SELECT email, full_name, total_earnings FROM users;

# Exit
\q
```

## Success Criteria

✅ PostgreSQL 15 installed
✅ finaster_mlm database created
✅ Schema and data imported
✅ Can connect via psql
✅ Test user exists with $1,500

Ready to proceed to app configuration!
