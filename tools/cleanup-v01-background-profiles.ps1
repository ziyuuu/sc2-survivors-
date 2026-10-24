$ErrorActionPreference='Stop'
$batchRoot=(Resolve-Path -LiteralPath 'D:\星际\reports\local\v01-20261024').Path
if($batchRoot -ne 'D:\星际\reports\local\v01-20261024'){throw 'Unexpected batch root'}
$processLines=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'chrome|node'} | ForEach-Object {$_.CommandLine -replace '\\','/'})
$rows=@()
$runNames=@('html-image-terran-r1','image-pixels-r1','background-gpu-trace-r1','background-angle-trace-r2','float-skin-terran-r1','float-skin-baseline-a2','skin-visual-r1','skin-float-visual-r1','float-skin-lifecycle-r1','float-skin-terran-r2','float-skin-terran-r3')
foreach($name in $runNames){
 $candidate=Join-Path $batchRoot ($name+'/profile')
 if(-not(Test-Path -LiteralPath $candidate)){continue}
 $reportPath=Join-Path $batchRoot ($name+'/report.json')
 $profileClosed=& node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(r.profileClosed===true));' $reportPath
 if($LASTEXITCODE -ne 0 -or $profileClosed -ne 'true'){throw ('Report does not confirm closed browser: '+$name)}
 $resolved=(Resolve-Path -LiteralPath $candidate).Path
 if(-not $resolved.StartsWith($batchRoot+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe profile path'}
 if((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refuse linked directory'}
 $needle=$resolved.Replace('\','/')
 if($processLines | Where-Object {$_ -and $_.Contains($needle)}){throw ('Process still uses profile: '+$name)}
 $size=(Get-ChildItem -LiteralPath $resolved -Recurse -File -Force | Measure-Object -Property Length -Sum).Sum
 Remove-Item -LiteralPath $resolved -Recurse -Force
 $rows+=@{path=$resolved;removed=$true;bytes=$size}
}
@{scope='Only eleven explicitly named, closed background-optimization browser profiles. Raw traces, performance data, all failures, screenshots, actual archives, frozen tools and the unapplied proposal retained.';rows=$rows} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $batchRoot 'profile-cleanup-background.json') -Encoding utf8
$rows | Format-Table -AutoSize
