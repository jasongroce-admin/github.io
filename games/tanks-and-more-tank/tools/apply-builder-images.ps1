param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ImagePaths = @(),
  [switch]$Publish
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$mainRepo = "C:\REPO\github.io-main"
$stageRepo = "C:\REPO\Stagejasongroce-online"
$gameRelativeDir = "games\tanks-and-more-tank"
$imagesRelativeDir = "$gameRelativeDir\images"
$catalogRelativePath = "$gameRelativeDir\levels\image-catalog.json"

$mainImagesDir = Join-Path $mainRepo $imagesRelativeDir
$stageImagesDir = Join-Path $stageRepo $imagesRelativeDir
$mainCatalogPath = Join-Path $mainRepo $catalogRelativePath
$stageCatalogPath = Join-Path $stageRepo $catalogRelativePath

function ConvertTo-Slug([string]$value) {
  $slug = [regex]::Replace([string]$value, '[^a-zA-Z0-9]+', '_').Trim('_').ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($slug)) { return "asset" }
  return $slug
}

function Get-UInt16BE([byte[]]$bytes, [int]$offset) { return ([int]$bytes[$offset] -shl 8) -bor [int]$bytes[$offset + 1] }
function Get-UInt16LE([byte[]]$bytes, [int]$offset) { return [int]$bytes[$offset] -bor ([int]$bytes[$offset + 1] -shl 8) }
function Get-UInt24LE([byte[]]$bytes, [int]$offset) { return [int]$bytes[$offset] -bor ([int]$bytes[$offset + 1] -shl 8) -bor ([int]$bytes[$offset + 2] -shl 16) }

function Read-ImageSize([string]$path) {
  $ext = [IO.Path]::GetExtension($path)
  if ($null -eq $ext) { $ext = "" }
  $ext = $ext.ToLowerInvariant()
  $bytes = [IO.File]::ReadAllBytes($path)
  if ($bytes.Length -lt 12) { throw "Invalid image file: $path" }

  if ($ext -eq ".png") {
    $w = [int]([uint32][System.Net.IPAddress]::NetworkToHostOrder([int][BitConverter]::ToInt32($bytes, 16)))
    $h = [int]([uint32][System.Net.IPAddress]::NetworkToHostOrder([int][BitConverter]::ToInt32($bytes, 20)))
    return @{ Width = $w; Height = $h }
  }
  if ($ext -eq ".jpg" -or $ext -eq ".jpeg") {
    $pos = 2
    while ($pos -lt ($bytes.Length - 9)) {
      while ($pos -lt $bytes.Length -and $bytes[$pos] -eq 0xFF) { $pos++ }
      if ($pos -ge $bytes.Length) { break }
      $marker = $bytes[$pos]; $pos++
      if ($marker -eq 0xD8 -or $marker -eq 0xD9 -or $marker -eq 0x01 -or ($marker -ge 0xD0 -and $marker -le 0xD7)) { continue }
      $segLen = Get-UInt16BE $bytes $pos
      $isSof = ($marker -ge 0xC0 -and $marker -le 0xC3) -or ($marker -ge 0xC5 -and $marker -le 0xC7) -or ($marker -ge 0xC9 -and $marker -le 0xCB) -or ($marker -ge 0xCD -and $marker -le 0xCF)
      if ($isSof) {
        return @{ Width = (Get-UInt16BE $bytes ($pos + 5)); Height = (Get-UInt16BE $bytes ($pos + 3)) }
      }
      $pos += $segLen
    }
  }
  if ($ext -eq ".webp") {
    $chunk = [Text.Encoding]::ASCII.GetString($bytes, 12, 4)
    if ($chunk -eq "VP8X") {
      return @{ Width = ((Get-UInt24LE $bytes 24) + 1); Height = ((Get-UInt24LE $bytes 27) + 1) }
    }
    if ($chunk -eq "VP8L") {
      $b1 = [int]$bytes[21]; $b2 = [int]$bytes[22]; $b3 = [int]$bytes[23]; $b4 = [int]$bytes[24]
      $w = 1 + (($b2 -band 0x3F) -shl 8 -bor $b1)
      $h = 1 + (($b4 -band 0x0F) -shl 10 -bor ($b3 -shl 2) -bor (($b2 -band 0xC0) -shr 6))
      return @{ Width = $w; Height = $h }
    }
  }
  try {
    $img = [System.Drawing.Image]::FromFile($path)
    try { return @{ Width = [int]$img.Width; Height = [int]$img.Height } }
    finally { $img.Dispose() }
  } catch {
    throw "Could not read image dimensions for: $path"
  }
}

