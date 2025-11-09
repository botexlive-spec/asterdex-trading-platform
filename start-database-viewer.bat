@echo off
title MySQL Database Web Viewer
color 0A

echo.
echo ========================================
echo   MYSQL DATABASE WEB VIEWER
echo ========================================
echo.
echo Starting server...
echo.

cd /d "%~dp0"
start http://localhost:8080
node database-viewer-server.mjs

pause
