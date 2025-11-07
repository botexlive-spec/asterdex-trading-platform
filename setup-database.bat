@echo off
REM ============================================================================
REM PostgreSQL Setup Script for Finaster MLM
REM ============================================================================

echo.
echo ============================================================================
echo  Finaster MLM - PostgreSQL Database Setup
echo ============================================================================
echo.

REM Check if PostgreSQL is installed
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    set PSQL="C:\Program Files\PostgreSQL\15\bin\psql.exe"
    echo [OK] Found PostgreSQL 15
) else if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"
    echo [OK] Found PostgreSQL 16
) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
    set PSQL="C:\Program Files\PostgreSQL\14\bin\psql.exe"
    echo [OK] Found PostgreSQL 14
) else (
    echo [ERROR] PostgreSQL not found!
    echo.
    echo Please install PostgreSQL first:
    echo 1. Download from: https://www.postgresql.org/download/windows/
    echo 2. Run installer and set password for 'postgres' user
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo Enter PostgreSQL password for user 'postgres':
set /p PG_PASSWORD=Password:

echo.
echo Creating database...
%PSQL% -U postgres -h localhost -c "DROP DATABASE IF EXISTS finaster_mlm;" 2>nul
%PSQL% -U postgres -h localhost -c "CREATE DATABASE finaster_mlm;"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create database. Check password and try again.
    pause
    exit /b 1
)
echo [OK] Database 'finaster_mlm' created

echo.
echo Importing schema...
%PSQL% -U postgres -h localhost -d finaster_mlm -f database\init\01_schema.sql
if %errorlevel% neq 0 (
    echo [ERROR] Failed to import schema
    pause
    exit /b 1
)
echo [OK] Schema imported

echo.
echo Importing seed data...
%PSQL% -U postgres -h localhost -d finaster_mlm -f database\init\02_seed_data.sql
if %errorlevel% neq 0 (
    echo [ERROR] Failed to import seed data
    pause
    exit /b 1
)
echo [OK] Seed data imported

echo.
echo Verifying test user...
%PSQL% -U postgres -h localhost -d finaster_mlm -c "SELECT email, full_name, total_earnings FROM users WHERE email = 'user@finaster.com';"

echo.
echo Creating .env file...
if exist .env (
    echo [WARN] .env already exists, creating .env.new instead
    (
        echo DATABASE_URL=postgresql://postgres:%PG_PASSWORD%@localhost:5432/finaster_mlm
        echo POSTGRES_USER=postgres
        echo POSTGRES_PASSWORD=%PG_PASSWORD%
        echo POSTGRES_DB=finaster_mlm
        echo POSTGRES_HOST=localhost
        echo POSTGRES_PORT=5432
        echo JWT_SECRET=finaster_jwt_secret_change_in_production_2024
        echo VITE_APP_NAME=Finaster
        echo NODE_ENV=development
    ) > .env.new
    echo [OK] Created .env.new - please rename to .env
) else (
    (
        echo DATABASE_URL=postgresql://postgres:%PG_PASSWORD%@localhost:5432/finaster_mlm
        echo POSTGRES_USER=postgres
        echo POSTGRES_PASSWORD=%PG_PASSWORD%
        echo POSTGRES_DB=finaster_mlm
        echo POSTGRES_HOST=localhost
        echo POSTGRES_PORT=5432
        echo JWT_SECRET=finaster_jwt_secret_change_in_production_2024
        echo VITE_APP_NAME=Finaster
        echo NODE_ENV=development
    ) > .env
    echo [OK] Created .env file
)

echo.
echo ============================================================================
echo  Database Setup Complete!
echo ============================================================================
echo.
echo Test Credentials:
echo   Email: user@finaster.com
echo   Password: user123
echo   Expected Earnings: $1,500
echo.
echo Next Steps:
echo   1. npm install pg bcryptjs jsonwebtoken
echo   2. npm run dev
echo   3. Open http://localhost:5173/auth/login
echo   4. Click "User" button to login
echo.
pause
