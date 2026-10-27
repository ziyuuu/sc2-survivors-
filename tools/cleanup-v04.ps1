$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$reportPath = Join-Path $workspace 'reports\qa\v04-packaging-20261027.json'
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
if ($report.status -ne 'local-packaging-and-validation-complete-no-deployment') { throw 'Final V04 report not ready' }
$cache = Join-Path $workspace '.cache\v04-20261027'
$startup = Get-Content -LiteralPath (Join-Path $cache 'startup\startup.json') -Raw | ConvertFrom-Json
$targets = @($cache, [IO.Path]::GetFullPath($startup.root))
$running = Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('chrome.exe','node.exe') -and ($_.CommandLine -match 'verify-v04-browser|\.cache[\\/]v04-20261027|\.cache[\\/]ui-coze-main-FmuGRM') }
if ($running) { throw 'V04 test processes still active; finish them before cleanup' }
$deletedFiles = 0L
$logicalBytes = 0L
foreach ($target in $targets) {
  $resolved = (Resolve-Path -LiteralPath $target).Path
  if (!$resolved.StartsWith($workspace + '\.cache\', [StringComparison]::OrdinalIgnoreCase)) { throw "Unexpected cleanup path: $resolved" }
  if ($resolved -ne $cache -and [IO.Path]::GetFileName($resolved) -ne 'ui-coze-main-FmuGRM') { throw "Unexpected startup fixture: $resolved" }
  $items = @(Get-ChildItem -LiteralPath $resolved -Recurse -Force)
  if ($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw "Reparse point in fixture: $resolved" }
  foreach ($file in ($items | Where-Object {!$_.PSIsContainer})) { $deletedFiles++; $logicalBytes += $file.Length }
  Remove-Item -LiteralPath $resolved -Recurse -Force
}
foreach ($artifact in @($report.artifacts) + @($report.preserved.current,$report.preserved.t01)) {
  $relative = if ($artifact.path) {$artifact.path} else {$artifact.file}
  $actual = (Get-FileHash -LiteralPath (Join-Path $workspace $relative) -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $artifact.sha256) { throw "Preserved artifact mismatch: $relative" }
}
$report.retention.temporaryEvidenceRemoved = $true
$report.retention | Add-Member -NotePropertyName cleanup -NotePropertyValue @{files=$deletedFiles;logicalBytes=$logicalBytes;note='Logical file sizes include hardlinks; not a claim of physical bytes freed. Current delivery, source, original resources and deployed mirror retained.'} -Force
$report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $reportPath -Encoding utf8
Write-Output "Removed $deletedFiles temporary files; preserved artifact hashes verified."
