param([switch]$ResumeLink)
$ErrorActionPreference='Stop'
$taskWorkspace=[IO.Path]::GetFullPath('D:\星际\reports\local\t01-20261024')
$taskEvidence=[IO.Path]::GetFullPath('C:\Users\zyuu\.codex\visualizations\2026\09\20\01a0bf9c-1981-7eb3-8a7e-55c9fd6884c9\t01-evidence')
$taskSource=[IO.Path]::GetFullPath((Join-Path $taskWorkspace 'card-cycles-r2'))
$taskDestination=[IO.Path]::GetFullPath((Join-Path $taskEvidence 'card-cycles-r2'))
if($ResumeLink){
 if((Test-Path -LiteralPath $taskSource) -or -not (Test-Path -LiteralPath $taskDestination) -or [IO.Directory]::GetParent($taskSource).FullName -ne $taskWorkspace -or [IO.Directory]::GetParent($taskDestination).FullName -ne $taskEvidence){throw 'Unexpected link recovery paths'}
 $taskRecord=Join-Path $taskWorkspace 'card-evidence-relocation-r1.json';$taskState=Get-Content -LiteralPath $taskRecord -Raw|ConvertFrom-Json
 if($taskState.source -ne $taskSource -or $taskState.destination -ne $taskDestination -or $taskState.status -ne 'verified-before-move'){throw 'Unexpected recovery record'}
 foreach($taskFile in $taskState.files){$taskMoved=Join-Path $taskDestination $taskFile.relative;if((Get-Item -LiteralPath $taskMoved).Length -ne $taskFile.bytes -or (Get-FileHash -LiteralPath $taskMoved -Algorithm SHA256).Hash -ne $taskFile.sha256){throw 'Moved file mismatch'}}
 New-Item -ItemType Junction -Path $taskSource -Target $taskDestination | Out-Null
 $taskState.status='moved-byte-identical-original-path-linked';$taskState|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $taskRecord -Encoding utf8
 [PSCustomObject]@{files=$taskState.files.Count;status=$taskState.status}|ConvertTo-Json -Compress
 exit
}
if((Resolve-Path -LiteralPath $taskSource).Path -ne $taskSource -or [IO.Directory]::GetParent($taskSource).FullName -ne $taskWorkspace){throw 'Unexpected source'}
if([IO.Directory]::GetParent($taskDestination).FullName -ne $taskEvidence -or (Test-Path -LiteralPath $taskDestination)){throw 'Unexpected destination'}
if((Get-Item -LiteralPath $taskSource).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refuse source reparse point'}
$taskRun=Get-Content -LiteralPath (Join-Path $taskSource 'report.json') -Raw | ConvertFrom-Json
if(-not $taskRun.complete -or -not $taskRun.profileClosed){throw 'Only completed closed runs can relocate'}
$taskRecord=Join-Path $taskWorkspace 'card-evidence-relocation-r1.json'
if(Test-Path -LiteralPath $taskRecord){throw 'Preserve existing relocation record'}
New-Item -ItemType Directory -Path $taskEvidence -Force | Out-Null
$taskFiles=@(Get-ChildItem -LiteralPath $taskSource -File -Recurse | ForEach-Object {[PSCustomObject]@{relative=[IO.Path]::GetRelativePath($taskSource,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}})
$taskState=[PSCustomObject]@{source=$taskSource;destination=$taskDestination;files=$taskFiles;status='verified-before-move'}
$taskState | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskRecord -Encoding utf8
Move-Item -LiteralPath $taskSource -Destination $taskDestination
foreach($taskFile in $taskFiles){$taskMoved=Join-Path $taskDestination $taskFile.relative;if((Get-Item -LiteralPath $taskMoved).Length -ne $taskFile.bytes -or (Get-FileHash -LiteralPath $taskMoved -Algorithm SHA256).Hash -ne $taskFile.sha256){throw 'Moved file mismatch'}}
New-Item -ItemType Junction -Path $taskSource -Target $taskDestination | Out-Null
$taskState.status='moved-byte-identical-original-path-linked';$taskState | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskRecord -Encoding utf8
[PSCustomObject]@{files=$taskFiles.Count;bytes=($taskFiles|Measure-Object bytes -Sum).Sum;source=$taskSource;destination=$taskDestination;status=$taskState.status}|ConvertTo-Json -Compress

