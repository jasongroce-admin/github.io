param(
  [string]$SubmissionPath = "",
  [int]$Slot = 0
)

$scriptPath = Join-Path $PSScriptRoot "apply-builder-level.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -SubmissionPath $SubmissionPath -Slot $Slot
exit $LASTEXITCODE
