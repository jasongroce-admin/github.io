@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-builder-images-local.ps1" %*
if errorlevel 1 (
  echo.
  echo Image import failed. Review the error above.
) else (
  echo.
  echo Image import complete (local repo only).
)
echo.
pause
