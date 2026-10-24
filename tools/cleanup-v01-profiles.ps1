$ErrorActionPreference='Stop'
$batchRoot=(Resolve-Path -LiteralPath 'D:\星际\reports\local\v01-20261024').Path
if($batchRoot -ne 'D:\星际\reports\local\v01-20261024'){throw 'Unexpected batch root'}
$processLines=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'chrome|node'} | ForEach-Object {$_.CommandLine -replace '\\','/'})
$rows=@()
$profiles=@('baseline-terran-r2/profile','final-terran-r3/profile','image-terran-r3/profile','image-terran-r4/profile','image-terran-r5/profile','pilot-terran-r1/profile','pilot-terran-r2/profile','fence-terran-r1/profile','lifecycle-profile','steady-profile','visibility-profile','growth-profile','growth-r2-profile','growth-r3-profile','growth-r4-profile','dense-profile','dense-r2-profile','final-web-r1-profile','final-web-r2-profile','final-offline-r1-profile','final-offline-r2-profile')
foreach($name in $profiles){
 $candidate=Join-Path $batchRoot $name
 if(-not(Test-Path -LiteralPath $candidate)){continue}
 $resolved=(Resolve-Path -LiteralPath $candidate).Path
 if(-not $resolved.StartsWith($batchRoot+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe profile path'}
 if((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refuse linked directory'}
 $needle=$resolved.Replace('\','/')
 if($processLines | Where-Object {$_ -and $_.Contains($needle)}){$rows+=@{path=$resolved;removed=$false;reason='Process still uses this profile'};continue}
 $size=(Get-ChildItem -LiteralPath $resolved -Recurse -File -Force | Measure-Object -Property Length -Sum).Sum
 try{Remove-Item -LiteralPath $resolved -Recurse -Force;$rows+=@{path=$resolved;removed=$true;bytes=$size}}catch{$rows+=@{path=$resolved;removed=$false;reason=$_.Exception.Message}}
}
@{scope='Only closed isolated V01 browser profiles. Logs, raw failures, original checkpoints, frozen tools and screenshots retained.';rows=$rows} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $batchRoot 'profile-cleanup.json') -Encoding utf8
$rows | Format-Table -AutoSize
