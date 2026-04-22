param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ImagePaths = @(),
  [switch]$Publish
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$mainRepo = 'C:\REPO\github.io-main'
$stageRepo = 'C:\REPO\Stagejasongroce-online'
$gameRelativeDir = 'games\firefighter-game'
$imagesRelativeDir = "$gameRelativeDir\\images"
$htmlRelativePath = "$gameRelativeDir\\mobile-deluxe-23.html"

$mainImagesDir = Join-Path $mainRepo $imagesRelativeDir
$mainHtmlPath = Join-Path $mainRepo $htmlRelativePath
$stageImagesDir = Join-Path $stageRepo $imagesRelativeDir
$stageHtmlPath = Join-Path $stageRepo $htmlRelativePath

function ConvertTo-Slug([string]$value) {
  $slug = [regex]::Replace([string]$value, '[^a-zA-Z0-9]+', '_').Trim('_').ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($slug)) { return 'asset' }
  return $slug
}

function To-TitleFromFile([string]$path) {
  $base = [IO.Path]::GetFileNameWithoutExtension([string]$path)
  $base = [regex]::Replace($base, '_(\d+x\d+)$', '')
  $base = [regex]::Replace($base, '^(animal|vehicle|building|nature|prop|scifi|misc)_', '')
  $base = [regex]::Replace($base, '[\-_]+', ' ')
  $base = $base.Trim()
  if ([string]::IsNullOrWhiteSpace($base)) { return 'new asset' }
  return $base
}

function Get-UInt16BE([byte[]]$bytes, [int]$offset) {
  return ([int]$bytes[$offset] -shl 8) -bor [int]$bytes[$offset + 1]
}

function Get-UInt16LE([byte[]]$bytes, [int]$offset) {
  return [int]$bytes[$offset] -bor ([int]$bytes[$offset + 1] -shl 8)
}

function Get-Int32LE([byte[]]$bytes, [int]$offset) {
  return [BitConverter]::ToInt32($bytes, $offset)
}

function Get-UInt24LE([byte[]]$bytes, [int]$offset) {
  return [int]$bytes[$offset] -bor ([int]$bytes[$offset + 1] -shl 8) -bor ([int]$bytes[$offset + 2] -shl 16)
}

