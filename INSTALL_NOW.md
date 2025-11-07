# Install PostgreSQL NOW (No Docker Needed)

## You have Chocolatey! This will be super fast (5 minutes)

### Step 1: Run Installation Script

Open **PowerShell as Administrator** and run:

```powershell
cd C:\Projects\asterdex-8621-main
.\quick-install-postgres.bat
```

This will:
1. Install PostgreSQL 15 automatically
2. Create the finaster_mlm database  
3. Load all schema and seed data
4. Create test user with $1,500 earnings

### Step 2: Start Application

After installation completes:

```bash
.\start-without-docker.bat
```

### Step 3: Test Login

1. Open http://localhost:5173
2. Login:
   - Email: user@finaster.com
   - Password: user123
3. Verify dashboard shows $1,500

## That's It!

Total time: ~5 minutes

---

## Alternative: Manual Installation

If Chocolatey script fails, download manually:

1. Download: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Install with password: finaster_secure_2024
3. Run: .\install-postgres-windows.bat

---

## Troubleshooting

### Error: "Port 5432 already in use"
```bash
# Stop MySQL
net stop MySQL84

# Try again
.\quick-install-postgres.bat
```

### Error: "psql command not found"
Add to PATH:
```
C:\Program Files\PostgreSQL\15\bin
```

### Error: "PostgreSQL service not starting"
```bash
# Manual start
net start postgresql-x64-15
```

---

**Ready? Run quick-install-postgres.bat now!**
