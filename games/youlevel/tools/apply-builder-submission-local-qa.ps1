param(
  [string]$SubmissionPath = "",
  [int]$Slot = 0,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$mainRepo = "C:\REPO\github.io-main"
$stageRepo = "C:\REPO\Stagejasongroce-online"
$mainHtml = Join-Path $mainRepo "games\firefighter-game\mobile-deluxe-23.html"
$stageHtml = Join-Path $stageRepo "games\firefighter-game\mobile-deluxe-23.html"
$scriptRelativePath = "games/firefighter-game/mobile-deluxe-23.html"
$statePath = Join-Path $mainRepo "games\firefighter-game\.kvfd-local-qa-state.json"

function Select-SubmissionFile {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Title = "Select KVFD submission file"
  $dialog.Filter = "KVFD Submission (*.kvfdsubmission.json)|*.kvfdsubmission.json|JSON (*.json)|*.json|All files (*.*)|*.*"
  $dialog.Multiselect = $false
  $dialog.InitialDirectory = "C:\Users\jgroce\Downloads"
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

function To-Base64Utf8([string]$text) {
  if ($null -eq $text) { $text = "" }
  return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text))
}

function From-Base64Utf8([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return "" }
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($text))
}

function Save-QAState([int]$targetSlot, [string]$submissionFile, [string]$levelName, [string]$mainBefore, [string]$stageBefore) {
  $stateObj = [ordered]@{
    createdAt = (Get-Date).ToString("s")
    slot = $targetSlot
    submissionPath = $submissionFile
    levelName = $levelName
    mainHtmlPath = $mainHtml
    stageHtmlPath = $stageHtml
    mainHtmlBeforeBase64 = To-Base64Utf8 $mainBefore
    stageHtmlBeforeBase64 = To-Base64Utf8 $stageBefore
  }
  Set-Content -LiteralPath $statePath -Value ($stateObj | ConvertTo-Json -Depth 10) -Encoding UTF8
}

