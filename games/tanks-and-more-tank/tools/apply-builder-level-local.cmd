@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-builder-level-local.ps1" %*
if errorlevel 1 (
  echo.
  echo Level apply failed. Review the error above.
) else (
  echo.
  echo Level applied locally.
)
echo.
pause
