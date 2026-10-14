@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "runtime\node.exe" goto missing
"runtime\node.exe" "scripts\repair-participant-cache.js"
pause
exit /b
:missing
echo Extract this update into the existing OlympiadTrial folder, beside start-olympiad.cmd.
pause
exit /b 1
