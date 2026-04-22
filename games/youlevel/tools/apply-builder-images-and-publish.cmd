@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%apply-builder-images.ps1" -Publish %*
if errorlevel 1 (
  echo.
  echo Image publish failed. Review the error above.
  pause
  exit /b 1
)
echo.
echo Image publish complete.
pause
