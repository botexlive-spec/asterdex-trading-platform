@echo off
REM ================================================================
REM Start Application (Native PostgreSQL - No Docker)
REM ================================================================

echo.
echo ================================================================
echo   STARTING FINASTER MLM APPLICATION
echo ================================================================
echo.

REM Check PostgreSQL is running
echo [1/3] Checking PostgreSQL...
"C:\Program Files\PostgreSQL\15\bin\pg_isready.exe" -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: PostgreSQL is not running!
    echo.
    echo Please start PostgreSQL service:
    echo   - Open Services (services.msc)
    echo   - Find "postgresql-x64-15"
    echo   - Click Start
    echo.
    echo Or restart PostgreSQL:
    net stop postgresql-x64-15
    net start postgresql-x64-15
    echo.
    pause
    exit /b 1
)
echo ✓ PostgreSQL is running

REM Check database exists
echo.
echo [2/3] Checking database...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Database 'finaster_mlm' not found!
    echo Please run: quick-install-postgres.bat
    echo.
    pause
    exit /b 1
)
echo ✓ Database is ready

echo.
echo [3/3] Starting application...
echo.
echo   Backend API: http://localhost:3001
echo   Frontend:    http://localhost:5173
echo   pgAdmin:     http://localhost:5050 (if installed)
echo.
echo   Test Login:
echo     Email: user@finaster.com
echo     Password: user123
echo.
echo ================================================================
echo   Press Ctrl+C to stop all servers
echo ================================================================
echo.

cd /d C:\Projects\asterdex-8621-main
npm run dev:all
