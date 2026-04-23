param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ImagePaths = @()
)

$scriptPath = Join-Path $PSScriptRoot "apply-builder-images.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath @ImagePaths
exit $LASTEXITCODE
