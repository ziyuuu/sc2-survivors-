param([switch]$Execute, [ValidateSet('caches','builds','all')][string]$Phase='all')
$ErrorActionPreference='Stop'
$projectRoot='D:\星际'
$recordRoot=Join-Path $projectRoot 'reports\local\disk-cleanup-d04-20261021'
$processes=@(Get-CimInstance Win32_Process)
$rows=@()
if($Phase -in @('caches','all')) {
    $rows+=@(Get-Content -LiteralPath (Join-Path $recordRoot 'cache-plan.json') -Raw | ConvertFrom-Json)
}
if($Phase -in @('builds','all')) {
    $plan=Get-Content -LiteralPath (Join-Path $recordRoot 'build-plan.json') -Raw | ConvertFrom-Json
    foreach($item in $plan.targets) {
        $rows+=[pscustomobject]@{path=(Join-Path $projectRoot $item.path);bytes=$item.bytes;category='archived-build';sha256=$item.sha256}
    }
}
$result=[ordered]@{started=(Get-Date).ToString('o');execute=[bool]$Execute;phase=$Phase;before=@(Get-PSDrive -Name C,D | Select-Object Name,Used,Free);targets=@()}
foreach($row in $rows) {
    $entry=[ordered]@{path=$row.path;category=$row.category;bytes=$row.bytes;status='pending';error=$null}
    try {
        $full=[IO.Path]::GetFullPath($row.path).TrimEnd('\')
        $allowed=@((Join-Path $projectRoot 'reports\local'),(Join-Path $projectRoot 'dist'),(Join-Path $projectRoot 'preview'),(Join-Path $projectRoot '.cache\p5-tests'),'C:\Users\zyuu\AppData\Local\Temp\tsx-zyuu','C:\Users\zyuu\AppData\Local\node-gyp\Cache')
        if(-not @($allowed | Where-Object { $full -eq $_ -or $full.StartsWith($_+'\',[StringComparison]::OrdinalIgnoreCase) }).Count) {throw 'Outside explicitly reviewed boundaries'}
        if(-not(Test-Path -LiteralPath $full)){$entry.status='already-absent';$result.targets+=[pscustomobject]$entry;continue}
        if((Resolve-Path -LiteralPath $full).ProviderPath.TrimEnd('\') -ne $full){throw 'Resolved path mismatch'}
        $ancestor=$full
        while($ancestor){if((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Reparse ancestor rejected'};$ancestor=Split-Path -Path $ancestor -Parent}
        $isDir=(Get-Item -LiteralPath $full).PSIsContainer
        if($isDir){
            $children=@(Get-ChildItem -LiteralPath $full -Force -Recurse)
            foreach($child in $children){if(($child.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not $child.FullName.StartsWith($full+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe descendant'}}
        }
        if(@($processes | Where-Object {$_.ProcessId -ne $PID -and $_.CommandLine -and ($_.CommandLine.IndexOf($full,[StringComparison]::OrdinalIgnoreCase) -ge 0 -or $_.CommandLine.IndexOf($full.Replace('\','/'),[StringComparison]::OrdinalIgnoreCase) -ge 0)}).Count){throw 'A running process references this target'}
        if($row.category -eq 'qa-browser-profile'){
            if(-not(Test-Path -LiteralPath (Join-Path $full 'Local State')) -or -not(Test-Path -LiteralPath (Join-Path $full 'Default'))){throw 'QA profile markers missing'}
            if(@($processes | Where-Object {$_.Name -match '^(chrome|chromium)\.exe$'}).Count){throw 'Chrome is still running; QA profiles retained'}
        }
        if($row.category -in @('test-compile-cache','synthetic-test-database') -and @($processes | Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -match '(vitest|tsx|--test|test:|qa-)'}).Count){throw 'Test process still running'}
        if($row.category -eq 'downloaded-header-cache' -and @($processes | Where-Object {$_.Name -match '^(msbuild|cl|ninja)\.exe$' -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match '(node-gyp|npm-cli|pnpm)')}).Count){throw 'Native dependency build still running'}
        if($row.category -eq 'archived-build'){
            if($isDir){throw 'Build plan must contain files only'}
            # The archiver already verified exact original/reconstructed hashes.
            # Recheck once immediately before mutation, rather than rereading every
            # multi-hundred-MB file both in this dry run and again on execution.
            if($Execute -and (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant() -ne $row.sha256){throw 'Build content changed after verified archival'}
            if((Get-Item -LiteralPath $full).Length -ne $row.bytes){throw 'Build size changed'}
        }
        if($Execute){
            if($isDir){Remove-Item -LiteralPath $full -Recurse -Force}else{Remove-Item -LiteralPath $full -Force}
            $entry.status='removed'
        }else{$entry.status='validated'}
    } catch {$entry.status='skipped-or-partial';$entry.error=$_.Exception.Message}
    $result.targets+=[pscustomobject]$entry
    $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $recordRoot ($Phase+'-'+$(if($Execute){'execute'}else{'dry-run'})+'.json')) -Encoding utf8
}
$result.after=@(Get-PSDrive -Name C,D | Select-Object Name,Used,Free)
$result.finished=(Get-Date).ToString('o')
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $recordRoot ($Phase+'-'+$(if($Execute){'execute'}else{'dry-run'})+'.json')) -Encoding utf8
[pscustomobject]@{phase=$Phase;execute=[bool]$Execute;targets=$rows.Count;status=@($result.targets | Group-Object status | Select-Object Name,Count);before=$result.before;after=$result.after} | ConvertTo-Json -Depth 5
