@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%youlevel-image-loader.ps1" %*
if errorlevel 1 (
  echo.
  echo Image import failed.
) else (
  echo.
  echo Image import complete.
)
pause
