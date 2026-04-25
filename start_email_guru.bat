@echo off
title E-mail Guru
cd /d "D:\Projects\E-mail Guru"
if exist ".next\dev\lock" del /f ".next\dev\lock" 2>nul
echo.
echo  ============================
echo   E-mail Guru - Starting...
echo  ============================
echo.
echo  URL: http://localhost:3101
echo.
npx next dev -p 3101
pause
