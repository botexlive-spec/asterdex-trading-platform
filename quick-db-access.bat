@echo off
title Asterdex MLM - Database Access
color 0A

echo.
echo ========================================
echo   ASTERDEX MLM - DATABASE ACCESS
echo ========================================
echo.
echo Database: finaster_mlm
echo Host:     localhost:3306
echo User:     root
echo Password: root
echo.
echo ========================================
echo.

"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -proot finaster_mlm

pause
