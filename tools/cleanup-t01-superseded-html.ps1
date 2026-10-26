$ErrorActionPreference='Stop'
$taskBase='D:\星际\reports\local\t01-20261024'
$taskExternal='C:\Users\zyuu\.codex\visualizations\2026\09\20\01a0bf9c-1981-7eb3-8a7e-55c9fd6884c9\t01-evidence'
$taskOutput='D:\星际\reports\local\disk-cleanup-20261025\superseded-t01-html.json'
if(Test-Path -LiteralPath $taskOutput){throw 'Preserve existing cleanup record'}
$taskCurrent=Get-Content -LiteralPath (Join-Path $taskBase 'offline-r6\build.json') -Raw | ConvertFrom-Json
$taskCurrentFile=[IO.Path]::GetFullPath((Join-Path 'D:\星际' $taskCurrent.artifacts[0].file))
if((Get-FileHash -LiteralPath $taskCurrentFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskCurrent.artifacts[0].sha256){throw 'Current delivery changed'}
$taskRows=@()
foreach($taskRun in @('offline-r4','offline-r5')){
 $taskBuild=Get-Content -LiteralPath (Join-Path $taskBase ($taskRun+'\build.json')) -Raw | ConvertFrom-Json
 foreach($taskArtifact in $taskBuild.artifacts){
  $taskPath=[IO.Path]::GetFullPath($(if([IO.Path]::IsPathRooted($taskArtifact.file)){$taskArtifact.file}else{Join-Path 'D:\星际' $taskArtifact.file}))
  $taskExpected=Join-Path $(if($taskRun -eq 'offline-r5'){$taskExternal}else{$taskBase}) ($taskRun+'\'+$taskArtifact.mode+'.html')
  if($taskArtifact.mode -notin @('dynamic','static') -or $taskPath -ne $taskExpected -or $taskPath -eq $taskCurrentFile){throw 'Unexpected cleanup path'}
  if((Resolve-Path -LiteralPath $taskPath).Path -ne $taskExpected){throw 'Resolved path mismatch'}
  if((Get-Item -LiteralPath $taskPath).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refuse reparse point'}
  if((Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskArtifact.sha256){throw 'Old artifact hash mismatch'}
  $taskRows += [PSCustomObject]@{path=$taskPath;bytes=$taskArtifact.bytes;sha256=$taskArtifact.sha256;status='verified';reason='Superseded by the verified combined offline-r6 HTML; retain source metadata, reports and screenshots.'}
 }
}
$taskRows | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskOutput -Encoding utf8
foreach($taskRow in $taskRows){Remove-Item -LiteralPath $taskRow.path -Force;$taskRow.status='removed';$taskRows | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskOutput -Encoding utf8}
$taskRows | Select-Object path,bytes,status | ConvertTo-Json -Compress
