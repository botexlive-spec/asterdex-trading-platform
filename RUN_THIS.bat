@echo off
REM ================================================================
REM Quick Setup - Just paste your MySQL password once
REM ================================================================

echo.
echo ================================================================
echo   FINASTER MLM - QUICK MYSQL SETUP
echo ================================================================
echo.

SET MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

echo What is your MySQL root password?
echo (Common: root, admin, 123456, or leave empty and press Enter)
set /p MYSQL_PASSWORD=Password:

echo.
echo [1/4] Testing connection...
%MYSQL_PATH% -u root -p%MYSQL_PASSWORD% -e "SELECT 'Connected!' as status;" 2>nul
if errorlevel 1 (
    echo ERROR: Wrong password or MySQL not running!
    echo.
    echo Try these common passwords:
    echo - root
    echo - admin
    echo - 123456
    echo - (empty - just press Enter)
    pause
    exit /b 1
)
echo ✓ Connected to MySQL

echo.
echo [2/4] Creating database and schema...
%MYSQL_PATH% -u root -p%MYSQL_PASSWORD% < database\mysql\01_schema_mysql.sql 2>nul
echo ✓ Schema created

echo.
echo [3/4] Loading test data...
%MYSQL_PATH% -u root -p%MYSQL_PASSWORD% < database\mysql\02_seed_data_mysql.sql 2>nul
echo ✓ Data loaded

echo.
echo [4/4] Verifying...
%MYSQL_PATH% -u root -p%MYSQL_PASSWORD% -e "USE finaster_mlm; SELECT email, total_earnings, current_rank FROM users WHERE email = 'user@finaster.com';" 2>nul

echo.
echo ================================================================
echo   DATABASE READY!
echo ================================================================
echo.
echo Now update your .env file:
echo   MYSQL_PASSWORD=%MYSQL_PASSWORD%
echo.
pause

echo.
echo Installing mysql2 package...
call npm install mysql2

echo.
echo ================================================================
echo   ALL DONE! Ready to start
echo ================================================================
echo.
echo Run: npm run dev:all
echo Then open: http://localhost:5173
echo Login: user@finaster.com / user123
echo.
pause