function Read-ImageSize([string]$path) {
  $ext = [IO.Path]::GetExtension($path)
  if ($null -eq $ext) { $ext = '' }
  $ext = $ext.ToLowerInvariant()
  $bytes = [IO.File]::ReadAllBytes($path)
  if ($bytes.Length -lt 12) {
    throw "File is too small to be a valid image: $path"
  }

  if ($ext -eq '.png') {
    if ($bytes.Length -lt 24) { throw "Invalid PNG header: $path" }
    $isPng = ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47 -and
      $bytes[4] -eq 0x0D -and $bytes[5] -eq 0x0A -and $bytes[6] -eq 0x1A -and $bytes[7] -eq 0x0A)
    if (-not $isPng) { throw "Invalid PNG signature: $path" }
    $w = [int]([uint32][System.Net.IPAddress]::NetworkToHostOrder([int][BitConverter]::ToInt32($bytes, 16)))
    $h = [int]([uint32][System.Net.IPAddress]::NetworkToHostOrder([int][BitConverter]::ToInt32($bytes, 20)))
    if ($w -le 0 -or $h -le 0) { throw "PNG reported invalid size: $path" }
    return @{ Width = $w; Height = $h }
  }

  if ($ext -eq '.gif') {
    if ($bytes.Length -lt 10) { throw "Invalid GIF header: $path" }
    $sig = [Text.Encoding]::ASCII.GetString($bytes, 0, 6)
    if ($sig -ne 'GIF87a' -and $sig -ne 'GIF89a') { throw "Invalid GIF signature: $path" }
    $w = Get-UInt16LE $bytes 6
    $h = Get-UInt16LE $bytes 8
    if ($w -le 0 -or $h -le 0) { throw "GIF reported invalid size: $path" }
    return @{ Width = $w; Height = $h }
  }

  if ($ext -eq '.bmp') {
    if ($bytes.Length -lt 26) { throw "Invalid BMP header: $path" }
    if ($bytes[0] -ne 0x42 -or $bytes[1] -ne 0x4D) { throw "Invalid BMP signature: $path" }
    $w = [math]::Abs((Get-Int32LE $bytes 18))
    $h = [math]::Abs((Get-Int32LE $bytes 22))
    if ($w -le 0 -or $h -le 0) { throw "BMP reported invalid size: $path" }
    return @{ Width = [int]$w; Height = [int]$h }
  }

  if ($ext -eq '.jpg' -or $ext -eq '.jpeg') {
    if ($bytes.Length -lt 4 -or $bytes[0] -ne 0xFF -or $bytes[1] -ne 0xD8) {
      throw "Invalid JPEG signature: $path"
    }
    $pos = 2
    while ($pos -lt ($bytes.Length - 9)) {
      while ($pos -lt $bytes.Length -and $bytes[$pos] -eq 0xFF) { $pos++ }
      if ($pos -ge $bytes.Length) { break }
      $marker = $bytes[$pos]
      $pos++
      if ($marker -eq 0xD8 -or $marker -eq 0xD9 -or $marker -eq 0x01 -or ($marker -ge 0xD0 -and $marker -le 0xD7)) {
        continue
      }
      if ($pos + 1 -ge $bytes.Length) { break }
      $segLen = Get-UInt16BE $bytes $pos
      if ($segLen -lt 2 -or ($pos + $segLen) -gt $bytes.Length) { break }
      $isSof = ($marker -ge 0xC0 -and $marker -le 0xC3) -or ($marker -ge 0xC5 -and $marker -le 0xC7) -or
        ($marker -ge 0xC9 -and $marker -le 0xCB) -or ($marker -ge 0xCD -and $marker -le 0xCF)
      if ($isSof) {
        if ($segLen -lt 7) { break }
        $h = Get-UInt16BE $bytes ($pos + 3)
        $w = Get-UInt16BE $bytes ($pos + 5)
        if ($w -le 0 -or $h -le 0) { throw "JPEG reported invalid size: $path" }
        return @{ Width = $w; Height = $h }
      }
      $pos += $segLen
    }
    throw "Could not read JPEG dimensions from: $path"
  }

  if ($ext -eq '.webp') {
    if ($bytes.Length -lt 30) { throw "Invalid WEBP header: $path" }
    $riff = [Text.Encoding]::ASCII.GetString($bytes, 0, 4)
    $webp = [Text.Encoding]::ASCII.GetString($bytes, 8, 4)
    if ($riff -ne 'RIFF' -or $webp -ne 'WEBP') { throw "Invalid WEBP signature: $path" }
    $chunk = [Text.Encoding]::ASCII.GetString($bytes, 12, 4)

    if ($chunk -eq 'VP8X') {
      if ($bytes.Length -lt 30) { throw "Invalid WEBP VP8X chunk: $path" }
      $w = (Get-UInt24LE $bytes 24) + 1
      $h = (Get-UInt24LE $bytes 27) + 1
      if ($w -le 0 -or $h -le 0) { throw "WEBP VP8X reported invalid size: $path" }
      return @{ Width = $w; Height = $h }
    }

    if ($chunk -eq 'VP8L') {
      if ($bytes.Length -lt 25 -or $bytes[20] -ne 0x2F) { throw "Invalid WEBP VP8L chunk: $path" }
      $b1 = [int]$bytes[21]
      $b2 = [int]$bytes[22]
      $b3 = [int]$bytes[23]
      $b4 = [int]$bytes[24]
      $w = 1 + (($b2 -band 0x3F) -shl 8 -bor $b1)
      $h = 1 + (($b4 -band 0x0F) -shl 10 -bor ($b3 -shl 2) -bor (($b2 -band 0xC0) -shr 6))
      if ($w -le 0 -or $h -le 0) { throw "WEBP VP8L reported invalid size: $path" }
      return @{ Width = $w; Height = $h }
    }

    if ($chunk -eq 'VP8 ') {
      $scanStart = 20
      $scanEnd = [Math]::Min($bytes.Length - 10, 120)
      for ($i = $scanStart; $i -le $scanEnd; $i++) {
        if ($bytes[$i] -eq 0x9D -and $bytes[$i + 1] -eq 0x01 -and $bytes[$i + 2] -eq 0x2A) {
          $rawW = Get-UInt16LE $bytes ($i + 3)
          $rawH = Get-UInt16LE $bytes ($i + 5)
          $w = $rawW -band 0x3FFF
          $h = $rawH -band 0x3FFF
          if ($w -gt 0 -and $h -gt 0) {
            return @{ Width = $w; Height = $h }
          }
        }
      }
      throw "Could not read WEBP VP8 dimensions from: $path"
    }

    throw "Unsupported WEBP chunk type '$chunk' in: $path"
  }

  try {
    $img = [System.Drawing.Image]::FromFile($path)
    try {
      return @{ Width = [int]$img.Width; Height = [int]$img.Height }
    } finally {
      $img.Dispose()
    }
  } catch {
    throw "Could not read image size for '$path'. Supported: webp/png/jpg/jpeg/gif/bmp. Details: $($_.Exception.Message)"
  }
}

