$ErrorActionPreference='Stop'
$tutorialWorkspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tutorialWork=[IO.Path]::GetFullPath((Join-Path $tutorialWorkspace 'reports/local/tutorial-polish-20261109'))
$tutorialDist=[IO.Path]::GetFullPath((Join-Path $tutorialWorkspace 'dist/tutorial-1.1-polish-20261109'))
$tutorialManifest=Get-Content -LiteralPath (Join-Path $tutorialWork 'review/recordings/manifest.json') -Raw | ConvertFrom-Json
if($tutorialManifest.Count -ne 3){throw 'Three final recordings required before retirement'}
foreach($tutorialRow in $tutorialManifest){
 $tutorialMovie=Join-Path $tutorialWorkspace $tutorialRow.file
 if((Get-FileHash -LiteralPath $tutorialMovie -Algorithm SHA256).Hash.ToLowerInvariant() -ne $tutorialRow.sha256){throw 'Recording hash differs'}
}
$tutorialTargets=@((Join-Path $tutorialDist 'web'),(Join-Path $tutorialWork 'browser/build'))
foreach($tutorialRace in @('terran','zerg','protoss')){foreach($tutorialName in @('screen.webm','game-audio.webm')){$tutorialTargets+=Join-Path $tutorialWork "short-recordings/$tutorialRace/$tutorialName"}}
$tutorialRetired=@()
foreach($tutorialTarget in $tutorialTargets){
 $tutorialResolved=[IO.Path]::GetFullPath($tutorialTarget)
 if(-not ($tutorialResolved.StartsWith($tutorialWork+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $tutorialResolved.StartsWith($tutorialDist+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase))){throw "Outside this task: $tutorialResolved"}
 if(-not (Test-Path -LiteralPath $tutorialResolved)){continue}
 $tutorialItem=Get-Item -LiteralPath $tutorialResolved -Force
 if($tutorialItem.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refusing reparse point'}
 if($tutorialItem.PSIsContainer){
  $tutorialChildren=@(Get-ChildItem -LiteralPath $tutorialResolved -Recurse -Force)
  if($tutorialChildren | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }){throw 'Refusing nested reparse point'}
  $tutorialBytes=($tutorialChildren | Where-Object {-not $_.PSIsContainer} | Measure-Object Length -Sum).Sum
 }else{$tutorialBytes=$tutorialItem.Length}
 $tutorialRetired+=[pscustomobject]@{path=$tutorialResolved;logicalBytes=$tutorialBytes}
 Remove-Item -LiteralPath $tutorialResolved -Recurse -Force
}
[pscustomobject]@{date='2026-11-09';retired=$tutorialRetired;kept='Current packed candidate and diagnostic entry, review MP4/posters, current QA, formal narration WAV/MP3 and plan; retained 1.0/local.3/shared dist/web untouched';physicalFreedBytes='Not measured; logical sizes may include hardlinks'} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $tutorialWork 'retention.json') -Encoding utf8
