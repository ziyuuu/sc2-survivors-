$ErrorActionPreference='Stop'
$batchRoot=(Resolve-Path -LiteralPath 'D:\星际\reports\local\d05-checkpoint-20261023').Path
if($batchRoot -ne 'D:\星际\reports\local\d05-checkpoint-20261023'){throw 'Unexpected batch root'}
$processLines=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'chrome|node'} | ForEach-Object {$_.CommandLine -replace '\\','/'})
$rows=@()
foreach($name in @('qa-menu-final-r2','qa-menu-final-r3','qa-menu-final-r4','qa-menu-final-r5','qa-menu-final-r6','qa-offline-r1','qa-storage-cost-r1','qa-storage-r1','qa-storage-r2','qa-web-r1','qa-web-r2','qa-web-r3')){
 $candidate=Join-Path (Join-Path $batchRoot $name) 'profile'
 if(-not(Test-Path -LiteralPath $candidate)){continue}
 $resolved=(Resolve-Path -LiteralPath $candidate).Path
 if(-not $resolved.StartsWith($batchRoot+'\',[StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolved) -ne 'profile'){throw 'Unsafe profile path'}
 $item=Get-Item -LiteralPath $resolved
 if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refuse linked directory'}
 $needle=$resolved.Replace('\','/')
 if($processLines | Where-Object {$_ -and $_.Contains($needle)}){$rows+=@{path=$resolved;removed=$false;reason='Process still uses this profile'};continue}
 $size=(Get-ChildItem -LiteralPath $resolved -Recurse -File -Force | Measure-Object -Property Length -Sum).Sum
 try{Remove-Item -LiteralPath $resolved -Recurse -Force;$rows+=@{path=$resolved;removed=$true;bytes=$size}}catch{$rows+=@{path=$resolved;removed=$false;reason=$_.Exception.Message}}
}
@{scope='Only closed isolated D05 browser profiles; scripts, results, screenshots, original failures and fixtures retained';rows=$rows} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $batchRoot 'profile-cleanup.json') -Encoding utf8
$rows | Format-Table -AutoSize
