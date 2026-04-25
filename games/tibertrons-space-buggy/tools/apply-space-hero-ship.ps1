param(
  [string]$HeroSpriteRelativePath = 'images/vehicles/starfighter_side_512x256.webp',
  [int]$HeroWidth = 128,
  [int]$HeroHeight = 64,
  [switch]$Publish
)

$ErrorActionPreference = 'Stop'

$mainRepo = 'C:\REPO\github.io-main'
$stageRepo = 'C:\REPO\Stagejasongroce-online'
$gameRelativeDir = 'games\tibertrons-space-buggy'
$appRelativePath = "$gameRelativeDir\app.js"

$mainGameDir = Join-Path $mainRepo $gameRelativeDir
$mainAppPath = Join-Path $mainRepo $appRelativePath
$mainHeroPath = Join-Path $mainGameDir $HeroSpriteRelativePath

if (-not (Test-Path -LiteralPath $mainAppPath)) {
  throw "Main app.js not found: $mainAppPath"
}
if (-not (Test-Path -LiteralPath $mainHeroPath)) {
  throw "Hero sprite path not found in main repo: $mainHeroPath"
}

function Update-AppJsHeroConfig([string]$appPath, [string]$heroSprite, [int]$heroW, [int]$heroH) {
  $raw = Get-Content -LiteralPath $appPath -Raw

  $raw = [regex]::Replace($raw, 'const\s+SPACE_HERO_WIDTH\s*=\s*\d+\s*;', "const SPACE_HERO_WIDTH = $heroW;")
  $raw = [regex]::Replace($raw, 'const\s+SPACE_HERO_HEIGHT\s*=\s*\d+\s*;', "const SPACE_HERO_HEIGHT = $heroH;")
  $raw = [regex]::Replace($raw, 'const\s+SPACE_HERO_SPRITE\s*=\s*"[^"]+"\s*;', "const SPACE_HERO_SPRITE = `"$heroSprite`";")

  if ($raw -match 'const\s+SPACE_HERO_FACES_RIGHT\s*=') {
    $raw = [regex]::Replace($raw, 'const\s+SPACE_HERO_FACES_RIGHT\s*=\s*(true|false)\s*;', 'const SPACE_HERO_FACES_RIGHT = true;')
  } else {
    $raw = [regex]::Replace(
      $raw,
      '(const\s+SPACE_HERO_SPRITE\s*=\s*"[^"]+"\s*;)',
      "`$1`r`n  const SPACE_HERO_FACES_RIGHT = true;"
    )
  }

  Set-Content -LiteralPath $appPath -Value $raw -Encoding UTF8
}

function Git-Run([string]$repo, [string[]]$gitArgs) {
  & git -C $repo @gitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git failed in ${repo}: git $($gitArgs -join ' ')"
  }
}

function Sync-RepoMain([string]$repo) {
  Git-Run -repo $repo -gitArgs @('fetch', 'origin', 'main')
  Git-Run -repo $repo -gitArgs @('checkout', 'main')
  Git-Run -repo $repo -gitArgs @('pull', '--rebase', '--autostash', 'origin', 'main')
}

function Repo-HasPathChanges([string]$repo, [string[]]$paths) {
  $out = & git -C $repo status --porcelain -- @paths
  if ($LASTEXITCODE -ne 0) { throw "git status failed in $repo" }
  return -not [string]::IsNullOrWhiteSpace(($out | Out-String))
}

Update-AppJsHeroConfig -appPath $mainAppPath -heroSprite $HeroSpriteRelativePath -heroW $HeroWidth -heroH $HeroHeight
Write-Host "Updated main hero ship settings in: $mainAppPath"
Write-Host "Hero sprite: $HeroSpriteRelativePath"
Write-Host "Hero size: ${HeroWidth}x${HeroHeight}"

if (-not $Publish) {
  Write-Host 'Local update complete (main repo only).'
  exit 0
}

if (-not (Test-Path -LiteralPath $stageRepo)) {
  throw "Stage repo not found: $stageRepo"
}

Sync-RepoMain -repo $mainRepo
Sync-RepoMain -repo $stageRepo

$stageAppPath = Join-Path $stageRepo $appRelativePath
$stageGameDir = Join-Path $stageRepo $gameRelativeDir
$stageHeroPath = Join-Path $stageGameDir $HeroSpriteRelativePath

if (-not (Test-Path -LiteralPath $stageHeroPath)) {
  $stageHeroDir = Split-Path -Parent $stageHeroPath
  if (-not (Test-Path -LiteralPath $stageHeroDir)) {
    New-Item -ItemType Directory -Path $stageHeroDir -Force | Out-Null
  }
  Copy-Item -LiteralPath $mainHeroPath -Destination $stageHeroPath -Force
  Write-Host "Copied hero sprite into stage repo: $stageHeroPath"
}

Update-AppJsHeroConfig -appPath $mainAppPath -heroSprite $HeroSpriteRelativePath -heroW $HeroWidth -heroH $HeroHeight
Update-AppJsHeroConfig -appPath $stageAppPath -heroSprite $HeroSpriteRelativePath -heroW $HeroWidth -heroH $HeroHeight

$paths = @(
  'games/tibertrons-space-buggy/app.js',
  "games/tibertrons-space-buggy/$HeroSpriteRelativePath".Replace('\', '/')
)

$commitMsg = "Update Tibertron hero ship sprite to $([IO.Path]::GetFileName($HeroSpriteRelativePath))"

if (Repo-HasPathChanges -repo $mainRepo -paths $paths) {
  Git-Run -repo $mainRepo -gitArgs (@('add') + $paths)
  Git-Run -repo $mainRepo -gitArgs @('commit', '-m', $commitMsg)
  Git-Run -repo $mainRepo -gitArgs @('push', 'origin', 'main')
} else {
  Write-Host 'No tracked hero-ship changes to commit in main repo.'
}

if (Repo-HasPathChanges -repo $stageRepo -paths $paths) {
  Git-Run -repo $stageRepo -gitArgs (@('add') + $paths)
  Git-Run -repo $stageRepo -gitArgs @('commit', '-m', $commitMsg)
  Git-Run -repo $stageRepo -gitArgs @('push', 'origin', 'main')
} else {
  Write-Host 'No tracked hero-ship changes to commit in stage repo.'
}

Write-Host 'Publish complete.'
