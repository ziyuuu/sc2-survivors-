param([switch]$Execute)
$ErrorActionPreference = 'Stop'
$taskRoot = 'D:\星际\reports\local\disk-cleanup-20261023'
$plan = Get-Content -LiteralPath (Join-Path $taskRoot 'plan.json') -Raw | ConvertFrom-Json
$processes = @(Get-CimInstance Win32_Process)
$result = [ordered]@{ started=(Get-Date).ToString('o'); execute=[bool]$Execute; beforeDrives=@(); targets=@(); finished=$null; afterDrives=@() }
$result.beforeDrives = @(Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -in @('C','D') } | Select-Object Name,Used,Free)
foreach ($target in $plan.targets) {
    $row = [ordered]@{path=$target.path; category=$target.category; plannedBytes=$target.bytes; status='pending'; beforeBytes=0; beforeFiles=0; afterBytes=$null; afterFiles=$null; error=$null}
    try {
        $full = [IO.Path]::GetFullPath($target.path).TrimEnd('\')
        $boundary = [IO.Path]::GetFullPath($target.boundary).TrimEnd('\')
        if ($full -ne $target.path.TrimEnd('\')) { throw 'Noncanonical target rejected' }
        if ($full -ne $boundary -and -not $full.StartsWith($boundary+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Target escaped its explicit boundary' }
        if ($boundary -match '^[CD]:$' -or $full.Length -lt 12) { throw 'Drive/root deletion rejected' }
        if ($full -match '\\(src|test|assets|public|preview|\.git)(\\|$)') { throw 'Protected project data rejected' }
        if (-not (Test-Path -LiteralPath $full)) { $row.status='already-absent'; $result.targets += [pscustomobject]$row; continue }
        $resolved = (Resolve-Path -LiteralPath $full).ProviderPath.TrimEnd('\')
        if ($resolved -ne $full) { throw 'Resolved target differs from planned absolute path' }
        # A junction in any ancestor or descendant can lead outside the reviewed scope.
        $ancestor = $full
        while ($ancestor) {
            if ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse ancestor rejected: $ancestor" }
            $ancestor = Split-Path -Path $ancestor -Parent
        }
        $entries = @(Get-ChildItem -LiteralPath $full -Force -Recurse)
        if (@($entries | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Reparse descendant rejected' }
        foreach ($entry in $entries) {
            if (-not $entry.FullName.StartsWith($full+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Enumerated entry escaped target' }
        }
        $files = @($entries | Where-Object { -not $_.PSIsContainer })
        $row.beforeFiles=$files.Count; $row.beforeBytes=($files | Measure-Object -Property Length -Sum).Sum
        if (@($processes | Where-Object { $_.CommandLine -and ($_.CommandLine.IndexOf($full,[StringComparison]::OrdinalIgnoreCase) -ge 0 -or $_.CommandLine.IndexOf($full.Replace('\','/'),[StringComparison]::OrdinalIgnoreCase) -ge 0) }).Count) { throw 'Target referenced by a running process' }
        if ($target.blockProcess -and @($processes | Where-Object { $_.Name -match $target.blockProcess }).Count) { throw 'Related application still running; cache preserved' }
        if ($target.category -eq 'qa-browser-profile' -and (-not (Test-Path -LiteralPath (Join-Path $full 'Local State')) -or -not (Test-Path -LiteralPath (Join-Path $full 'Default')))) { throw 'Expected test-browser profile markers absent' }
        if ($Execute) {
            Remove-Item -LiteralPath $full -Recurse -Force
            $row.status='removed'
        } else { $row.status='validated' }
    } catch {
        $row.status='skipped-or-partial'; $row.error=$_.Exception.Message
    }
    if (Test-Path -LiteralPath $target.path) {
        $left=@(Get-ChildItem -LiteralPath $target.path -Force -Recurse -File -ErrorAction SilentlyContinue)
        $row.afterFiles=$left.Count; $row.afterBytes=($left | Measure-Object -Property Length -Sum).Sum
    } else { $row.afterFiles=0; $row.afterBytes=0 }
    $result.targets += [pscustomobject]$row
    $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskRoot $(if ($Execute) {'cleanup-result.json'} else {'validated-plan.json'})) -Encoding utf8
}
$result.finished=(Get-Date).ToString('o')
$result.afterDrives = @(Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -in @('C','D') } | Select-Object Name,Used,Free)
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskRoot $(if ($Execute) {'cleanup-result.json'} else {'validated-plan.json'})) -Encoding utf8
[pscustomobject]@{execute=[bool]$Execute;targets=$result.targets.Count;status=@($result.targets | Group-Object status | Select-Object Name,Count);beforeDrives=$result.beforeDrives;afterDrives=$result.afterDrives} | ConvertTo-Json -Depth 6

