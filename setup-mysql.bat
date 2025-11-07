@echo off
REM ================================================================
REM Setup MySQL Database for Finaster MLM
REM ================================================================

echo.
echo ================================================================
echo   FINASTER MLM - MYSQL SETUP
echo ================================================================
echo.

SET MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

REM Check if MySQL is installed
if not exist %MYSQL_PATH% (
    echo ERROR: MySQL not found at %MYSQL_PATH%
    echo Please install MySQL 8.4 or update the path in this script.
    pause
    exit /b 1
)

echo [1/5] Testing MySQL connection...
echo.
echo Please enter your MySQL root password when prompted.
echo (Common passwords: root, admin, 123456, or leave empty)
echo.

REM Try to connect
%MYSQL_PATH% -u root -p -e "SELECT 'Connection successful!' as status;"
if errorlevel 1 (
    echo.
    echo ERROR: Could not connect to MySQL!
    echo Please check your MySQL root password.
    pause
    exit /b 1
)

echo.
echo [2/5] Creating database and loading schema...
%MYSQL_PATH% -u root -p < database\mysql\01_schema_mysql.sql
if errorlevel 1 (
    echo ERROR: Failed to create schema!
    pause
    exit /b 1
)
echo ✓ Schema loaded

echo.
echo [3/5] Loading seed data...
%MYSQL_PATH% -u root -p < database\mysql\02_seed_data_mysql.sql
if errorlevel 1 (
    echo ERROR: Failed to load seed data!
    pause
    exit /b 1
)
echo ✓ Seed data loaded

echo.
echo [4/5] Verifying database setup...
%MYSQL_PATH% -u root -p -e "USE finaster_mlm; SELECT COUNT(*) as total_users FROM users; SELECT email, total_earnings, current_rank FROM users WHERE email = 'user@finaster.com';"
if errorlevel 1 (
    echo ERROR: Verification failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Installing Node.js packages...
call npm install mysql2
if errorlevel 1 (
    echo WARNING: Could not install mysql2 package
    echo Please run: npm install mysql2
)

echo.
echo ================================================================
echo   SETUP COMPLETE!
echo ================================================================
echo.
echo Database: finaster_mlm
echo Total Users: 12 (1 admin + 1 test user + 10 downline)
echo.
echo Test Login:
echo   Email: user@finaster.com
echo   Password: user123
echo   Expected Earnings: $1,500
echo.
echo Next Steps:
echo   1. Update .env file with MySQL root password
echo   2. Run: npm run dev:all
echo   3. Open: http://localhost:5173
echo.
pause
