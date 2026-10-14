@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "runtime\node.exe" goto missing
if not exist "scripts\verify-windows-host.js" goto missing
"runtime\node.exe" "scripts\verify-windows-host.js" --participants=70
if errorlevel 1 echo TEST FAILED. Preserve quality-report.json for investigation.
pause
exit /b
:missing
echo Extract this update into the existing OlympiadTrial folder, beside start-olympiad.cmd.
pause
exit /b 1