function Is-Supported([string]$path) {
  $ext = [IO.Path]::GetExtension($path)
  if ($null -eq $ext) { $ext = "" }
  $ext = $ext.ToLowerInvariant()
  return @(".webp",".png",".jpg",".jpeg",".bmp",".gif") -contains $ext
}

function Get-InputImages([string[]]$paths) {
  $all = New-Object "System.Collections.Generic.List[string]"
  foreach ($raw in @($paths)) {
    if ([string]::IsNullOrWhiteSpace($raw)) { continue }
    $p = $raw.Trim('"')
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $item = Get-Item -LiteralPath $p
    if ($item.PSIsContainer) {
      Get-ChildItem -LiteralPath $item.FullName -Recurse -File |
        Where-Object { Is-Supported $_.FullName } |
        ForEach-Object { $all.Add($_.FullName) }
    } elseif (Is-Supported $item.FullName) {
      $all.Add($item.FullName)
    }
  }
  if ($all.Count -gt 0) { return @($all.ToArray() | Select-Object -Unique) }

  $mode = [System.Windows.Forms.MessageBox]::Show(
    "Yes = choose files, No = choose folder, Cancel = stop",
    "Tanks image import source",
    [System.Windows.Forms.MessageBoxButtons]::YesNoCancel
  )
  if ($mode -eq [System.Windows.Forms.DialogResult]::Cancel) { return @() }
  if ($mode -eq [System.Windows.Forms.DialogResult]::Yes) {
    $d = New-Object System.Windows.Forms.OpenFileDialog
    $d.Filter = "Image files|*.webp;*.png;*.jpg;*.jpeg;*.bmp;*.gif|All files|*.*"
    $d.Multiselect = $true
    if ($d.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return @() }
    return @($d.FileNames | Where-Object { Is-Supported $_ })
  }
  $f = New-Object System.Windows.Forms.FolderBrowserDialog
  if ($f.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return @() }
  return @(Get-ChildItem -LiteralPath $f.SelectedPath -Recurse -File | Where-Object { Is-Supported $_.FullName } | ForEach-Object { $_.FullName })
}