function Restore-QAStateFromFile {
  if (-not (Test-Path -LiteralPath $statePath)) {
    throw "Could not find local QA state file: $statePath"
  }
  $state = Read-JsonFile -path $statePath
  $mainBefore = From-Base64Utf8 ([string]$state.mainHtmlBeforeBase64)
  $stageBefore = From-Base64Utf8 ([string]$state.stageHtmlBeforeBase64)
  Set-Content -LiteralPath $mainHtml -Value $mainBefore -Encoding UTF8
  Set-Content -LiteralPath $stageHtml -Value $stageBefore -Encoding UTF8
  Remove-Item -LiteralPath $statePath -Force
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

function Commit-And-Push([int]$targetSlot, [string]$levelName) {
  $commitMsg = "Apply builder submission slot ${targetSlot}: $levelName"

  if (Repo-HasFileChanges -repo $mainRepo -path $scriptRelativePath) {
    Git-Run -repo $mainRepo -gitArgs @("add", $scriptRelativePath)
    Git-Run -repo $mainRepo -gitArgs @("commit", "-m", $commitMsg)
    Push-WithRetry -repo $mainRepo
  } else {
    Write-Host "No staged level file changes found in Main repo."
  }

  if (Repo-HasFileChanges -repo $stageRepo -path $scriptRelativePath) {
    Git-Run -repo $stageRepo -gitArgs @("add", $scriptRelativePath)
    Git-Run -repo $stageRepo -gitArgs @("commit", "-m", $commitMsg)
    Push-WithRetry -repo $stageRepo
  } else {
    Write-Host "No staged level file changes found in Stage repo."
  }
}

function Show-QAActionDialog([string]$levelName, [int]$targetSlot) {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing

  $form = New-Object System.Windows.Forms.Form
  $form.Text = "KVFD Local QA"
  $form.StartPosition = "CenterScreen"
  $form.Size = New-Object System.Drawing.Size(720, 270)
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.FormBorderStyle = "FixedDialog"
  $form.TopMost = $true

  $label = New-Object System.Windows.Forms.Label
  $label.AutoSize = $false
  $label.Size = New-Object System.Drawing.Size(680, 120)
  $label.Location = New-Object System.Drawing.Point(18, 14)
  $label.Font = New-Object System.Drawing.Font("Segoe UI", 10)
  $label.Text = "Local files were updated for slot ${targetSlot}:`r`n$levelName`r`n`r`nTest in browser now. When ready, choose Commit or Undo.`r`nUse Keep if you want to close and decide later."
  $form.Controls.Add($label)

  $btnOpen = New-Object System.Windows.Forms.Button
  $btnOpen.Text = "Open Local Game"
  $btnOpen.Size = New-Object System.Drawing.Size(150, 36)
  $btnOpen.Location = New-Object System.Drawing.Point(18, 160)
  $btnOpen.Add_Click({
    Start-Process $mainHtml | Out-Null
  })
  $form.Controls.Add($btnOpen)

  $btnCommit = New-Object System.Windows.Forms.Button
  $btnCommit.Text = "Commit"
  $btnCommit.Size = New-Object System.Drawing.Size(140, 36)
  $btnCommit.Location = New-Object System.Drawing.Point(300, 160)
  $btnCommit.DialogResult = [System.Windows.Forms.DialogResult]::Yes
  $form.Controls.Add($btnCommit)

  $btnUndo = New-Object System.Windows.Forms.Button
  $btnUndo.Text = "Undo"
  $btnUndo.Size = New-Object System.Drawing.Size(140, 36)
  $btnUndo.Location = New-Object System.Drawing.Point(450, 160)
  $btnUndo.DialogResult = [System.Windows.Forms.DialogResult]::No
  $form.Controls.Add($btnUndo)

  $btnKeep = New-Object System.Windows.Forms.Button
  $btnKeep.Text = "Keep (No Commit)"
  $btnKeep.Size = New-Object System.Drawing.Size(160, 36)
  $btnKeep.Location = New-Object System.Drawing.Point(540, 160)
  $btnKeep.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($btnKeep)

  $form.AcceptButton = $btnCommit
  $form.CancelButton = $btnKeep

  $result = $form.ShowDialog()
  $form.Dispose()
  return $result
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

$levelName = [string]$pkg.level.name
if ([string]::IsNullOrWhiteSpace($levelName)) { $levelName = "Custom Builder Level" }

Sync-MainBranch -repo $mainRepo
Sync-MainBranch -repo $stageRepo

$mainBefore = Get-Content -LiteralPath $mainHtml -Raw
$stageBefore = Get-Content -LiteralPath $stageHtml -Raw
Save-QAState -targetSlot $targetSlot -submissionFile $SubmissionPath -levelName $levelName -mainBefore $mainBefore -stageBefore $stageBefore

Update-SourceOverridesInHtml -htmlPath $mainHtml -slot $targetSlot -levelObj $pkg.level
Copy-Item -LiteralPath $mainHtml -Destination $stageHtml -Force

Write-Host "Local files updated for slot ${targetSlot}: $levelName"
Write-Host "Main:  $mainHtml"
Write-Host "Stage: $stageHtml"

if (-not $NoOpen) {
  Start-Process $mainHtml | Out-Null
}

$choice = Show-QAActionDialog -levelName $levelName -targetSlot $targetSlot
if ($choice -eq [System.Windows.Forms.DialogResult]::Yes) {
  Commit-And-Push -targetSlot $targetSlot -levelName $levelName
  if (Test-Path -LiteralPath $statePath) {
    Remove-Item -LiteralPath $statePath -Force
  }
  Write-Host "Commit complete. Pushed to Main + Stage."
  exit 0
}

if ($choice -eq [System.Windows.Forms.DialogResult]::No) {
  Restore-QAStateFromFile
  Write-Host "Undo complete. Local files restored to pre-apply state."
  exit 0
}

Write-Host "Keeping local applied changes without commit. You can commit manually later."
Write-Host "Recovery state file kept at: $statePath"
exit 0
