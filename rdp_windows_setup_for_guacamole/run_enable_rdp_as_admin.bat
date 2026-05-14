@echo off
REM run_enable_rdp_as_admin.bat
REM Double-click this file to run enable_rdp_windows.ps1 as Administrator.

set SCRIPT_DIR=%~dp0
set PS_SCRIPT=%SCRIPT_DIR%enable_rdp_windows.ps1

echo Starting RDP setup as Administrator...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%PS_SCRIPT%""'"

pause
