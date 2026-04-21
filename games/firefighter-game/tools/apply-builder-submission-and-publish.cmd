@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%apply-builder-submission-and-publish.ps1" %*
if errorlevel 1 (
  echo.
  echo Publish failed. Review the error above.
  pause
  exit /b 1
)
echo.
echo Publish complete.
pause
