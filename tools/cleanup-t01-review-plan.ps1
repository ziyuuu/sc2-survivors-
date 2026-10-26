$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$reportPath = Join-Path $workspace 'reports\qa\t01-feedback-repair-plan-20261026.json'
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
if ($report.status -ne 'inspection-and-plan-complete-not-implemented') { throw 'Inspection report missing' }
foreach ($artifact in @($report.delivery, $report.current)) {
  $file = Join-Path $workspace $artifact.file
  if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $artifact.sha256) { throw "Artifact changed: $file" }
}
$removedFiles = 0L
$removedBytes = 0L
foreach ($relative in @('.cache\t01-review-plan', '.cache\t01-review-plan-native.log')) {
  $target = [IO.Path]::GetFullPath((Join-Path $workspace $relative))
  if (-not $target.StartsWith($workspace + '\.cache\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe target' }
  if (-not (Test-Path -LiteralPath $target)) { continue }
  $item = Get-Item -LiteralPath $target -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing reparse point' }
  $all = if ($item.PSIsContainer) { @(Get-ChildItem -LiteralPath $target -Recurse -Force) } else { @($item) }
  if (@($all | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Nested reparse point' }
  $files = @($all | Where-Object { -not $_.PSIsContainer })
  $removedFiles += $files.Count
  $removedBytes += [long](($files | Measure-Object -Property Length -Sum).Sum)
  Remove-Item -LiteralPath $target -Recurse -Force
  if (Test-Path -LiteralPath $target) { throw 'Cleanup incomplete' }
}
$report.retention = [pscustomobject]@{ cleanupPending=$false; removedFiles=$removedFiles; removedBytes=$removedBytes; kept='方案、简要结论、复现代码、当前r27及必要输入；无本轮截图/视频/缓存长期保留' }
$report | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $reportPath -Encoding utf8
[pscustomobject]@{removedFiles=$removedFiles;removedBytes=$removedBytes;cleanupPending=$false} | ConvertTo-Json -Compress
