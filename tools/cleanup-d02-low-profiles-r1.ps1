$taskRoot = (Resolve-Path -LiteralPath 'D:\星际\reports\local\performance-d02-low-20261021').Path
$cleanupRows = @()
foreach ($run in @('functional-r1','functional-r2','functional-r3')) {
    $reportPath = Join-Path $taskRoot "$run\report.json"
    $runReport = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
    if (-not $runReport.failure) { throw "Incomplete run $run" }
    $profilePath = [System.IO.Path]::GetFullPath((Join-Path $taskRoot "$run\profile"))
    if (-not $profilePath.StartsWith($taskRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or -not $profilePath.EndsWith('\profile')) { throw 'Unsafe cleanup path' }
    $active = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($profilePath, [StringComparison]::OrdinalIgnoreCase) -ge 0 }
    if ($active) { throw "Profile still active: $run" }
    if (Test-Path -LiteralPath $profilePath) {
        $profileBytes = (Get-ChildItem -LiteralPath $profilePath -File -Recurse | Measure-Object Length -Sum).Sum
        Remove-Item -LiteralPath $profilePath -Recurse -Force
        $cleanupRows += @{run=$run;path=$profilePath;bytes=$profileBytes;removed=(-not (Test-Path -LiteralPath $profilePath));evidencePreserved=$reportPath}
    }
}
$cleanupRows | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $taskRoot 'profile-cleanup-r1.json') -Encoding utf8
$cleanupRows | Select-Object run,bytes,removed
