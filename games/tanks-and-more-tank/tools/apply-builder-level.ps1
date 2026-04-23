param(
  [string]$SubmissionPath = "",
  [int]$Slot = 0,
  [switch]$Publish
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms

$mainRepo = "C:\REPO\github.io-main"
$stageRepo = "C:\REPO\Stagejasongroce-online"
$gameRelativeDir = "games\tanks-and-more-tank"
$levelsRelativeDir = "$gameRelativeDir\levels"
$manifestRelativePath = "$levelsRelativeDir\level-manifest.json"

$mainLevelsDir = Join-Path $mainRepo $levelsRelativeDir
$stageLevelsDir = Join-Path $stageRepo $levelsRelativeDir
$mainManifestPath = Join-Path $mainRepo $manifestRelativePath
$stageManifestPath = Join-Path $stageRepo $manifestRelativePath

function Select-SubmissionFile {
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Title = "Select Tanks level submission file"
  $dialog.Filter = "Tank Level Submission (*.tanklevel.json)|*.tanklevel.json|JSON (*.json)|*.json|All files (*.*)|*.*"
  $dialog.Multiselect = $false
  $dialog.InitialDirectory = "C:\Users\jgroce\Downloads"
  if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
  return $dialog.FileName
}

function Read-JsonFile([string]$path) {
  return (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)
}

function Normalize-LevelObject($obj) {
  if ($obj.level) { return $obj.level }
  return $obj
}

function Validate-LevelObject($levelObj) {
  if ($null -eq $levelObj) { throw "Submission missing level data." }
  if ($null -eq $levelObj.terrain) { throw "Submission missing terrain array." }
  if (-not ($levelObj.terrain -is [System.Collections.IEnumerable])) { throw "Terrain must be an array." }
  if ($null -eq $levelObj.heroSpawn -or $null -eq $levelObj.enemySpawn) {
    throw "Submission requires heroSpawn and enemySpawn."
  }
}

function Upsert-LevelManifest([string]$manifestPath, [int]$slot, [string]$title, [string]$difficulty, [string]$fileName) {
  $manifest = @{ version = 1; updatedAt = (Get-Date).ToString("s"); levels = @() }
  if (Test-Path -LiteralPath $manifestPath) {
    $raw = Read-JsonFile -path $manifestPath
    if ($raw.levels) {
      $levels = @()
      foreach ($l in $raw.levels) { $levels += ,$l }
      $manifest.levels = $levels
    }
    if ($raw.version) { $manifest.version = [int]$raw.version }
  }

  $manifest.levels = @($manifest.levels | Where-Object { [int]$_.slot -ne $slot })
  $manifest.levels += [ordered]@{
    slot = $slot
    title = $title
    difficulty = $difficulty
    file = $fileName
  }
  $manifest.levels = @($manifest.levels | Sort-Object { [int]$_.slot })
  $manifest.updatedAt = (Get-Date).ToString("s")
  Set-Content -LiteralPath $manifestPath -Value ($manifest | ConvertTo-Json -Depth 20) -Encoding UTF8
}

function Git-Run([string]$repo, [string[]]$args) {
  & git -C $repo @args
  if ($LASTEXITCODE -ne 0) {
    throw "git failed in ${repo}: git $($args -join ' ')"
  }
}

function Push-WithRetry([string]$repo) {
  & git -C $repo push origin main
  if ($LASTEXITCODE -eq 0) { return }
  Git-Run -repo $repo -args @("fetch", "origin", "main")
  Git-Run -repo $repo -args @("pull", "--rebase", "origin", "main")
  Git-Run -repo $repo -args @("push", "origin", "main")
}

function Apply-LevelToRepo([string]$repo, [string]$levelsDir, [string]$manifestPath, [int]$slot, $levelObj) {
  if (-not (Test-Path -LiteralPath $levelsDir)) {
    New-Item -ItemType Directory -Path $levelsDir -Force | Out-Null
  }

  $safeTitle = [regex]::Replace(([string]$levelObj.title), '[^a-zA-Z0-9]+', '-').Trim('-').ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($safeTitle)) { $safeTitle = "tank-level" }
  $fileName = "slot-{0:D2}-{1}.json" -f $slot, $safeTitle
  $targetFilePath = Join-Path $levelsDir $fileName

  $payload = [ordered]@{
    schema = "tank-level-builder-v1"
    level = $levelObj
  }
  Set-Content -LiteralPath $targetFilePath -Value ($payload | ConvertTo-Json -Depth 100) -Encoding UTF8

  $difficulty = [string]$levelObj.difficulty
  if ([string]::IsNullOrWhiteSpace($difficulty)) { $difficulty = "easy" }
  Upsert-LevelManifest -manifestPath $manifestPath -slot $slot -title ([string]$levelObj.title) -difficulty $difficulty -file $fileName
}

if ([string]::IsNullOrWhiteSpace($SubmissionPath)) {
  $SubmissionPath = Select-SubmissionFile
}
if ([string]::IsNullOrWhiteSpace($SubmissionPath)) {
  throw "No submission file selected."
}
if (-not (Test-Path -LiteralPath $SubmissionPath)) {
  throw "Submission file not found: $SubmissionPath"
}

$raw = Read-JsonFile -path $SubmissionPath
$levelObj = Normalize-LevelObject $raw
Validate-LevelObject $levelObj

$targetSlot = if ($Slot -ge 1) { $Slot } elseif ($raw.integrationNotes.targetSlot) { [int]$raw.integrationNotes.targetSlot } else { [int]$levelObj.slot }
if ($targetSlot -lt 1) { $targetSlot = 1 }
if ($targetSlot -gt 15) { $targetSlot = 15 }
$levelObj.slot = $targetSlot
if ([string]::IsNullOrWhiteSpace([string]$levelObj.title)) { $levelObj.title = "Tank Builder Level $targetSlot" }
if ([string]::IsNullOrWhiteSpace([string]$levelObj.difficulty)) { $levelObj.difficulty = "easy" }

Apply-LevelToRepo -repo $mainRepo -levelsDir $mainLevelsDir -manifestPath $mainManifestPath -slot $targetSlot -levelObj $levelObj
Write-Host "Applied level slot $targetSlot to main repo."

if (-not $Publish) {
  Write-Host "Local apply complete. Run publish wrapper if you want push to GitHub + Stage."
  exit 0
}

Apply-LevelToRepo -repo $stageRepo -levelsDir $stageLevelsDir -manifestPath $stageManifestPath -slot $targetSlot -levelObj $levelObj
Write-Host "Applied level slot $targetSlot to stage repo."

Git-Run -repo $mainRepo -args @("add", $manifestRelativePath, "$levelsRelativeDir\*.json")
& git -C $mainRepo commit -m "Apply tank builder level slot $targetSlot"
if ($LASTEXITCODE -ne 0) { Write-Host "No main changes to commit." }
Push-WithRetry -repo $mainRepo

Git-Run -repo $stageRepo -args @("add", $manifestRelativePath, "$levelsRelativeDir\*.json")
& git -C $stageRepo commit -m "Apply tank builder level slot $targetSlot"
if ($LASTEXITCODE -ne 0) { Write-Host "No stage changes to commit." }
Push-WithRetry -repo $stageRepo

Write-Host "Published level slot $targetSlot to main + stage."