function Select-ImageFiles {
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Title = 'Select image(s) to import into KVFD game'
  $dialog.Filter = 'Image files (*.webp;*.png;*.jpg;*.jpeg;*.bmp)|*.webp;*.png;*.jpg;*.jpeg;*.bmp|All files (*.*)|*.*'
  $dialog.Multiselect = $true
  $dialog.InitialDirectory = 'C:\Users\jgroce\Downloads'
  if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return @() }
  return @($dialog.FileNames)
}

function Test-IsSupportedImageFile([string]$path) {
  $ext = [IO.Path]::GetExtension([string]$path)
  if ($null -eq $ext) { return $false }
  $ext = $ext.ToLowerInvariant()
  return @('.webp', '.png', '.jpg', '.jpeg', '.bmp', '.gif') -contains $ext
}

function Select-ImageFolderFiles {
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = 'Select a folder that contains images to import'
  $dialog.ShowNewFolderButton = $false
  if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return @() }
  $root = $dialog.SelectedPath
  if ([string]::IsNullOrWhiteSpace($root)) { return @() }
  return @(Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object { Test-IsSupportedImageFile $_.FullName } | ForEach-Object { $_.FullName })
}

function Get-DefaultCategory([string]$path) {
  $nameLower = [IO.Path]::GetFileName([string]$path)
  if ($null -eq $nameLower) { $nameLower = '' }
  $nameLower = $nameLower.ToLowerInvariant()
  if ($nameLower -match 'vehicle|truck|car|sedan|semi|bus|tractor|bike|atv|boat|mower') { return 'vehicles' }
  if ($nameLower -match 'animal|dog|cat|cow|horse|bird|robin|cardinal') { return 'animals' }
  if ($nameLower -match 'house|home|barn|shed|garage|building|school') { return 'buildings' }
  if ($nameLower -match 'tree|shrub|nature|oak|pine|maple|grass|field|hay') { return 'nature' }
  if ($nameLower -match 'fence|bench|tent|prop|playground|windmill|wagon') { return 'props' }
  if ($nameLower -match 'scifi|alien|ufo|space') { return 'scifi' }
  return 'misc'
}

