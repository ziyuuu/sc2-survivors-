$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'reports/local/v02-20261024'))
$resultFile = Join-Path $taskRoot 'route-result.json'
if (-not (Test-Path -LiteralPath $resultFile)) { throw 'Verified route result is required before profile cleanup.' }
$result = Get-Content -LiteralPath $resultFile -Raw | ConvertFrom-Json
if ($result.status -ne 'bounded-route-completed') { throw 'Route has not completed.' }
$names = @('representative-r1-profile','representative-r2-profile','representative-r3-profile')
$reports = @('representative-r1','representative-r2','representative-r3','representative-r4','representative-r5') | ForEach-Object { Get-Content -LiteralPath (Join-Path $taskRoot ($_ + '/report.json')) -Raw | ConvertFrom-Json }
foreach ($report in $reports) { if (-not $report.profileClosed) { throw ('Browser profile is not confirmed closed: ' + $report.run) } }
$plan = @()
foreach ($name in $names) {
 $target = [IO.Path]::GetFullPath((Join-Path $taskRoot $name))
 if (-not $target.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($target) -ne $name) { throw ('Unsafe cleanup path: ' + $target) }
 if (-not (Test-Path -LiteralPath $target -PathType Container)) { throw ('Expected generated profile missing: ' + $target) }
 if ((Get-Item -LiteralPath $target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw ('Reparse point is not a disposable profile: ' + $target) }
 if (@(Get-ChildItem -LiteralPath $target -Recurse -Force -Attributes ReparsePoint).Count) { throw ('Profile contains a reparse point: ' + $target) }
 $references = @($reports | Where-Object { [IO.Path]::GetFullPath($_.profile) -eq $target })
 if (-not $references.Count) { throw ('Profile lacks ownership evidence: ' + $target) }
 $files = @(Get-ChildItem -LiteralPath $target -Recurse -Force -File)
 $bytes = ($files | Measure-Object -Property Length -Sum).Sum
 $plan += [PSCustomObject]@{path=$target; runs=@($references.run); files=$files.Count; bytes=[long]$bytes; closed=$true}
}
$record = [ordered]@{at=(Get-Date).ToString('o');root=$taskRoot;verifiedResult='route-result.json';paths=$plan;preserved='All raw reports, screenshots, logs, archives, source and controller artifacts; only these owned closed test browser profiles are removed.';completed=$false}
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskRoot 'cleanup.json') -Encoding utf8
foreach ($item in $plan) { Remove-Item -LiteralPath $item.path -Recurse -Force; if (Test-Path -LiteralPath $item.path) { throw ('Profile remains: ' + $item.path) } }
$record.completed=$true
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskRoot 'cleanup.json') -Encoding utf8
[PSCustomObject]@{profiles=$plan.Count;bytes=($plan | Measure-Object -Property bytes -Sum).Sum;completed=$true} | ConvertTo-Json -Compress
