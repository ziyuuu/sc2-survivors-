param([string]$Requests='',[switch]$Merge)
$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$taskLock=Get-Content tools/sc2-casc-lock.json -Raw | ConvertFrom-Json
$taskPatch=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path $taskRoot ('.cache/casclib-'+$taskLock.cascRevision+'/CascLib-'+$taskPatch+'.dll'))
[CASCLib.CDNCache]::CachePath=Join-Path $taskRoot '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$taskLock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$taskLock.cdnConfig
if($Requests){
 $taskRows=@(Get-Content -LiteralPath $Requests -Raw | ConvertFrom-Json)
 foreach($taskRow in $taskRows){if($taskRow.path -notmatch '^(Assets|LocalizedData)/Sounds/[^:]+\.(wav|ogg)$' -or $taskRow.path.Contains('..')){throw 'Invalid audio request'}}
 [CASCLib.CASCConfig]::SelectionPattern='(?i)(?:'+(($taskRows | ForEach-Object {[regex]::Escape($_.path).Replace('/','[\\/]')}) -join '|')+')$'
}else{[CASCLib.CASCConfig]::SelectionPattern='(?i)gamedata[\\/]sounddata\.xml$'}
$taskConfig=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$taskConfig.ActiveBuild=$taskConfig.Builds.Count-1
if($taskConfig.BuildName -ne $taskLock.buildName){throw 'Pinned audio build changed'}
$taskHandler=[CASCLib.CASCHandler]::OpenStorage($taskConfig,$null)
$taskHandler.Root.LoadListFile('',$null)
$null=$taskHandler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$taskPaths=@([CASCLib.CASCFile]::Files.Values | ForEach-Object {$_.FullName.Replace('\','/')} | Sort-Object -Unique)
$taskOutput='tools/t01-audio-source-dependencies.json'
if(-not $Requests){
 $taskRows=@($taskPaths | Where-Object {$_ -match '(?i)^(?:mods/(?:core|liberty|swarm|void|libertystory|swarmstory|voidstory|novastoryassets|libertymulti|swarmmulti|voidmulti)\.sc2mod|mods/starcoop/starcoop\.sc2mod|campaigns/(?:liberty|swarm|void)\.sc2campaign)/base\.sc2data/gamedata/sounddata\.xml$'} | ForEach-Object {[pscustomobject]@{path=$_}})
}else{$taskOutput='tools/t01-audio-dependencies.json'}
$taskPrevious=@();if(Test-Path -LiteralPath $taskOutput){$taskPrevious=@(Get-Content -LiteralPath $taskOutput -Raw | ConvertFrom-Json)}
$taskRecords=[Collections.Generic.List[object]]::new()
if($Merge){foreach($taskRecord in $taskPrevious){$taskRecords.Add($taskRecord)}}
$taskMissing=[Collections.Generic.List[object]]::new()
foreach($taskRow in $taskRows){
 $taskPath=$taskRow.path
 if($Requests){
  $taskCandidates=@($taskPaths | Where-Object { $_.EndsWith('/'+$taskPath,[StringComparison]::OrdinalIgnoreCase) })
  if(-not $taskCandidates.Count){$taskMissing.Add($taskRow);continue}
  # Resolve the source's owning module, and use the game's Chinese voice locale
  # with English only when that exact original Chinese file is absent.
  $taskPreferred=$taskRow.module -replace '/base.sc2data$',''
  $taskCandidates=@($taskCandidates | Where-Object {$_ -match '/(base|zhcn|enus)\.sc2assets/'} | Sort-Object -Property @{Expression={
   $score=0;if($_ -match '/zhcn\.sc2assets/'){$score+=1000}elseif($_ -match '/enus\.sc2assets/'){$score+=500}
   if($_.StartsWith($taskPreferred+'/',[StringComparison]::OrdinalIgnoreCase)){$score+=100}
   if($_ -match '^mods/liberty\.sc2mod/'){$score+=10}
   -$score
  }},@{Expression={$_}})
  if(-not $taskCandidates.Count){throw ('No supported original locale: '+$taskPath)}
  $taskPath=$taskCandidates[0]
 }
 $taskFile=('assets/private/'+$(if($Requests){'audio-source/'}else{'actor-source/'})+$taskPath)
 $taskDestination=[IO.Path]::GetFullPath((Join-Path $taskRoot $taskFile))
 if(-not $taskDestination.StartsWith($taskRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Audio destination escaped workspace'}
 $taskPrior=$taskPrevious | Where-Object sourcePath -eq $taskPath | Select-Object -First 1
 if($taskPrior -and (Test-Path -LiteralPath $taskDestination) -and (Get-FileHash -LiteralPath $taskDestination).Hash.ToLowerInvariant() -eq $taskPrior.sha256){$taskBytes=[IO.File]::ReadAllBytes($taskDestination)}else{
  $taskStream=$taskHandler.OpenFile($taskPath)
  if(-not $taskStream){throw ('Missing original '+$taskPath)}
  try{if($taskStream.Length -lt 12 -or $taskStream.Length -gt 20MB){throw 'Unexpected source size'};$taskMemory=[IO.MemoryStream]::new();$taskStream.CopyTo($taskMemory);$taskBytes=$taskMemory.ToArray();$taskMemory.Dispose()}finally{$taskStream.Dispose()}
  $null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($taskDestination))
  [IO.File]::WriteAllBytes($taskDestination,$taskBytes)
 }
 if(-not $Requests){$taskXml=[xml][Text.Encoding]::UTF8.GetString($taskBytes);if($taskXml.DocumentElement.Name -ne 'Catalog'){throw 'Invalid sound catalog'}}else{
  $taskMagic=[Text.Encoding]::ASCII.GetString($taskBytes,0,4)
  if($taskMagic -notin @('RIFF','OggS')){throw ('Invalid original audio '+$taskPath)}
 }
 if(-not $Merge -or -not($taskRecords | Where-Object sourcePath -eq $taskPath)){$taskRecords.Add(@{sourcePath=$taskPath;installFile=$taskFile;bytes=$taskBytes.Length;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskBytes)).ToLowerInvariant();build=$taskLock.buildName})}
 $taskRecords | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskOutput -Encoding utf8
 Write-Output ('Verified '+$taskPath+' '+$taskBytes.Length)
}
Write-Output ('Verified original audio sources: '+$taskRecords.Count)
if($Requests){$taskMissing.ToArray() | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath '.cache/t01-audio/missing-files.json' -Encoding utf8;if($taskMissing.Count){Write-Output ('Missing original files: '+$taskMissing.Count);exit 1}}
