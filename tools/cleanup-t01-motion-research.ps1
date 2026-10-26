$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$taskReportPath=Join-Path $taskRoot 'reports/qa/t01-all-motion-source-search-20261026.json'
$taskReport=Get-Content -LiteralPath $taskReportPath -Raw|ConvertFrom-Json
foreach($taskAudio in $taskReport.originalAudio){if((Get-FileHash -LiteralPath $taskAudio.file).Hash.ToLowerInvariant() -ne $taskAudio.sha256){throw 'Original audio changed'}}
$taskTarget=[IO.Path]::GetFullPath((Join-Path $taskRoot '.cache/t01-all-motion'))
if($taskTarget -ne (Join-Path $taskRoot '.cache/t01-all-motion') -or !$taskTarget.StartsWith($taskRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid cleanup path'}
$taskCount=0;$taskBytes=0
if(Test-Path -LiteralPath $taskTarget){
 foreach($taskSource in Get-ChildItem -LiteralPath (Join-Path $taskTarget 'data') -File -Recurse){
  $taskRel=[IO.Path]::GetRelativePath((Join-Path $taskTarget 'data'),$taskSource.FullName)
  $taskSaved=Join-Path $taskRoot ('assets/private/movement-research/data/'+$taskRel)
  if((Get-FileHash -LiteralPath $taskSource.FullName).Hash -ne (Get-FileHash -LiteralPath $taskSaved).Hash){throw 'Original data copy mismatch'}
 }
 $taskItems=@(Get-ChildItem -LiteralPath $taskTarget -File -Recurse)
 $taskCount=$taskItems.Count;$taskBytes=($taskItems|Measure-Object -Property Length -Sum).Sum
 Remove-Item -LiteralPath $taskTarget -Recurse -Force
}
$taskReport.retention.cleanupPending=$false
$taskReport.retention|Add-Member -NotePropertyName removedFiles -NotePropertyValue $taskCount -Force
$taskReport.retention|Add-Member -NotePropertyName removedBytes -NotePropertyValue $taskBytes -Force
$taskReport|ConvertTo-Json -Depth 65|Set-Content -LiteralPath $taskReportPath -Encoding utf8
Write-Output ('Removed temporary research/cache files: '+$taskCount+'; bytes: '+$taskBytes+'; original sources preserved.')
