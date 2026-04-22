param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$ImageFiles
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
try {
  if(-not $ImageFiles -or $ImageFiles.Count -eq 0){ throw 'Drag one or more image files onto this script.' }
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $defaultRepo = 'C:\REPO\github.io-main'
  $repoRoot = Read-Choice 'Repository root' $defaultRepo
  if(!(Test-Path -LiteralPath $repoRoot)){ throw "Repo root not found: $repoRoot" }
  $mode = Read-Choice 'Target mode: new or existing' 'existing'
  if($mode -eq 'new'){
    $title = Read-Choice 'New game title' 'my-new-game'
    $slug = Slugify $title
  } else {
    $slug = Slugify (Read-Choice 'Existing game folder name under games' 'youlevel')
  }
  $gameDir = Join-Path (Join-Path $repoRoot 'games') $slug
  $imagesDir = Join-Path $gameDir 'images'
  Ensure-Dir $imagesDir

  $manifestPath = Join-Path $gameDir 'image-manifest.json'
  $manifest = @{ game = $slug; images = @() }
  if(Test-Path -LiteralPath $manifestPath){
    try { $manifest = (Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json) } catch {}
  }
  if(-not $manifest.images){ $manifest | Add-Member -NotePropertyName images -NotePropertyValue @() -Force }

  foreach($img in $ImageFiles){
    if(!(Test-Path -LiteralPath $img)){ continue }
    $name = [IO.Path]::GetFileName($img)
    $dest = Join-Path $imagesDir $name
    Copy-Item -LiteralPath $img -Destination $dest -Force
    $key = ([IO.Path]::GetFileNameWithoutExtension($name).ToLowerInvariant() -replace '[^a-z0-9]+','_').Trim('_')
    $entry = [ordered]@{ key = $key; file = $name; addedAt = (Get-Date).ToString('s') }
    $manifest.images = @($manifest.images + $entry)
    Write-Host "Imported image: $name  (key: $key)"
  }
  ($manifest | ConvertTo-Json -Depth 20) | Set-Content -LiteralPath $manifestPath -Encoding UTF8
  Write-Host "Updated manifest: $manifestPath"
}
catch {
  Write-Error $_
  exit 1
}
