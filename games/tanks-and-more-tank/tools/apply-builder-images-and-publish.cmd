@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-builder-images-and-publish.ps1" %*
if errorlevel 1 (
  echo.
  echo Image publish failed. Review the error above.
) else (
  echo.
  echo Image publish complete (main + stage + GitHub).
)
echo.
pause
