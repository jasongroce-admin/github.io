@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%apply-space-hero-ship.ps1" %*
if errorlevel 1 (
  echo.
  echo Hero ship update failed. Review the error above.
  pause
  exit /b 1
)
echo.
echo Hero ship update complete (local only).
pause
