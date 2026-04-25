param(
  [string]$HeroSpriteRelativePath = 'images/vehicles/starfighter_side_512x256.webp',
  [int]$HeroWidth = 128,
  [int]$HeroHeight = 64
)

$scriptPath = Join-Path $PSScriptRoot 'apply-space-hero-ship.ps1'
& powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
  -HeroSpriteRelativePath $HeroSpriteRelativePath `
  -HeroWidth $HeroWidth `
  -HeroHeight $HeroHeight `
  -Publish
exit $LASTEXITCODE