function Test-BaseNameHasDimensions([string]$baseName) {
  return [regex]::IsMatch([string]$baseName, '(?:^|[_-])\d{2,5}x\d{2,5}(?:$|[_-])', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
}

function Get-DefaultOutputFileName([string]$path, [int]$width, [int]$height) {
  $ext = [IO.Path]::GetExtension([string]$path)
  if ($null -eq $ext) { $ext = '.webp' }
  $ext = $ext.ToLowerInvariant()
  $category = ConvertTo-Slug (Get-DefaultCategory -path $path)
  $sourceBase = [IO.Path]::GetFileNameWithoutExtension([string]$path)
  if (Test-BaseNameHasDimensions -baseName $sourceBase) {
    $sourceBase = [regex]::Replace([string]$sourceBase, '^(animal|vehicle|building|nature|prop|scifi|misc|animals|vehicles|buildings|props)_', '')
    $titleWithSize = ConvertTo-Slug($sourceBase)
    if (-not [string]::IsNullOrWhiteSpace($titleWithSize)) {
      return "${category}_${titleWithSize}${ext}"
    }
  }
  $title = ConvertTo-Slug (To-TitleFromFile -path $path)
  return "${category}_${title}_${width}x${height}${ext}"
}

function Expand-InputPaths([string[]]$rawPaths) {
  $expanded = New-Object 'System.Collections.Generic.List[string]'
  foreach ($path in @($rawPaths)) {
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    $p = [Environment]::ExpandEnvironmentVariables($path.Trim('"'))
    if (-not (Test-Path -LiteralPath $p)) { Write-Warning "Skipping missing path: $p"; continue }
    $item = Get-Item -LiteralPath $p -ErrorAction Stop
    if ($item.PSIsContainer) {
      Get-ChildItem -LiteralPath $item.FullName -Recurse -File |
        Where-Object { Test-IsSupportedImageFile $_.FullName } |
        ForEach-Object { $expanded.Add($_.FullName) }
    } else {
      if (Test-IsSupportedImageFile $item.FullName) { $expanded.Add($item.FullName) }
      else { Write-Warning "Skipping unsupported image extension: $($item.FullName)" }
    }
  }
  return @($expanded.ToArray() | Select-Object -Unique)
}

function Show-ImageSourceModeDialog {
  $result = [System.Windows.Forms.MessageBox]::Show(
    "Choose image source mode:`r`n`r`nYes = Select one or more files`r`nNo = Select a folder (imports all supported images recursively)`r`nCancel = Stop",
    'KVFD Image Import Source',
    [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
    [System.Windows.Forms.MessageBoxIcon]::Question
  )
  if ($result -eq [System.Windows.Forms.DialogResult]::Yes) { return 'files' }
  if ($result -eq [System.Windows.Forms.DialogResult]::No) { return 'folder' }
  return 'cancel'
}

function Sanitize-OutputFileName([string]$rawName, [string]$fallbackName, [string]$requiredExt) {
  $name = [string]$rawName
  if ([string]::IsNullOrWhiteSpace($name)) { $name = [string]$fallbackName }
  $name = [IO.Path]::GetFileName($name)
  $base = ConvertTo-Slug([IO.Path]::GetFileNameWithoutExtension($name))
  if ([string]::IsNullOrWhiteSpace($base)) {
    $base = ConvertTo-Slug([IO.Path]::GetFileNameWithoutExtension([string]$fallbackName))
  }
  $ext = [IO.Path]::GetExtension($name)
  if ([string]::IsNullOrWhiteSpace($ext)) { $ext = $requiredExt }
  $ext = $ext.ToLowerInvariant()
  if ($ext -ne $requiredExt) { $ext = $requiredExt }
  return "${base}${ext}"
}

function Show-BatchRenameDialog([array]$items) {
  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'KVFD Image Import Review'
  $form.StartPosition = 'CenterScreen'
  $form.Size = New-Object System.Drawing.Size(1060, 620)
  $form.FormBorderStyle = 'Sizable'
  $form.MinimizeBox = $false
  $form.TopMost = $true

  $label = New-Object System.Windows.Forms.Label
  $label.AutoSize = $false
  $label.Location = New-Object System.Drawing.Point(14, 12)
  $label.Size = New-Object System.Drawing.Size(1020, 38)
  $label.Text = "Review all files once before import. Edit Output File as needed. Keep extension the same. Uncheck Include to skip a file."
  $form.Controls.Add($label)

  $grid = New-Object System.Windows.Forms.DataGridView
  $grid.Location = New-Object System.Drawing.Point(14, 54)
  $grid.Size = New-Object System.Drawing.Size(1018, 470)
  $grid.AllowUserToAddRows = $false
  $grid.AllowUserToDeleteRows = $false
  $grid.RowHeadersVisible = $false
  $grid.SelectionMode = 'FullRowSelect'
  $grid.AutoSizeColumnsMode = 'Fill'

  $colInclude = New-Object System.Windows.Forms.DataGridViewCheckBoxColumn
  $colInclude.Name = 'Include'
  $colInclude.HeaderText = 'Include'
  $colInclude.FillWeight = 12
  [void]$grid.Columns.Add($colInclude)

  $colSource = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
  $colSource.Name = 'Source'
  $colSource.HeaderText = 'Source File'
  $colSource.ReadOnly = $true
  $colSource.FillWeight = 34
  [void]$grid.Columns.Add($colSource)

  $colOutput = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
  $colOutput.Name = 'Output'
  $colOutput.HeaderText = 'Output File (editable)'
  $colOutput.FillWeight = 40
  [void]$grid.Columns.Add($colOutput)

  $colSize = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
  $colSize.Name = 'Size'
  $colSize.HeaderText = 'Size'
  $colSize.ReadOnly = $true
  $colSize.FillWeight = 14
  [void]$grid.Columns.Add($colSize)

  $colPath = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
  $colPath.Name = 'Path'
  $colPath.HeaderText = 'Full Path'
  $colPath.ReadOnly = $true
  $colPath.Visible = $false
  [void]$grid.Columns.Add($colPath)

  $colExt = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
  $colExt.Name = 'Ext'
  $colExt.HeaderText = 'Ext'
  $colExt.ReadOnly = $true
  $colExt.Visible = $false
  [void]$grid.Columns.Add($colExt)

  foreach ($item in $items) {
    [void]$grid.Rows.Add(
      $true,
      [IO.Path]::GetFileName([string]$item.SourcePath),
      [string]$item.ProposedFileName,
      "$($item.Width)x$($item.Height)",
      [string]$item.SourcePath,
      [string]$item.Extension
    )
  }
  $form.Controls.Add($grid)

  $btnImport = New-Object System.Windows.Forms.Button
  $btnImport.Text = 'Import Selected'
  $btnImport.Location = New-Object System.Drawing.Point(842, 536)
  $btnImport.Size = New-Object System.Drawing.Size(190, 36)
  $btnImport.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Controls.Add($btnImport)

  $btnCancel = New-Object System.Windows.Forms.Button
  $btnCancel.Text = 'Cancel'
  $btnCancel.Location = New-Object System.Drawing.Point(742, 536)
  $btnCancel.Size = New-Object System.Drawing.Size(90, 36)
  $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($btnCancel)

  $form.AcceptButton = $btnImport
  $form.CancelButton = $btnCancel
  $result = $form.ShowDialog()
  if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
    $form.Dispose()
    return @{ Action = 'cancel'; Items = @() }
  }

  $picked = @()
  foreach ($row in $grid.Rows) {
    if (-not [bool]$row.Cells['Include'].Value) { continue }
    $path = [string]$row.Cells['Path'].Value
    $ext = [string]$row.Cells['Ext'].Value
    $outputRaw = [string]$row.Cells['Output'].Value
    $fallback = [IO.Path]::GetFileName([string]$row.Cells['Source'].Value)
    $safeOut = Sanitize-OutputFileName -rawName $outputRaw -fallbackName $fallback -requiredExt $ext
    $picked += [ordered]@{
      SourcePath = $path
      OutputFileName = $safeOut
    }
  }
  $form.Dispose()
  return @{ Action = 'ok'; Items = $picked }
}

function Show-AssetPrompt([string]$path, [int]$width, [int]$height) {
  $categories = @('vehicles', 'animals', 'buildings', 'nature', 'props', 'scifi', 'misc')
  $defaultTitle = To-TitleFromFile -path $path
  $ext = [IO.Path]::GetExtension($path)
  if ($null -eq $ext) { $ext = '' }
  $ext = $ext.ToLowerInvariant()

  $guessCategory = 'misc'
  $nameLower = [IO.Path]::GetFileName($path)
  if ($null -eq $nameLower) { $nameLower = '' }
  $nameLower = $nameLower.ToLowerInvariant()
  if ($nameLower -match 'vehicle|truck|car|sedan|semi|bus|tractor|bike|atv|boat|mower') { $guessCategory = 'vehicles' }
  elseif ($nameLower -match 'animal|dog|cat|cow|horse|bird|robin|cardinal') { $guessCategory = 'animals' }
  elseif ($nameLower -match 'house|home|barn|shed|garage|building|school') { $guessCategory = 'buildings' }
  elseif ($nameLower -match 'tree|shrub|nature|oak|pine|maple|grass|field|hay') { $guessCategory = 'nature' }
  elseif ($nameLower -match 'fence|bench|tent|prop|playground|windmill|wagon') { $guessCategory = 'props' }
  elseif ($nameLower -match 'scifi|alien|ufo|space') { $guessCategory = 'scifi' }

  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'KVFD Image Import'
  $form.StartPosition = 'CenterScreen'
  $form.Size = New-Object System.Drawing.Size(640, 300)
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.TopMost = $true

  $lblFile = New-Object System.Windows.Forms.Label
  $lblFile.AutoSize = $false
  $lblFile.Location = New-Object System.Drawing.Point(16, 16)
  $lblFile.Size = New-Object System.Drawing.Size(600, 46)
  $lblFile.Text = "File: $([IO.Path]::GetFileName($path))`r`nDetected size: ${width}x${height}  |  Extension: $ext"
  $form.Controls.Add($lblFile)

  $lblCategory = New-Object System.Windows.Forms.Label
  $lblCategory.Location = New-Object System.Drawing.Point(16, 72)
  $lblCategory.Size = New-Object System.Drawing.Size(140, 24)
  $lblCategory.Text = 'Category:'
  $form.Controls.Add($lblCategory)

  $comboCategory = New-Object System.Windows.Forms.ComboBox
  $comboCategory.DropDownStyle = 'DropDownList'
  $comboCategory.Location = New-Object System.Drawing.Point(162, 70)
  $comboCategory.Size = New-Object System.Drawing.Size(220, 24)
  [void]$comboCategory.Items.AddRange($categories)
  $comboCategory.SelectedItem = $guessCategory
  $form.Controls.Add($comboCategory)

  $lblTitle = New-Object System.Windows.Forms.Label
  $lblTitle.Location = New-Object System.Drawing.Point(16, 110)
  $lblTitle.Size = New-Object System.Drawing.Size(140, 24)
  $lblTitle.Text = 'Title:'
  $form.Controls.Add($lblTitle)

  $txtTitle = New-Object System.Windows.Forms.TextBox
  $txtTitle.Location = New-Object System.Drawing.Point(162, 108)
  $txtTitle.Size = New-Object System.Drawing.Size(440, 24)
  $txtTitle.Text = $defaultTitle
  $form.Controls.Add($txtTitle)

  $lblPreview = New-Object System.Windows.Forms.Label
  $lblPreview.AutoSize = $false
  $lblPreview.Location = New-Object System.Drawing.Point(16, 146)
  $lblPreview.Size = New-Object System.Drawing.Size(586, 44)
  $lblPreview.Text = 'New filename preview: (updates as you type)'
  $form.Controls.Add($lblPreview)

  $btnOk = New-Object System.Windows.Forms.Button
  $btnOk.Text = 'Add Image'
  $btnOk.Location = New-Object System.Drawing.Point(348, 210)
  $btnOk.Size = New-Object System.Drawing.Size(120, 34)
  $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Controls.Add($btnOk)

  $btnSkip = New-Object System.Windows.Forms.Button
  $btnSkip.Text = 'Skip'
  $btnSkip.Location = New-Object System.Drawing.Point(476, 210)
  $btnSkip.Size = New-Object System.Drawing.Size(60, 34)
  $btnSkip.DialogResult = [System.Windows.Forms.DialogResult]::Ignore
  $form.Controls.Add($btnSkip)

  $btnCancel = New-Object System.Windows.Forms.Button
  $btnCancel.Text = 'Cancel All'
  $btnCancel.Location = New-Object System.Drawing.Point(542, 210)
  $btnCancel.Size = New-Object System.Drawing.Size(80, 34)
  $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($btnCancel)

  $updatePreview = {
    $cat = ConvertTo-Slug([string]$comboCategory.SelectedItem)
    $titleSlug = ConvertTo-Slug([string]$txtTitle.Text)
    $previewName = "${cat}_${titleSlug}_${width}x${height}${ext}"
    $lblPreview.Text = "New filename preview: $previewName"
  }
  $comboCategory.Add_SelectedIndexChanged($updatePreview)
  $txtTitle.Add_TextChanged($updatePreview)
  & $updatePreview

  $form.AcceptButton = $btnOk
  $form.CancelButton = $btnCancel
  $result = $form.ShowDialog()
  $title = [string]$txtTitle.Text
  $category = [string]$comboCategory.SelectedItem
  $form.Dispose()

  if ($result -eq [System.Windows.Forms.DialogResult]::Cancel) { return @{ Action = 'cancel' } }
  if ($result -eq [System.Windows.Forms.DialogResult]::Ignore) { return @{ Action = 'skip' } }

  $category = ConvertTo-Slug($category)
  $titleSlug = ConvertTo-Slug($title)
  $filename = "${category}_${titleSlug}_${width}x${height}${ext}"
  $spriteKey = "${category}_${titleSlug}_${width}x${height}"

  return @{
    Action = 'ok'
    Category = $category
    Title = $title
    TitleSlug = $titleSlug
    Width = $width
    Height = $height
    FileName = $filename
    SpriteKey = $spriteKey
  }
}

function Ensure-UniqueFilename([string]$dir, [string]$filename) {
  $name = [IO.Path]::GetFileNameWithoutExtension($filename)
  $ext = [IO.Path]::GetExtension($filename)
  $candidate = $filename
  $i = 2
  while (Test-Path -LiteralPath (Join-Path $dir $candidate)) {
    $candidate = "${name}_$i${ext}"
    $i++
  }
  return $candidate
}

function Ensure-UniqueKey([string]$raw, [string]$htmlRaw) {
  $candidate = $raw
  $i = 2
  while ($htmlRaw -match "(?m)^\s*,?\s*${candidate}\s*:") {
    $candidate = "${raw}_$i"
    $i++
  }
  return $candidate
}

function Update-HtmlAssetLists([string]$htmlPath, [array]$assetsToAdd) {
  if (-not $assetsToAdd.Count) { return }
  $raw = Get-Content -LiteralPath $htmlPath -Raw

  $objPattern = '(?s)(const\s+SPRITE_FILES\s*=\s*\{\r?\n)(.*?)(\r?\n\};)'
  $arrPattern = '(?s)(const\s+DISCOVERED_SPRITE_FILENAMES\s*=\s*\[\r?\n)(.*?)(\r?\n\];)'

  $objMatch = [regex]::Match($raw, $objPattern)
  if (-not $objMatch.Success) { throw "Could not find SPRITE_FILES block in $htmlPath" }
  $objBody = $objMatch.Groups[2].Value

  $arrMatch = [regex]::Match($raw, $arrPattern)
  if (-not $arrMatch.Success) { throw "Could not find DISCOVERED_SPRITE_FILENAMES block in $htmlPath" }
  $arrBody = $arrMatch.Groups[2].Value

  $objAdd = @()
  $arrAdd = @()
  $objCurrentBody = $objMatch.Groups[2].Value.TrimEnd()
  $needsLeadingComma = -not ($objCurrentBody -match ',\s*$')

  foreach ($asset in $assetsToAdd) {
    $file = [string]$asset.FileName
    $key = [string]$asset.SpriteKey
    if ($objBody -notmatch "(?m)^\s*,?\s*${key}\s*:") {
      $prefix = ''
      if ($needsLeadingComma) {
        $prefix = ', '
        $needsLeadingComma = $false
      }
      $objAdd += "  ${prefix}${key}: '$file',"
      $objBody += "`n"
    }
    if ($arrBody -notmatch [regex]::Escape("'$file'")) {
      $arrAdd += "  '$file',"
      $arrBody += "`n"
    }
  }

  if ($objAdd.Count) {
    $updatedObjBody = ($objMatch.Groups[2].Value.TrimEnd() + "`r`n" + ($objAdd -join "`r`n"))
    $objReplacement = $objMatch.Groups[1].Value + $updatedObjBody + $objMatch.Groups[3].Value
    $raw = [regex]::Replace($raw, $objPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $objReplacement }, 1)
  }

  if ($arrAdd.Count) {
    $updatedArrBody = ($arrMatch.Groups[2].Value.TrimEnd() + "`r`n" + ($arrAdd -join "`r`n"))
    $arrReplacement = $arrMatch.Groups[1].Value + $updatedArrBody + $arrMatch.Groups[3].Value
    $raw = [regex]::Replace($raw, $arrPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $arrReplacement }, 1)
  }

  Set-Content -LiteralPath $htmlPath -Value $raw -Encoding UTF8
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

