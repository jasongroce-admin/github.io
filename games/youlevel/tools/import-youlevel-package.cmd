@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%import-youlevel-package.ps1" %*
if errorlevel 1 (
  echo.
  echo Import failed.
) else (
  echo.
  echo Import complete.
)
pause