function Prompt-ImageMeta([string]$sourcePath, [int]$width, [int]$height) {
  $categories = @("vehicles","scifi","military","characters","weapons","effects","nature","misc")
  $base = [IO.Path]::GetFileNameWithoutExtension($sourcePath)
  $guessCategory = "misc"
  if ($base -match "tank|vehicle|truck|car") { $guessCategory = "vehicles" }
  elseif ($base -match "scifi|ufo|alien|hover") { $guessCategory = "scifi" }
  elseif ($base -match "weapon|laser|rocket|bomb") { $guessCategory = "weapons" }
  elseif ($base -match "human|person|hero|pilot|soldier") { $guessCategory = "characters" }
  elseif ($base -match "explosion|effect|smoke|fire") { $guessCategory = "effects" }

  $form = New-Object System.Windows.Forms.Form
  $form.Text = "Tank Image Metadata"
  $form.StartPosition = "CenterScreen"
  $form.Size = New-Object System.Drawing.Size(560, 300)
  $form.TopMost = $true

  $lab = New-Object System.Windows.Forms.Label
  $lab.Text = "Image: $([IO.Path]::GetFileName($sourcePath))`r`nSize: ${width}x${height}"
  $lab.Location = New-Object System.Drawing.Point(16, 14)
  $lab.Size = New-Object System.Drawing.Size(520, 42)
  $form.Controls.Add($lab)

  $catLabel = New-Object System.Windows.Forms.Label
  $catLabel.Text = "Category"
  $catLabel.Location = New-Object System.Drawing.Point(16, 68)
  $catLabel.Size = New-Object System.Drawing.Size(120, 24)
  $form.Controls.Add($catLabel)

  $catCombo = New-Object System.Windows.Forms.ComboBox
  $catCombo.Location = New-Object System.Drawing.Point(150, 66)
  $catCombo.Size = New-Object System.Drawing.Size(220, 28)
  $catCombo.DropDownStyle = "DropDownList"
  $categories | ForEach-Object { [void]$catCombo.Items.Add($_) }
  $catCombo.SelectedItem = $guessCategory
  $form.Controls.Add($catCombo)

  $titleLabel = New-Object System.Windows.Forms.Label
  $titleLabel.Text = "Title"
  $titleLabel.Location = New-Object System.Drawing.Point(16, 108)
  $titleLabel.Size = New-Object System.Drawing.Size(120, 24)
  $form.Controls.Add($titleLabel)

  $titleBox = New-Object System.Windows.Forms.TextBox
  $titleBox.Location = New-Object System.Drawing.Point(150, 106)
  $titleBox.Size = New-Object System.Drawing.Size(360, 28)
  $titleBox.Text = (($base -replace '[_-]+', ' ').Trim())
  $form.Controls.Add($titleBox)

  $ok = New-Object System.Windows.Forms.Button
  $ok.Text = "Import"
  $ok.Location = New-Object System.Drawing.Point(404, 210)
  $ok.Size = New-Object System.Drawing.Size(106, 34)
  $ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Controls.Add($ok)
  $cancel = New-Object System.Windows.Forms.Button
  $cancel.Text = "Skip"
  $cancel.Location = New-Object System.Drawing.Point(294, 210)
  $cancel.Size = New-Object System.Drawing.Size(98, 34)
  $cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($cancel)

  $form.AcceptButton = $ok
  $form.CancelButton = $cancel
  $result = $form.ShowDialog()
  if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
    $form.Dispose()
    return $null
  }
  $out = [ordered]@{
    category = [string]$catCombo.SelectedItem
    title = [string]$titleBox.Text
  }
  $form.Dispose()
  return $out
}

function Load-Catalog([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    return [ordered]@{ version = 1; updatedAt = (Get-Date).ToString("s"); assets = @() }
  }
  $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $assets = @()
  if ($raw.assets) { foreach ($a in $raw.assets) { $assets += ,$a } }
  return [ordered]@{
    version = if ($raw.version) { [int]$raw.version } else { 1 }
    updatedAt = (Get-Date).ToString("s")
    assets = $assets
  }
}

function Save-Catalog([string]$path, $catalog) {
  $catalog.updatedAt = (Get-Date).ToString("s")
  Set-Content -LiteralPath $path -Value ($catalog | ConvertTo-Json -Depth 20) -Encoding UTF8
}

function Upsert-CatalogAsset($catalog, [string]$fileName, [string]$category, [string]$title) {
  $key = [IO.Path]::GetFileNameWithoutExtension($fileName)
  $filtered = @()
  foreach ($a in $catalog.assets) {
    if ([string]$a.key -ne $key) { $filtered += ,$a }
  }
  $canWeapons = @("vehicles","scifi","military") -contains $category
  $filtered += [ordered]@{
    key = $key
    file = $fileName
    title = $title
    category = $category
    tags = @($category)
    defaultProperties = [ordered]@{
      scale = 1
      health = 100
      speed = 0
      isEnemy = $false
      canFoam = $canWeapons
      canLaser = $canWeapons
      weaponType = if ($canWeapons) { "shell" } else { "none" }
      fireRate = 0
      damage = if ($canWeapons) { 32 } else { 0 }
      radius = if ($canWeapons) { 42 } else { 0 }
      pathTrace = $false
      pathDirection = "ltr"
      bomberCallIn = $false
    }
  }
  $catalog.assets = @($filtered | Sort-Object key)
}

