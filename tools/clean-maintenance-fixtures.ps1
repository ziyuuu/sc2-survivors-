$ErrorActionPreference='Stop'
$maintenanceRoot=(Resolve-Path -LiteralPath 'D:\星际').Path
$maintenanceCache=[IO.Path]::GetFullPath((Join-Path $maintenanceRoot '.cache'))
$maintenanceOut=Join-Path $maintenanceRoot 'reports/local/maintenance-audit-20261008'
$startup=Get-Content -LiteralPath (Join-Path $maintenanceOut 'startup.json') -Raw | ConvertFrom-Json
$update=Get-Content -LiteralPath (Join-Path $maintenanceOut 'handoff-update.json') -Raw | ConvertFrom-Json
$offline=Get-Content -LiteralPath (Join-Path $maintenanceOut 'current-logic/offline/offline.json') -Raw | ConvertFrom-Json
$attempt=Get-Content -LiteralPath (Join-Path $maintenanceOut 'current-logic/offline/attempt-1.json') -Raw | ConvertFrom-Json
if(!$startup.passed -or !$update.passed -or $offline.failure -or $offline.checks.Count -ne 6){throw 'Final package and offline checks must pass before fixture cleanup'}
$targets=@($startup.root,$update.root)+@($offline.profiles)+@($attempt.profiles)
$commands=@(Get-CimInstance Win32_Process | ForEach-Object {$_.CommandLine} | Where-Object {$_})
$rows=[Collections.Generic.List[object]]::new()
foreach($target in @($targets | Sort-Object -Unique)){
 $absolute=[IO.Path]::GetFullPath($target)
 if(!$absolute.StartsWith($maintenanceCache+'\',[StringComparison]::OrdinalIgnoreCase)){throw "Fixture escapes project cache: $absolute"}
 if([IO.Path]::GetDirectoryName($absolute) -ne $maintenanceCache -or [IO.Path]::GetFileName($absolute) -notmatch '^(ui-coze-main-|current-update-|ui-offline-final-)[a-zA-Z0-9]+$'){throw "Unexpected fixture: $absolute"}
 if(!(Test-Path -LiteralPath $absolute)){$rows.Add(@{path=$absolute;status='already absent'});continue}
 if(@($commands | Where-Object {$_.IndexOf($absolute,[StringComparison]::OrdinalIgnoreCase) -ge 0 -or $_.IndexOf($absolute.Replace('\','/'),[StringComparison]::OrdinalIgnoreCase) -ge 0}).Count){throw "Fixture still has a running process: $absolute"}
 $all=@(Get-Item -LiteralPath $absolute -Force)+@(Get-ChildItem -LiteralPath $absolute -Recurse -Force)
 if(@($all | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}).Count){throw "Fixture contains a link: $absolute"}
 $files=@($all | Where-Object {!$_.PSIsContainer})
 # The absolute immediate child, its full contents and active-process state were checked above.
 Remove-Item -LiteralPath $absolute -Recurse -Force
 if(Test-Path -LiteralPath $absolute){throw "Fixture cleanup incomplete: $absolute"}
 $rows.Add(@{path=$absolute;status='removed';files=$files.Count;logicalBytes=($files | Measure-Object Length -Sum).Sum})
}
$result=@{at=(Get-Date).ToUniversalTime().ToString('o');note='Only synthetic fixture directories named by this completed QA run; reports, captures and application packages retained';rows=$rows}
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $maintenanceOut 'final-fixture-cleanup.json') -Encoding utf8
$rows | Select-Object path,status,files,logicalBytes | ConvertTo-Json -Compress
