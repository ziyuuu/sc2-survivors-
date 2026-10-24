$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'PowerShell 7 is required before any deletion.' }
$taskBase = [IO.Path]::GetFullPath('D:\星际\reports\local\v01-20261024')
$cleanupFile = Join-Path $taskBase 'spike-diagnostic-profile-cleanup.json'
if (Test-Path -LiteralPath $cleanupFile) { throw 'Cleanup record already exists.' }
$specs = @(
  @{ run='spike-trace-r1'; profile='spike-trace-r1\profile' },
  @{ run='spike-trace-r2'; profile='spike-trace-r2\profile' },
  @{ run='spike-trace-r3'; profile='spike-trace-r3\profile' },
  @{ run='spike-trace-r3-retry'; profile='spike-trace-r3-retry\profile' },
  @{ run='spike-trace-r4'; profile='spike-trace-r4\profile' },
  @{ run='spike-sentinel-r1'; profile='spike-sentinel-r1\profile' },
  @{ run='spike-sentinel-trace-r1'; profile='spike-sentinel-trace-r1\profile' },
  @{ run='spike-gc-sentinel-r1'; profile='spike-gc-sentinel-r1\profile' },
  @{ run='spike-retention-pilot-r1'; profile='spike-retention-pilot-r1\profile' },
  @{ run='spike-os-memory-r1'; profile='spike-os-memory-r1\profile' },
  @{ run='spike-shared-source-pilot-r1'; profile='spike-shared-source-pilot-r1\profile' },
  @{ run='spike-shared-source-visual-r1'; profile='spike-shared-source-visual-r1\profile' },
  @{ run='spike-shared-a1'; profile='spike-shared-a1\profile' },
  @{ run='spike-shared-b1'; profile='spike-shared-b1\profile' }
)
$targets = @()
$processes = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'"
foreach ($spec in $specs) {
  $report = Get-Content -LiteralPath (Join-Path $taskBase ($spec.run + '\report.json')) -Raw | ConvertFrom-Json
  if ($report.profileClosed -ne $true) { throw "Test profile is not closed: $($spec.run)" }
  $target = [IO.Path]::GetFullPath((Join-Path $taskBase $spec.profile))
  if (-not $target.StartsWith($taskBase + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Profile escaped the named task directory.' }
  $resolved = (Resolve-Path -LiteralPath $target).ProviderPath
  if ($resolved -ne $target -or -not $resolved.StartsWith($taskBase + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Resolved profile path changed.' }
  if ((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Profile root is a reparse point.' }
  if ($processes | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('/','\').Contains($resolved) }) { throw "Chrome still uses $resolved" }
  $children = @(Get-ChildItem -LiteralPath $resolved -Recurse -Force)
  if ($children | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Profile contains a reparse point.' }
  $bytes = ($children | Where-Object { -not $_.PSIsContainer } | Measure-Object -Property Length -Sum).Sum
  $targets += [PSCustomObject]@{ run=$spec.run; path=$resolved; bytes=[long]$bytes; removed=$false }
}
$record = [PSCustomObject]@{ date='2026-10-24'; scope='Only 14 verified closed profiles from the current spike investigation, including the deliberate low-disk B1 interruption. All raw reports, logs, traces, screenshots, archives and candidate code retained. Clear space before restarting the complete six-run comparison.'; rows=$targets }
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $cleanupFile -Encoding utf8NoBOM
foreach ($row in $targets) {
  $checked = [IO.Path]::GetFullPath($row.path)
  if (-not $checked.StartsWith($taskBase + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Final deletion path escaped the task directory.' }
  Remove-Item -LiteralPath $checked -Recurse -Force
  $row.removed = -not (Test-Path -LiteralPath $checked)
  if (-not $row.removed) { throw "Profile removal did not finish: $checked" }
  $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $cleanupFile -Encoding utf8NoBOM
  Write-Output "$($row.run): removed $($row.bytes) bytes"
}