if (-not (Test-Path -LiteralPath $mainImagesDir)) { throw "Main images dir missing: $mainImagesDir" }
if (-not (Test-Path -LiteralPath $mainHtmlPath)) { throw "Main HTML file missing: $mainHtmlPath" }

if (-not $ImagePaths -or -not $ImagePaths.Count) {
  $mode = Show-ImageSourceModeDialog
  if ($mode -eq 'cancel') { throw 'No source selected.' }
  if ($mode -eq 'files') { $ImagePaths = Select-ImageFiles }
  if ($mode -eq 'folder') { $ImagePaths = Select-ImageFolderFiles }
}

$cleanPaths = Expand-InputPaths -rawPaths $ImagePaths
if (-not $cleanPaths.Count) { throw 'No valid image files selected.' }

$candidateItems = @()
foreach ($imgPath in $cleanPaths) {
  try {
    $size = Read-ImageSize -path $imgPath
  } catch {
    Write-Warning "Skipping unreadable image: $imgPath -- $($_.Exception.Message)"
    continue
  }
  $ext = [IO.Path]::GetExtension($imgPath)
  if ($null -eq $ext) { $ext = '.webp' }
  $ext = $ext.ToLowerInvariant()
  $candidateItems += [ordered]@{
    SourcePath = $imgPath
    Width = [int]$size.Width
    Height = [int]$size.Height
    Extension = $ext
    ProposedFileName = Get-DefaultOutputFileName -path $imgPath -width $size.Width -height $size.Height
  }
}

