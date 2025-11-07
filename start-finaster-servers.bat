@echo off
REM Finaster Auto-Start Script
REM This script starts both frontend and backend servers

echo ============================================================
echo Starting Finaster Development Servers
echo ============================================================

REM Change to project directory
cd /d "C:\Projects\asterdex-8621-main"

REM Kill any existing node processes on ports 3001 and 5173
echo Checking for existing processes...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3001') DO TaskKill /F /PID %%P 2>nul
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :5173') DO TaskKill /F /PID %%P 2>nul

REM Wait a moment for ports to be released
timeout /t 2 /nobreak >nul

REM Start backend server in minimized window
echo Starting backend API server (port 3001)...
start "Finaster Backend" /min cmd /c "cd /d C:\Projects\asterdex-8621-main && pnpm run dev:server"

REM Wait 5 seconds for backend to initialize
timeout /t 5 /nobreak >nul

REM Start frontend server in minimized window
echo Starting frontend dev server (port 5173)...
start "Finaster Frontend" /min cmd /c "cd /d C:\Projects\asterdex-8621-main && pnpm run dev"

echo.
echo ============================================================
echo Finaster servers are starting...
echo.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:3001
echo.
echo Servers are running in minimized windows.
echo Close those windows to stop the servers.
echo ============================================================
echo.

REM Wait a moment then open the browser
timeout /t 5 /nobreak >nul
start http://localhost:5173

exit
