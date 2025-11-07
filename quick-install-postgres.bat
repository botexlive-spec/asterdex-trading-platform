@echo off
REM ================================================================
REM Quick PostgreSQL Installation using Chocolatey
REM ================================================================

echo.
echo ================================================================
echo   INSTALLING POSTGRESQL 15 WITH CHOCOLATEY
echo ================================================================
echo.

echo This will install PostgreSQL 15 automatically.
echo Password will be set to: finaster_secure_2024
echo.
pause

echo.
echo [1/3] Installing PostgreSQL 15...
choco install postgresql15 --params "/Password:finaster_secure_2024 /Port:5432" -y

if errorlevel 1 (
    echo.
    echo ERROR: Installation failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Waiting for PostgreSQL service to start...
timeout /t 10 /nobreak

REM Refresh environment variables
refreshenv

echo.
echo [3/3] Setting up database...

REM Create database
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE finaster_mlm;" 2>nul
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE USER finaster_admin WITH PASSWORD 'finaster_secure_2024';" 2>nul
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE finaster_mlm TO finaster_admin;" 2>nul
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "ALTER DATABASE finaster_mlm OWNER TO finaster_admin;" 2>nul

echo Loading schema...
cd /d C:\Projects\asterdex-8621-main
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\01_schema.sql -q

echo Loading seed data...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -f database\init\02_seed_data.sql -q

echo.
echo ================================================================
echo   INSTALLATION COMPLETE!
echo ================================================================
echo.

REM Verify
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -c "SELECT email, total_earnings, current_rank FROM users WHERE email = 'user@finaster.com';"

echo.
echo PostgreSQL is ready!
echo.
echo Test Login:
echo   Email: user@finaster.com
echo   Password: user123
echo   Expected Earnings: $1,500
echo.
echo Next: Run "npm run dev:all" to start the application
echo.
pause
