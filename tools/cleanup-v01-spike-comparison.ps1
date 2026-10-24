$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'PowerShell 7 is required before any deletion.' }
$taskBase = [IO.Path]::GetFullPath('D:\星际\reports\local\v01-20261024')
$cleanupFile = Join-Path $taskBase 'spike-comparison-profile-cleanup.json'
if (Test-Path -LiteralPath $cleanupFile) { throw 'Cleanup record already exists.' }
$specs = @(
  @{ run='spike-shared-clean-a1'; profile='spike-shared-clean-a1\profile' },
  @{ run='spike-shared-clean-b1'; profile='spike-shared-clean-b1\profile' },
  @{ run='spike-shared-clean-b2'; profile='spike-shared-clean-b2\profile' },
  @{ run='spike-shared-clean-a2'; profile='spike-shared-clean-a2\profile' },
  @{ run='spike-shared-clean-a3'; profile='spike-shared-clean-a3\profile' },
  @{ run='spike-shared-clean-b3'; profile='spike-shared-clean-b3\profile' },
  @{ run='spike-kernel-r1'; profile='spike-kernel-r1\profile' },
  @{ run='spike-kernel-r2'; profile='spike-kernel-r2\profile' },
  @{ run='spike-shared-lifecycle-r1'; profile='spike-shared-lifecycle-r1\profile' }
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
$record = [PSCustomObject]@{ date='2026-10-24'; scope='Only nine verified closed comparison, lifecycle and first-kernel-attempt profiles. All raw reports, traces, logs, screenshots, actual archives and candidates are retained. The next authorized kernel capture has not started.'; rows=$targets }
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
