$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$taskRows=(Get-Content -LiteralPath '.cache/t01-all-motion/shortlist.json' -Raw|ConvertFrom-Json).requests
$taskLock=Get-Content -LiteralPath tools/sc2-casc-lock.json -Raw|ConvertFrom-Json
$taskPatch=(Get-FileHash -LiteralPath tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path $taskRoot ('.cache/casclib-'+$taskLock.cascRevision+'/CascLib-'+$taskPatch+'.dll'))
[CASCLib.CDNCache]::CachePath=Join-Path $taskRoot '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$taskLock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$taskLock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)(?:'+(($taskRows|ForEach-Object {[regex]::Escape($_.source).Replace('/','[\\/]')}) -join '|')+')$'
$taskConfig=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$taskConfig.ActiveBuild=$taskConfig.Builds.Count-1
if($taskConfig.BuildName -ne $taskLock.buildName){throw 'Pinned source version changed'}
$taskHandler=[CASCLib.CASCHandler]::OpenStorage($taskConfig,$null)
$taskHandler.Root.LoadListFile('',$null)
$null=$taskHandler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$taskRecords=@()
foreach($taskRow in $taskRows){
 if($taskRow.source.Contains('..') -or $taskRow.source.Contains(':') -or $taskRow.source -notmatch '^(mods|campaigns)/.*\.wav$'){throw 'Unexpected original path'}
 $taskFile=Join-Path $taskRoot ('assets/private/movement-research/'+$taskRow.source)
 if(!(Test-Path -LiteralPath $taskFile)){
  $taskStream=$taskHandler.OpenFile($taskRow.source)
  try{$taskMemory=[IO.MemoryStream]::new();$taskStream.CopyTo($taskMemory);$taskBytes=$taskMemory.ToArray();$taskMemory.Dispose()}finally{$taskStream.Dispose()}
  if([Text.Encoding]::ASCII.GetString($taskBytes,0,4) -ne 'RIFF'){throw 'Unexpected source audio container'}
  $null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($taskFile))
  [IO.File]::WriteAllBytes($taskFile,$taskBytes)
 }
 $taskRecords+=@{source=$taskRow.source;file=$taskFile;bytes=(Get-Item -LiteralPath $taskFile).Length;sha256=(Get-FileHash -LiteralPath $taskFile).Hash.ToLowerInvariant();build=$taskLock.buildName}
}
ConvertTo-Json -InputObject $taskRecords -Depth 5|Set-Content -LiteralPath '.cache/t01-all-motion/downloads.json' -Encoding utf8
Write-Output ('Retrieved original shortlist files: '+$taskRecords.Count)
