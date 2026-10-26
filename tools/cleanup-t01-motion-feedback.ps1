$ErrorActionPreference='Stop'
$taskWorkspace=[IO.Path]::GetFullPath('D:\星际')
$taskReportFile=Join-Path $taskWorkspace 'reports\qa\t01-motion-audio-20261026.json'
$taskReport=Get-Content -LiteralPath $taskReportFile -Raw | ConvertFrom-Json
if($taskReport.status -ne 'implemented-engineering-verified-awaiting-user-visual-review'){throw 'Delivery not verified'}
$taskKeep=[IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskReport.delivery.file))
if((Get-FileHash -LiteralPath $taskKeep).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256){throw 'Delivery changed'}
$taskActive=Get-Content (Join-Path $taskWorkspace 'reports\local\t01-20261024\active-source.json') -Raw | ConvertFrom-Json
if([IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskActive.offlineDonor.out)) -ne $taskKeep){throw 'Donor mismatch'}
$taskFiles=0L;$taskBytes=0L
foreach($taskRelative in @('.cache\t01-motion-feedback','.cache\t01-audio','.cache\audio-python','reports\local\t01-20261024\offline-r29')){
 $taskAbsolute=[IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskRelative))
 if(-not $taskAbsolute.StartsWith($taskWorkspace+'\',[StringComparison]::OrdinalIgnoreCase) -or $taskKeep.StartsWith($taskAbsolute+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe cleanup target'}
 if(-not(Test-Path -LiteralPath $taskAbsolute)){continue}
 if((Resolve-Path -LiteralPath $taskAbsolute).Path -ne $taskAbsolute -or (Get-Item -LiteralPath $taskAbsolute).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unexpected resolved target'}
 foreach($taskFile in Get-ChildItem -LiteralPath $taskAbsolute -File -Recurse -Force){$taskFiles++;$taskBytes+=$taskFile.Length}
 Remove-Item -LiteralPath $taskAbsolute -Recurse -Force
}
if((Get-FileHash -LiteralPath $taskKeep).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256){throw 'Delivery changed during cleanup'}
if((Get-FileHash -LiteralPath (Join-Path $taskWorkspace $taskReport.preservation.current.file)).Hash.ToLowerInvariant() -ne $taskReport.preservation.current.sha256){throw 'Current changed during cleanup'}
$taskReport.retention.cleanupPending=$false
$taskReport.retention | Add-Member -NotePropertyName removedFiles -NotePropertyValue $taskFiles -Force
$taskReport.retention | Add-Member -NotePropertyName removedLogicalBytes -NotePropertyValue $taskBytes -Force
$taskReport | ConvertTo-Json -Depth 45 | Set-Content -LiteralPath $taskReportFile -Encoding utf8
[pscustomobject]@{files=$taskFiles;bytes=$taskBytes;deliveryVerified=$true} | ConvertTo-Json -Compress
