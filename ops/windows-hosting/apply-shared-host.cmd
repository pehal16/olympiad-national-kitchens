@echo off
chcp 65001 >nul
cd /d "%~dp0"
"runtime\node.exe" ".update-shared-host\apply-shared-host.js"
pause