function Git-Run([string]$repo, [string[]]$args) {
  & git -C $repo @args
  if ($LASTEXITCODE -ne 0) { throw "git failed in ${repo}: git $($args -join ' ')" }
}

function Push-WithRetry([string]$repo) {
  & git -C $repo push origin main
  if ($LASTEXITCODE -eq 0) { return }
  Git-Run -repo $repo -args @("fetch", "origin", "main")
  Git-Run -repo $repo -args @("pull", "--rebase", "origin", "main")
  Git-Run -repo $repo -args @("push", "origin", "main")
}

$inputFiles = Get-InputImages -paths $ImagePaths
if ($inputFiles.Count -eq 0) { throw "No images selected." }

if (-not (Test-Path -LiteralPath $mainImagesDir)) { New-Item -ItemType Directory -Path $mainImagesDir -Force | Out-Null }
if ($Publish -and -not (Test-Path -LiteralPath $stageImagesDir)) { New-Item -ItemType Directory -Path $stageImagesDir -Force | Out-Null }

$mainCatalog = Load-Catalog -path $mainCatalogPath
$stageCatalog = if ($Publish) { Load-Catalog -path $stageCatalogPath } else { $null }

$imported = @()
foreach ($source in $inputFiles) {
  $size = Read-ImageSize -path $source
  $meta = Prompt-ImageMeta -sourcePath $source -width $size.Width -height $size.Height
  if ($null -eq $meta) { continue }
  $ext = [IO.Path]::GetExtension($source)
  if ([string]::IsNullOrWhiteSpace($ext)) { $ext = ".webp" }
  $ext = $ext.ToLowerInvariant()
  $baseTitle = ConvertTo-Slug($meta.title)
  $outputFile = "{0}_{1}_{2}x{3}{4}" -f (ConvertTo-Slug $meta.category), $baseTitle, $size.Width, $size.Height, $ext

  Copy-Item -LiteralPath $source -Destination (Join-Path $mainImagesDir $outputFile) -Force
  Upsert-CatalogAsset -catalog $mainCatalog -fileName $outputFile -category (ConvertTo-Slug $meta.category) -title $meta.title

  if ($Publish) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $stageImagesDir $outputFile) -Force
    Upsert-CatalogAsset -catalog $stageCatalog -fileName $outputFile -category (ConvertTo-Slug $meta.category) -title $meta.title
  }

  $imported += $outputFile
  Write-Host "Imported: $outputFile"
}

if ($imported.Count -eq 0) {
  throw "No images imported."
}

Save-Catalog -path $mainCatalogPath -catalog $mainCatalog
if ($Publish) { Save-Catalog -path $stageCatalogPath -catalog $stageCatalog }

if (-not $Publish) {
  Write-Host "Local import complete. Imported $($imported.Count) image(s)."
  exit 0
}

Git-Run -repo $mainRepo -args @("add", $catalogRelativePath, "$imagesRelativeDir\*")
& git -C $mainRepo commit -m "Apply tank builder image imports"
if ($LASTEXITCODE -ne 0) { Write-Host "No main changes to commit." }
Push-WithRetry -repo $mainRepo

Git-Run -repo $stageRepo -args @("add", $catalogRelativePath, "$imagesRelativeDir\*")
& git -C $stageRepo commit -m "Apply tank builder image imports"
if ($LASTEXITCODE -ne 0) { Write-Host "No stage changes to commit." }
Push-WithRetry -repo $stageRepo

Write-Host "Published image imports to main + stage."
