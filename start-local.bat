@echo off
REM ==================================================================
REM Finaster MLM - Local PostgreSQL Startup Script
REM ==================================================================

echo.
echo ==================================================================
echo   FINASTER MLM - LOCAL DEVELOPMENT SETUP
echo ==================================================================
echo.

REM Check if Docker is running
echo [1/6] Checking Docker status...
docker ps >nul 2>&1
if errorlevel 1 (
    echo.
    echo ============================================================
    echo    ERROR: Docker is not running!
    echo ============================================================
    echo.
    echo Please start Docker Desktop and wait for it to be ready.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)
echo     ✓ Docker is running
echo.

REM Start PostgreSQL with Docker Compose
echo [2/6] Starting PostgreSQL database...
docker-compose up -d
if errorlevel 1 (
    echo     ✗ Failed to start PostgreSQL
    pause
    exit /b 1
)
echo     ✓ PostgreSQL started
echo.

REM Wait for PostgreSQL to be ready
echo [3/6] Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul
:wait_for_db
docker exec finaster-postgres pg_isready -U finaster_admin -d finaster_mlm >nul 2>&1
if errorlevel 1 (
    echo     ... waiting for database ...
    timeout /t 2 /nobreak >nul
    goto wait_for_db
)
echo     ✓ PostgreSQL is ready
echo.

REM Check if data needs to be imported
echo [4/6] Checking database status...
docker exec finaster-postgres psql -U finaster_admin -d finaster_mlm -tAc "SELECT COUNT(*) FROM users WHERE email = 'user@finaster.com'" >nul 2>&1
if errorlevel 1 (
    echo     ℹ Database schema not fully set up
    echo     → Init scripts will run automatically
) else (
    echo     ✓ Database is set up
)
echo.

REM Start the application
echo [5/6] Starting application servers...
echo.
echo     Backend API will start on: http://localhost:3001
echo     Frontend will start on:    http://localhost:5173
echo     pgAdmin available at:      http://localhost:5050
echo.
echo ==================================================================
echo   APPLICATION IS STARTING...
echo ==================================================================
echo.
echo Press Ctrl+C to stop all servers
echo.

npm run dev:all
