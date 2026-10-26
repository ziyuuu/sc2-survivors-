$ErrorActionPreference='Stop'
$taskWorkspace=[IO.Path]::GetFullPath('D:\星际')
$taskReportFile=Join-Path $taskWorkspace 'reports\qa\t01-framing-catalogue-20261026.json'
$taskReport=Get-Content -LiteralPath $taskReportFile -Raw | ConvertFrom-Json
if($taskReport.status -ne 'implemented-engineering-verified-awaiting-user-visual-review'){throw 'Delivery is not verified'}
$taskKeep=[IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskReport.delivery.file))
if((Get-FileHash -LiteralPath $taskKeep -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256){throw 'Current T01 changed'}
$taskSource=Get-Content -LiteralPath (Join-Path $taskWorkspace 'reports\local\t01-20261024\active-source.json') -Raw | ConvertFrom-Json
if([IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskSource.offlineDonor.out)) -ne $taskKeep){throw 'Active donor not updated'}
$taskTargets=@('.cache\t01-framing','reports\local\t01-20261024\offline-r22','reports\local\t01-20261024\offline-r23','reports\local\t01-20261024\offline-r24')
$taskFiles=0L;$taskBytes=0L
foreach($taskRelative in $taskTargets){
 $taskAbsolute=[IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskRelative))
 if(-not $taskAbsolute.StartsWith($taskWorkspace+'\',[StringComparison]::OrdinalIgnoreCase) -or $taskKeep.StartsWith($taskAbsolute+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe cleanup target'}
 if(-not(Test-Path -LiteralPath $taskAbsolute)){continue}
 if((Resolve-Path -LiteralPath $taskAbsolute).Path -ne $taskAbsolute){throw 'Unexpected resolved target'}
 if((Get-Item -LiteralPath $taskAbsolute).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Cleanup target is a link'}
 foreach($taskFile in Get-ChildItem -LiteralPath $taskAbsolute -File -Recurse -Force){$taskFiles++;$taskBytes+=$taskFile.Length}
 Remove-Item -LiteralPath $taskAbsolute -Recurse -Force
}
if((Get-FileHash -LiteralPath $taskKeep -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256){throw 'Delivery changed during cleanup'}
$taskReport.retention.cleanupPending=$false
$taskReport.retention | Add-Member -NotePropertyName removedFiles -NotePropertyValue $taskFiles -Force
$taskReport.retention | Add-Member -NotePropertyName removedLogicalBytes -NotePropertyValue $taskBytes -Force
$taskReport | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath $taskReportFile -Encoding utf8
[pscustomobject]@{files=$taskFiles;logicalBytes=$taskBytes;deliveryVerified=$true} | ConvertTo-Json -Compress