if (-not $candidateItems.Count) { throw 'No readable image files were found.' }

$nonWebpCount = @($candidateItems | Where-Object { $_.Extension -ne '.webp' }).Count
if ($nonWebpCount -gt 0) {
  $res = [System.Windows.Forms.MessageBox]::Show(
    "$nonWebpCount selected file(s) are not WEBP. WEBP is recommended for builder/source assets.`r`n`r`nContinue anyway?",
    'Non-WEBP files selected',
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  )
  if ($res -ne [System.Windows.Forms.DialogResult]::Yes) { throw 'Canceled by user.' }
}

$review = Show-BatchRenameDialog -items $candidateItems
if ($review.Action -ne 'ok') { throw 'Canceled by user.' }
$pickedItems = @($review.Items)
if (-not $pickedItems.Count) { throw 'No files selected for import.' }

$imported = @()
$htmlRawForKeys = Get-Content -LiteralPath $mainHtmlPath -Raw

foreach ($pick in $pickedItems) {
  $imgPath = [string]$pick.SourcePath
  $size = Read-ImageSize -path $imgPath
  $candidateFile = [string]$pick.OutputFileName
  $finalFile = Ensure-UniqueFilename -dir $mainImagesDir -filename $candidateFile
  $baseKey = ConvertTo-Slug([IO.Path]::GetFileNameWithoutExtension($finalFile))
  if ($finalFile -ne $candidateFile) {
    $baseName = [IO.Path]::GetFileNameWithoutExtension($finalFile)
    $baseKey = ConvertTo-Slug($baseName)
  }
  $finalKey = Ensure-UniqueKey -raw $baseKey -htmlRaw $htmlRawForKeys

  $destMain = Join-Path $mainImagesDir $finalFile
  Copy-Item -LiteralPath $imgPath -Destination $destMain -Force

  $record = [ordered]@{
    SourcePath = $imgPath
    FileName = $finalFile
    SpriteKey = $finalKey
    Width = [int]$size.Width
    Height = [int]$size.Height
    Category = ''
    Title = ''
  }
  $imported += $record
  $htmlRawForKeys += "`n${finalKey}: '$finalFile',"

  Write-Host "Imported: $finalFile  (key: $finalKey)"
}

