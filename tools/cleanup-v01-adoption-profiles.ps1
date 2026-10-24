$ErrorActionPreference='Stop'
$batchRoot=(Resolve-Path -LiteralPath 'D:\星际\reports\local\v01-20261024').Path
if($batchRoot -ne 'D:\星际\reports\local\v01-20261024'){throw 'Unexpected batch root'}
$processLines=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'chrome|node'} | ForEach-Object {$_.CommandLine -replace '\\','/'})
$targets=@(
 @{run='background-terran-r1';profile='background-terran-r1/profile'},
 @{run='background-lifecycle-r1';profile='background-lifecycle-r1/profile'},
 @{run='final-web-background-r1';profile='final-web-background-r1-profile'},
 @{run='final-offline-background-r1';profile='final-offline-background-r1-profile'},
 @{run='background-program-trace-r1';profile='background-program-trace-r1/profile'}
)
$verified=@()
foreach($target in $targets){
 $candidate=Join-Path $batchRoot $target.profile
 if(-not(Test-Path -LiteralPath $candidate)){throw ('Missing expected profile: '+$candidate)}
 $reportPath=Join-Path $batchRoot ($target.run+'/report.json')
 $profileClosed=& node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(r.profileClosed===true));' $reportPath
 if($LASTEXITCODE -ne 0 -or $profileClosed -ne 'true'){throw ('Report does not confirm closed browser: '+$target.run)}
 $resolved=(Resolve-Path -LiteralPath $candidate).Path
 if(-not $resolved.StartsWith($batchRoot+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe profile path'}
 if((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refuse linked directory'}
 if(Get-ChildItem -LiteralPath $resolved -Recurse -Force | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}){throw 'Refuse linked descendant'}
 $needle=$resolved.Replace('\','/')
 if($processLines | Where-Object {$_ -and $_.Contains($needle)}){throw ('Process still uses profile: '+$target.run)}
 $size=(Get-ChildItem -LiteralPath $resolved -Recurse -File -Force | Measure-Object -Property Length -Sum).Sum
 $verified+=@{path=$resolved;bytes=$size}
}
$rows=@()
foreach($entry in $verified){Remove-Item -LiteralPath $entry.path -Recurse -Force;$rows+=@{path=$entry.path;removed=$true;bytes=$entry.bytes}}
@{scope='Only five explicitly named closed formal-adoption and residual-diagnostic browser profiles. All raw traces, performance, failures, screenshots, archives and frozen tools retained.';rows=$rows} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $batchRoot 'profile-cleanup-adoption.json') -Encoding utf8
$rows | Format-Table -AutoSize
