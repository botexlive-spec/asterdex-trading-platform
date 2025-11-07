@echo off
REM Apply Critical Database Schema Fixes
REM Run this script to apply all P0 database migrations

echo ========================================
echo APPLYING CRITICAL DATABASE FIXES
echo ========================================
echo.

set PGPASSWORD=Dubai@1234#
set DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
set DB_PORT=6543
set DB_NAME=postgres
set DB_USER=postgres.dsgtyrwtlpnckvcozfbc

echo 1. Fixing user_packages schema...
psql "postgresql://%DB_USER%:%PGPASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%" -f database\FIX_USER_PACKAGES_SCHEMA.sql
if %ERRORLEVEL% NEQ 0 (
    echo    FAILED - Please run manually via Supabase SQL Editor
) else (
    echo    SUCCESS
)

echo.
echo 2. Fixing commissions schema...
psql "postgresql://%DB_USER%:%PGPASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%" -f database\FIX_COMMISSIONS_SCHEMA.sql
if %ERRORLEVEL% NEQ 0 (
    echo    FAILED - Please run manually via Supabase SQL Editor
) else (
    echo    SUCCESS
)

echo.
echo 3. Creating transactions table...
psql "postgresql://%DB_USER%:%PGPASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%" -f database\CREATE_TRANSACTIONS_TABLE.sql
if %ERRORLEVEL% NEQ 0 (
    echo    FAILED - Please run manually via Supabase SQL Editor
) else (
    echo    SUCCESS
)

echo.
echo ========================================
echo MIGRATION COMPLETE
echo ========================================
echo.
echo If any migrations failed, run them manually:
echo https://supabase.com/dashboard/project/dsgtyrwtlpnckvcozfbc/editor
echo.
pause