if (-not $imported.Count) {
  Write-Host 'No images imported.'
  exit 0
}

Update-HtmlAssetLists -htmlPath $mainHtmlPath -assetsToAdd $imported

if (-not $Publish) {
  Write-Host ''
  Write-Host 'Local import complete (main repo only):'
  $imported | ForEach-Object { Write-Host " - $($_.FileName)  =>  key $($_.SpriteKey)" }
  Write-Host "Updated: $mainHtmlPath"
  Write-Host "Images:  $mainImagesDir"
  exit 0
}

if (-not (Test-Path -LiteralPath $stageRepo)) {
  throw "Stage repo not found: $stageRepo"
}

Sync-RepoMain -repo $mainRepo
Sync-RepoMain -repo $stageRepo

Copy-Item -LiteralPath $mainHtmlPath -Destination $stageHtmlPath -Force
foreach ($asset in $imported) {
  $src = Join-Path $mainImagesDir $asset.FileName
  $dst = Join-Path $stageImagesDir $asset.FileName
  Copy-Item -LiteralPath $src -Destination $dst -Force
}

$summary = ($imported | ForEach-Object { " - $($_.FileName) (key: $($_.SpriteKey))" }) -join "`r`n"
$res = [System.Windows.Forms.MessageBox]::Show(
  "Images were copied into main/stage.`r`n`r`n$summary`r`n`r`nCommit and push to origin/main now?",
  'KVFD Publish Images',
  [System.Windows.Forms.MessageBoxButtons]::YesNo,
  [System.Windows.Forms.MessageBoxIcon]::Question
)

