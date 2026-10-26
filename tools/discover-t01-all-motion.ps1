$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskLock=Get-Content -LiteralPath tools/sc2-casc-lock.json -Raw|ConvertFrom-Json
$taskPatch=(Get-FileHash -LiteralPath tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path (Get-Location) ('.cache/casclib-'+$taskLock.cascRevision+'/CascLib-'+$taskPatch+'.dll'))
[CASCLib.CDNCache]::CachePath=Join-Path (Get-Location) '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$taskLock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$taskLock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)(?:base\.sc2(?:assets|data)[\\/].*\.(?:wav|ogg|mp3)$|(?:move|walk|foot|herd|tread|march|engine|motor|roll|drive|servo|step|armor)[^\\/]*\.(?:wav|ogg|mp3)$|gamedata[\\/](?:actor|model|sound|soundtrack|terrain|terraintexture|footprint|mover|herd|herdnode)data\.xml$)'
$taskConfig=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$taskConfig.ActiveBuild=$taskConfig.Builds.Count-1
if($taskConfig.BuildName -ne $taskLock.buildName){throw 'Pinned build changed'}
$taskHandler=[CASCLib.CASCHandler]::OpenStorage($taskConfig,$null)
$taskHandler.Root.LoadListFile('',$null)
$null=$taskHandler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$taskPaths=@([CASCLib.CASCFile]::Files.Values|ForEach-Object {$_.FullName.Replace('\','/')}|Sort-Object -Unique)
$taskOut=Join-Path (Get-Location) '.cache/t01-all-motion'
$null=[IO.Directory]::CreateDirectory($taskOut)
ConvertTo-Json -InputObject $taskPaths -Depth 3|Set-Content -LiteralPath (Join-Path $taskOut 'casc-paths.json') -Encoding utf8
Write-Output ('Full non-localized audio and relevant data index: '+$taskPaths.Count)
# Supplement previously extracted data with every official mod/campaign layer.
$taskXml=@($taskPaths|Where-Object {$_ -match '(?i)^(?:mods|campaigns)/.*gamedata/(?:actor|model|sound|soundtrack|terrain|terraintexture|footprint|mover|herd|herdnode)data\.xml$'})
$taskRecords=@()
$taskFailures=@()
$taskPriorFailures=@();if(Test-Path -LiteralPath (Join-Path $taskOut 'unavailable.json')){$taskPriorFailures=@(Get-Content -LiteralPath (Join-Path $taskOut 'unavailable.json') -Raw|ConvertFrom-Json)}
foreach($taskPath in $taskXml){
 $taskExisting=Join-Path 'assets/private/actor-source' $taskPath
 if(Test-Path -LiteralPath $taskExisting){continue}
 $taskPriorFailure=$taskPriorFailures|Where-Object source -eq $taskPath|Select-Object -First 1
 if($taskPriorFailure){$taskFailures+= $taskPriorFailure;continue}
 $taskFile=Join-Path $taskOut ('data/'+$taskPath)
 try {
 if(!(Test-Path -LiteralPath $taskFile)){
  $taskStream=$taskHandler.OpenFile($taskPath)
  try{$taskMemory=[IO.MemoryStream]::new();$taskStream.CopyTo($taskMemory);$taskBytes=$taskMemory.ToArray();$taskMemory.Dispose()}finally{$taskStream.Dispose()}
  $null=[IO.Directory]::CreateDirectory((Split-Path -Parent $taskFile))
  [IO.File]::WriteAllBytes($taskFile,$taskBytes)
 }
 $taskRecords+=@{source=$taskPath;bytes=(Get-Item -LiteralPath $taskFile).Length;sha256=(Get-FileHash -LiteralPath $taskFile).Hash.ToLowerInvariant()}
 }catch{$taskFailures+=@{source=$taskPath;reason=$_.Exception.Message};Write-Output ('Unavailable data layer: '+$taskPath)}
}
ConvertTo-Json -InputObject $taskRecords -Depth 4|Set-Content -LiteralPath (Join-Path $taskOut 'supplement.json') -Encoding utf8
ConvertTo-Json -InputObject $taskFailures -Depth 4|Set-Content -LiteralPath (Join-Path $taskOut 'unavailable.json') -Encoding utf8
Write-Output ('Supplemental original data files: '+$taskRecords.Count)
