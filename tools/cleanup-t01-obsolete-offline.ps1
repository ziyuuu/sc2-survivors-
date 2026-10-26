$ErrorActionPreference='Stop'
$taskBase=[IO.Path]::GetFullPath('D:\星际\reports\local\t01-20261024')
$taskRoot=[IO.Path]::GetFullPath((Join-Path $taskBase 'offline-r2'))
$taskReport=Get-Content -LiteralPath (Join-Path $taskRoot 'build.json') -Raw | ConvertFrom-Json
if($taskReport.offlineVerified -ne $false){throw 'Preserve verified build'}
if(@(Get-ChildItem -LiteralPath $taskBase -Directory -Filter 'offline-qa-*').Count){throw 'Check whether offline QA depends on old generated artifacts'}
$taskOut=Join-Path $taskBase 'offline-derived-cleanup-r1.json'
if(Test-Path -LiteralPath $taskOut){throw 'Preserve existing cleanup record'}
$taskRows=@()
foreach($taskMode in @('dynamic','static')){
 $taskFile=Join-Path $taskRoot ($taskMode+'.html')
 $taskResolved=(Resolve-Path -LiteralPath $taskFile).Path
 if($taskResolved -ne $taskFile -or -not $taskResolved.StartsWith($taskBase+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe derived artifact path'}
 $taskMeta=@($taskReport.artifacts | Where-Object mode -eq $taskMode)
 if($taskMeta.Count -ne 1){throw 'Missing artifact metadata'}
 $taskHash=(Get-FileHash -LiteralPath $taskFile -Algorithm SHA256).Hash.ToLowerInvariant()
 if($taskHash -ne $taskMeta[0].sha256){throw 'Artifact changed'}
 $taskRows += [PSCustomObject]@{path=$taskResolved;bytes=(Get-Item -LiteralPath $taskFile).Length;sha256=$taskHash;status='verified-generated-unused';reason='Superseded untested derived HTML; exact build metadata, frozen input and asset donor remain. Raw QA evidence is not removed.'}
}
$taskRows | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskOut -Encoding utf8
foreach($taskRow in $taskRows){Remove-Item -LiteralPath $taskRow.path -Force;$taskRow.status='removed';$taskRows | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskOut -Encoding utf8}
$taskRows | Select-Object path,bytes,status | ConvertTo-Json -Compress