if ($res -ne [System.Windows.Forms.DialogResult]::Yes) {
  Write-Host 'Publish canceled after local copy. Changes remain in working trees.'
  exit 0
}

$commitMsg = "Import builder image assets: $((Get-Date).ToString('yyyy-MM-dd HH:mm'))"

$mainPaths = @($htmlRelativePath)
$stagePaths = @($htmlRelativePath)
foreach ($asset in $imported) {
  $rel = "games/firefighter-game/images/$($asset.FileName)"
  $mainPaths += $rel
  $stagePaths += $rel
}

if (Repo-HasPathChanges -repo $mainRepo -paths $mainPaths) {
  Git-Run -repo $mainRepo -gitArgs (@('add') + $mainPaths)
  Git-Run -repo $mainRepo -gitArgs @('commit', '-m', $commitMsg)
  Git-Run -repo $mainRepo -gitArgs @('push', 'origin', 'main')
} else {
  Write-Host 'No tracked changes to commit in main repo.'
}

if (Repo-HasPathChanges -repo $stageRepo -paths $stagePaths) {
  Git-Run -repo $stageRepo -gitArgs (@('add') + $stagePaths)
  Git-Run -repo $stageRepo -gitArgs @('commit', '-m', $commitMsg)
  Git-Run -repo $stageRepo -gitArgs @('push', 'origin', 'main')
} else {
  Write-Host 'No tracked changes to commit in stage repo.'
}

Write-Host 'Publish complete.'
