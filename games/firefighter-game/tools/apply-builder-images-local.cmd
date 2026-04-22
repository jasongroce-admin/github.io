@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%apply-builder-images.ps1" %*
if errorlevel 1 (
  echo.
  echo Image import failed. Review the error above.
  pause
  exit /b 1
)
echo.
echo Image import complete (local only).
pause
