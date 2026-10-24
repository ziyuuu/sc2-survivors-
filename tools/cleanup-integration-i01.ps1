$ErrorActionPreference='Stop'
$taskBase=[IO.Path]::GetFullPath('D:\星际\reports\local\integration-i01-20261022')
$taskProfile=[IO.Path]::GetFullPath((Join-Path $taskBase 'qa-web-r1\profile'))
if(-not $taskProfile.StartsWith($taskBase+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Profile outside task folder'}
$taskRunning=Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.Name -match 'chrome') -and ($_.CommandLine.Contains($taskProfile) -or $_.CommandLine.Contains($taskProfile.Replace('\','/'))) }
if($taskRunning){throw 'This task browser is still running'}
$taskArchive=Get-Content -LiteralPath (Join-Path $taskBase 'r1-offline-archive\manifest.json') -Raw | ConvertFrom-Json
if(-not $taskArchive.pass){throw 'Archive not verified'}
$taskDeleted=@();$taskBefore=(Get-PSDrive D).Free
foreach($taskFile in $taskArchive.files){
 $taskTarget=[IO.Path]::GetFullPath($taskFile.file)
 if(-not $taskTarget.StartsWith($taskBase+'\',[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($taskTarget) -notin @('offline-game-r1.html','offline-lab-r1.html')){throw 'Unexpected archive removal target'}
 if((Get-FileHash -LiteralPath $taskTarget -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskFile.sha256){throw 'Old candidate changed'}
 if(-not (Test-Path -LiteralPath $taskFile.donor) -or -not (Test-Path -LiteralPath $taskFile.prefix) -or -not (Test-Path -LiteralPath $taskFile.suffix)){throw 'Missing reconstruction input'}
 Remove-Item -LiteralPath $taskTarget -Force
 $taskDeleted+=[pscustomobject]@{path=$taskTarget;bytes=$taskFile.bytes;kind='reconstructable-r1-html';sha256=$taskFile.sha256}
}
if(Test-Path -LiteralPath $taskProfile){
 $taskResolved=(Resolve-Path -LiteralPath $taskProfile).Path
 if($taskResolved -ne $taskProfile -or -not $taskResolved.StartsWith($taskBase+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unexpected resolved profile path'}
 $taskProfileBytes=(Get-ChildItem -LiteralPath $taskResolved -File -Force -Recurse | Measure-Object -Property Length -Sum).Sum
 Remove-Item -LiteralPath $taskResolved -Force -Recurse
 $taskDeleted+=[pscustomobject]@{path=$taskResolved;bytes=$taskProfileBytes;kind='closed-task-browser-profile'}
}
$taskResult=[pscustomobject]@{pass=$true;at=(Get-Date).ToString('o');deleted=$taskDeleted;archive='reports/local/integration-i01-20261022/r1-offline-archive/manifest.json';freeBefore=$taskBefore;freeAfter=(Get-PSDrive D).Free;scope='Only this task closed browser profile and two SHA-verified reconstructable R1 offline files. Raw inputs, screenshots, logs and final candidates retained.'}
$taskResult | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskBase 'cleanup.json') -Encoding utf8
$taskResult | ConvertTo-Json -Depth 5 -Compress
