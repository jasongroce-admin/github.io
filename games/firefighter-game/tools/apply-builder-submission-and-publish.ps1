param(
  [string]$SubmissionPath = "",
  [int]$Slot = 0
)

$ErrorActionPreference = "Stop"

$mainRepo = "C:\REPO\github.io-main"
$stageRepo = "C:\REPO\Stagejasongroce-online"
$mainHtml = Join-Path $mainRepo "games\firefighter-game\mobile-deluxe-23.html"
$stageHtml = Join-Path $stageRepo "games\firefighter-game\mobile-deluxe-23.html"
$scriptRelativePath = "games/firefighter-game/mobile-deluxe-23.html"

function Select-SubmissionFile {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Title = "Select KVFD submission file"
  $dialog.Filter = "KVFD Submission (*.kvfdsubmission.json)|*.kvfdsubmission.json|JSON (*.json)|*.json|All files (*.*)|*.*"
  $dialog.Multiselect = $false
  $dialog.InitialDirectory = "C:\REPO\github.io-main\games\firefighter-game"
  $result = $dialog.ShowDialog()
  if ($result -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
  return $dialog.FileName
}

function Read-JsonFile([string]$path) {
  return (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)
}

function Convert-ObjectToHashtable($obj) {
  if ($null -eq $obj) { return $null }
  if ($obj -is [System.Collections.IDictionary]) {
    $ht = @{}
    foreach ($k in $obj.Keys) { $ht[[string]$k] = Convert-ObjectToHashtable $obj[$k] }
    return $ht
  }
  if ($obj -is [System.Collections.IEnumerable] -and -not ($obj -is [string])) {
    $arr = @()
    foreach ($item in $obj) { $arr += ,(Convert-ObjectToHashtable $item) }
    return $arr
  }
  if ($obj -is [pscustomobject]) {
    $ht = @{}
    foreach ($p in $obj.PSObject.Properties) { $ht[$p.Name] = Convert-ObjectToHashtable $p.Value }
    return $ht
  }
  return $obj
}

function Update-SourceOverridesInHtml([string]$htmlPath, [int]$slot, $levelObj) {
  $raw = Get-Content -LiteralPath $htmlPath -Raw
  $patternPrimary = '(?s)(const\s+BUILDER_SOURCE_OVERRIDES_JSON\s*=\s*`/\*KVFD_SOURCE_OVERRIDES_START\*/\r?\n)(.*?)(\r?\n/\*KVFD_SOURCE_OVERRIDES_END\*/`;)'
  $patternFallback = '(?s)(/\*KVFD_SOURCE_OVERRIDES_START\*/\r?\n)(.*?)(\r?\n/\*KVFD_SOURCE_OVERRIDES_END\*/)'
  $match = [regex]::Match($raw, $patternPrimary)
  $usedPattern = $patternPrimary
  if (-not $match.Success) {
    $match = [regex]::Match($raw, $patternFallback)
    $usedPattern = $patternFallback
  }
  if (-not $match.Success) {
    throw "Could not find source override markers in $htmlPath"
  }
  $currentJson = ($match.Groups[2].Value).Trim()
  if ([string]::IsNullOrWhiteSpace($currentJson)) { $currentJson = "{}" }
  $parsed = $currentJson | ConvertFrom-Json
  $overrides = @{}
  if ($parsed -is [pscustomobject]) {
    foreach ($p in $parsed.PSObject.Properties) {
      $overrides[$p.Name] = Convert-ObjectToHashtable $p.Value
    }
  }
  $overrides[[string]$slot] = Convert-ObjectToHashtable $levelObj
  $updatedJson = ($overrides | ConvertTo-Json -Depth 100)
  $updated = [regex]::Replace(
    $raw,
    $usedPattern,
    [System.Text.RegularExpressions.MatchEvaluator]{
      param($m)
      return "$($m.Groups[1].Value)$updatedJson$($m.Groups[3].Value)"
    },
    1
  )
  Set-Content -LiteralPath $htmlPath -Value $updated -Encoding UTF8
}

function Git-Run([string]$repo, [string[]]$gitArgs) {
  & git -C $repo @gitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git command failed in ${repo}: git $($gitArgs -join ' ')"
  }
}

function Sync-MainBranch([string]$repo) {
  Git-Run -repo $repo -gitArgs @("fetch", "origin", "main")
  Git-Run -repo $repo -gitArgs @("checkout", "main")
  Git-Run -repo $repo -gitArgs @("pull", "--rebase", "--autostash", "origin", "main")
}

function Push-WithRetry([string]$repo) {
  & git -C $repo push origin main
  if ($LASTEXITCODE -eq 0) { return }
  Write-Host "Push rejected for $repo. Syncing and retrying once..."
  Git-Run -repo $repo -gitArgs @("fetch", "origin", "main")
  Git-Run -repo $repo -gitArgs @("pull", "--rebase", "origin", "main")
  Git-Run -repo $repo -gitArgs @("push", "origin", "main")
}

function Repo-HasFileChanges([string]$repo, [string]$path) {
  $out = & git -C $repo status --porcelain -- $path
  if ($LASTEXITCODE -ne 0) { throw "git status failed for $repo" }
  return -not [string]::IsNullOrWhiteSpace(($out | Out-String))
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

$pkg = Read-JsonFile -path $SubmissionPath
if ($null -eq $pkg.level) {
  throw "Submission does not contain a level object."
}

$targetSlot = if ($Slot -ge 1) { $Slot } else { [int]($pkg.integrationNotes.targetSlot) }
if ($targetSlot -lt 1) { $targetSlot = 1 }
if ($targetSlot -gt 23) { $targetSlot = 23 }

Sync-MainBranch -repo $mainRepo
Sync-MainBranch -repo $stageRepo

Update-SourceOverridesInHtml -htmlPath $mainHtml -slot $targetSlot -levelObj $pkg.level
Copy-Item -LiteralPath $mainHtml -Destination $stageHtml -Force

$levelName = [string]$pkg.level.name
if ([string]::IsNullOrWhiteSpace($levelName)) { $levelName = "Custom Builder Level" }
$commitMsg = "Apply builder submission slot ${targetSlot}: $levelName"

if (Repo-HasFileChanges -repo $mainRepo -path $scriptRelativePath) {
  Git-Run -repo $mainRepo -gitArgs @("add", $scriptRelativePath)
  Git-Run -repo $mainRepo -gitArgs @("commit", "-m", $commitMsg)
  Push-WithRetry -repo $mainRepo
}

if (Repo-HasFileChanges -repo $stageRepo -path $scriptRelativePath) {
  Git-Run -repo $stageRepo -gitArgs @("add", $scriptRelativePath)
  Git-Run -repo $stageRepo -gitArgs @("commit", "-m", $commitMsg)
  Push-WithRetry -repo $stageRepo
}

Write-Host "Done. Slot $targetSlot applied and pushed to Main + Stage."
