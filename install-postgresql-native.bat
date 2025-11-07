@echo off
REM ================================================================
REM Install PostgreSQL 15 Natively on Windows
REM ================================================================

echo.
echo ================================================================
echo   POSTGRESQL 15 NATIVE INSTALLATION
echo ================================================================
echo.

echo This script will guide you to install PostgreSQL 15 on Windows.
echo.
echo Step 1: Download PostgreSQL 15
echo ---------------------------------------------------------------
echo Opening download page...
start https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
echo.
echo Please download: PostgreSQL 15.x Windows x86-64
echo.
pause

echo.
echo Step 2: Install PostgreSQL
echo ---------------------------------------------------------------
echo.
echo IMPORTANT: During installation, set these values:
echo.
echo   - Password: finaster_secure_2024
echo   - Port: 5432
echo   - Locale: Default
echo   - Install components: PostgreSQL Server, pgAdmin 4, Command Line Tools
echo.
echo Press any key after installation completes...
pause

echo.
echo Step 3: Create Database
echo ---------------------------------------------------------------
echo.

REM Create database and user
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE finaster_mlm;"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE USER finaster_admin WITH PASSWORD 'finaster_secure_2024';"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE finaster_mlm TO finaster_admin;"

echo.
echo Step 4: Load Schema
echo ---------------------------------------------------------------
cd C:\Projects\asterdex-8621-main
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\01_schema.sql

echo.
echo Step 5: Load Seed Data
echo ---------------------------------------------------------------
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\02_seed_data.sql

echo.
echo ================================================================
echo   INSTALLATION COMPLETE!
echo ================================================================
echo.
echo PostgreSQL is now running natively on your system.
echo.
echo Next steps:
echo   1. Open new terminal
echo   2. Run: npm run dev:all
echo   3. Open: http://localhost:5173
echo   4. Login: user@finaster.com / user123
echo.
pause
