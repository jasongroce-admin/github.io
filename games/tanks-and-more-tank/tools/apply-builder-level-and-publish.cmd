@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-builder-level-and-publish.ps1" %*
if errorlevel 1 (
  echo.
  echo Level publish failed. Review the error above.
) else (
  echo.
  echo Level published to local + GitHub main/stage.
)
echo.
pause
