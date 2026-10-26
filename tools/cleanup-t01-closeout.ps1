$ErrorActionPreference='Stop'
$taskWorkspace=[IO.Path]::GetFullPath('D:\星际')
$taskReportPath=Join-Path $taskWorkspace 'reports\qa\t01-closeout-20261027.json'
$taskReport=Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json
if($taskReport.git.localMainIntegration -ne 'verified-fast-forward'){throw 'Local integration not verified'}
$taskKeep=[IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskReport.delivery.file))
if((Get-FileHash -LiteralPath $taskKeep).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256){throw 'Delivery changed'}
$taskActive=Get-Content -LiteralPath (Join-Path $taskWorkspace 'reports\local\t01-20261024\active-source.json') -Raw | ConvertFrom-Json
if([IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskActive.offlineDonor.out)) -ne $taskKeep){throw 'Donor mismatch'}
$taskFiles=0L;$taskBytes=0L
foreach($taskRelative in @('.cache\t01-closeout','.cache\t01-audio','.cache\audio-python','.cache\t01-feedback-repairs','reports\local\t01-20261024\offline-r32')){
 $taskAbsolute=[IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskRelative))
 if(-not $taskAbsolute.StartsWith($taskWorkspace+'\',[StringComparison]::OrdinalIgnoreCase) -or $taskKeep.StartsWith($taskAbsolute+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe cleanup target'}
 if(-not(Test-Path -LiteralPath $taskAbsolute)){continue}
 if((Resolve-Path -LiteralPath $taskAbsolute).Path -ne $taskAbsolute -or (Get-Item -LiteralPath $taskAbsolute).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unexpected resolved target'}
 if(Get-ChildItem -LiteralPath $taskAbsolute -Recurse -Force -Attributes ReparsePoint){throw 'Nested reparse point'}
 foreach($taskFile in Get-ChildItem -LiteralPath $taskAbsolute -File -Recurse -Force){$taskFiles++;$taskBytes+=$taskFile.Length}
 Remove-Item -LiteralPath $taskAbsolute -Recurse -Force
}
if((Get-FileHash -LiteralPath $taskKeep).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256){throw 'Delivery changed during cleanup'}
if((Get-FileHash -LiteralPath (Join-Path $taskWorkspace $taskReport.preservation.current.file)).Hash.ToLowerInvariant() -ne $taskReport.preservation.current.sha256){throw 'Current changed during cleanup'}
$taskReport.retention.cleanupPending=$false
$taskReport.retention|Add-Member -NotePropertyName removedFiles -NotePropertyValue $taskFiles -Force
$taskReport.retention|Add-Member -NotePropertyName removedLogicalBytes -NotePropertyValue $taskBytes -Force
$taskReport|ConvertTo-Json -Depth 45|Set-Content -LiteralPath $taskReportPath -Encoding utf8
[pscustomobject]@{files=$taskFiles;bytes=$taskBytes;deliveryVerified=$true}|ConvertTo-Json -Compress
