param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$InputFiles
)
$ErrorActionPreference='Stop'
function Read-Choice([string]$prompt,[string]$default='') {
  $msg = if($default){"$prompt [$default]"}else{$prompt}
  $v = Read-Host $msg
  if([string]::IsNullOrWhiteSpace($v)){ return $default }
  return $v.Trim()
}
function Slugify([string]$name){
  if([string]::IsNullOrWhiteSpace($name)){ return 'new-game' }
  $s = $name.ToLowerInvariant() -replace '[^a-z0-9]+','-'
  $s = $s.Trim('-')
  if([string]::IsNullOrWhiteSpace($s)){ $s='new-game' }
  return $s
}
function Ensure-Dir([string]$p){ if(!(Test-Path -LiteralPath $p)){ New-Item -ItemType Directory -Path $p | Out-Null } }
function Copy-IfMissing([string]$src,[string]$dst){ if(!(Test-Path -LiteralPath $dst)){ Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force } }
try {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $youlevelRoot = Split-Path -Parent $scriptDir
  $defaultRepo = 'C:\REPO\github.io-main'
  $repoRoot = Read-Choice 'Repository root' $defaultRepo
  if(!(Test-Path -LiteralPath $repoRoot)){ throw "Repo root not found: $repoRoot" }

  $packagePath = $null
  if($InputFiles -and $InputFiles.Count -gt 0){
    $packagePath = $InputFiles | Where-Object { $_ -match '\.json$' } | Select-Object -First 1
  }
  if(-not $packagePath){ $packagePath = Read-Choice 'Path to level package JSON (.youlevellevel.json or .json)' '' }
  if(!(Test-Path -LiteralPath $packagePath)){ throw "Package file not found: $packagePath" }

  $mode = Read-Choice 'Target mode: new or existing' 'existing'
  $gamesRoot = Join-Path $repoRoot 'games'
  Ensure-Dir $gamesRoot

  $gameSlug = ''
  if($mode -eq 'new'){
    $gameTitle = Read-Choice 'New game title' 'my-new-game'
    $gameSlug = Slugify $gameTitle
  } else {
    $existing = Read-Choice 'Existing game folder name under games' 'youlevel'
    $gameSlug = Slugify $existing
  }

  $gameDir = Join-Path $gamesRoot $gameSlug
  $levelsDir = Join-Path $gameDir 'levels'
  $imagesDir = Join-Path $gameDir 'images'
  Ensure-Dir $gameDir
  Ensure-Dir $levelsDir
  Ensure-Dir $imagesDir

  $templateDir = Join-Path $youlevelRoot 'runtime-template'
  if(Test-Path -LiteralPath $templateDir){
    Get-ChildItem -LiteralPath $templateDir -File | ForEach-Object {
      $dest = Join-Path $gameDir $_.Name
      if(!(Test-Path -LiteralPath $dest)){ Copy-Item -LiteralPath $_.FullName -Destination $dest -Force }
    }
  }

  $copyAssets = Read-Choice 'Copy complete YouLevel image set into target game? yes/no' 'no'
  if($copyAssets -eq 'yes'){
    $srcImages = Join-Path $youlevelRoot 'images'
    if(Test-Path -LiteralPath $srcImages){
      robocopy $srcImages $imagesDir /E /NFL /NDL /NJH /NJS /NC /NS | Out-Null
      if($LASTEXITCODE -gt 7){ throw "Image copy failed with robocopy code $LASTEXITCODE" }
    }
  }

  $pkgRaw = Get-Content -Raw -LiteralPath $packagePath
  $pkg = $pkgRaw | ConvertFrom-Json
  $sceneName = if($pkg.level.name){ [string]$pkg.level.name } else { 'Scene' }
  $sceneSlug = Slugify $sceneName
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $levelFile = "${sceneSlug}-${stamp}.youlevellevel.json"
  $levelPath = Join-Path $levelsDir $levelFile
  Set-Content -LiteralPath $levelPath -Value $pkgRaw -Encoding UTF8

  $manifestPath = Join-Path $levelsDir 'levels.json'
  $manifest = @{ gameTitle = $gameSlug; levels = @() }
  if(Test-Path -LiteralPath $manifestPath){
    try { $manifest = (Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json) } catch {}
  }
  if(-not $manifest.levels){ $manifest | Add-Member -NotePropertyName levels -NotePropertyValue @() -Force }
  $manifest.gameTitle = if($pkg.level.gameTitle){ [string]$pkg.level.gameTitle } else { $gameSlug }
  $entry = [ordered]@{
    name = $sceneName
    file = $levelFile
    importedAt = (Get-Date).ToString('s')
  }
  $manifest.levels = @($manifest.levels + $entry)
  ($manifest | ConvertTo-Json -Depth 50) | Set-Content -LiteralPath $manifestPath -Encoding UTF8

  Write-Host "Imported level: $levelFile"
  Write-Host "Target game folder: $gameDir"
  Write-Host "Manifest updated: $manifestPath"
}
catch {
  Write-Error $_
  exit 1
}
