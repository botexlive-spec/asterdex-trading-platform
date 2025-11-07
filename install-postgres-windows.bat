@echo off
REM ================================================================
REM PostgreSQL 15 Quick Installation for Windows
REM ================================================================

echo.
echo ================================================================
echo   POSTGRESQL 15 - AUTOMATED INSTALLATION
echo ================================================================
echo.

REM Step 1: Download PostgreSQL installer
echo [Step 1/5] Downloading PostgreSQL 15 installer...
echo.
echo Opening download page in browser...
echo Please download: postgresql-15.x-windows-x64.exe
echo.
start https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
echo.
echo After download completes:
echo 1. Run the installer (postgresql-15.x-windows-x64.exe)
echo 2. Use these settings:
echo    - Installation Directory: C:\Program Files\PostgreSQL\15
echo    - Password: finaster_secure_2024
echo    - Port: 5432
echo    - Locale: Default
echo    - Components: Select ALL
echo.
pause

REM Step 2: Verify installation
echo.
echo [Step 2/5] Verifying PostgreSQL installation...
if not exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    echo.
    echo ERROR: PostgreSQL not found!
    echo Please ensure PostgreSQL 15 is installed in:
    echo C:\Program Files\PostgreSQL\15
    echo.
    pause
    exit /b 1
)
echo ✓ PostgreSQL found!

REM Step 3: Test connection
echo.
echo [Step 3/5] Testing database connection...
echo Please enter the password you set during installation:
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "SELECT version();"
if errorlevel 1 (
    echo.
    echo ERROR: Could not connect to PostgreSQL
    echo Please check:
    echo 1. PostgreSQL service is running
    echo 2. Password is correct
    echo.
    pause
    exit /b 1
)
echo ✓ Connection successful!

REM Step 4: Create database
echo.
echo [Step 4/5] Creating finaster_mlm database...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS finaster_mlm;"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE finaster_mlm;"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE USER finaster_admin WITH PASSWORD 'finaster_secure_2024';"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE finaster_mlm TO finaster_admin;"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "ALTER DATABASE finaster_mlm OWNER TO finaster_admin;"
echo ✓ Database created!

REM Step 5: Load schema and seed data
echo.
echo [Step 5/5] Loading database schema and seed data...
cd /d C:\Projects\asterdex-8621-main
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\01_schema.sql
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\02_seed_data.sql
echo ✓ Data loaded!

REM Verify
echo.
echo [Verification] Checking database...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -c "SELECT COUNT(*) as total_users FROM users;"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -c "SELECT email, total_earnings, current_rank FROM users WHERE email = 'user@finaster.com';"

echo.
echo ================================================================
echo   INSTALLATION COMPLETE!
echo ================================================================
echo.
echo PostgreSQL 15 is now installed and configured!
echo.
echo Database: finaster_mlm
echo User: finaster_admin
echo Password: finaster_secure_2024
echo Port: 5432
echo.
echo Test user created:
echo   Email: user@finaster.com
echo   Password: user123
echo   Earnings: $1,500
echo.
echo Next steps:
echo   1. Run: npm run dev:all
echo   2. Open: http://localhost:5173
echo   3. Login with user@finaster.com / user123
echo.
pause
