# Download only requested original assets into this independent demonstration's cache.
# Uses the project's audited CASCLib and pinned Blizzard build; does not install production assets.
param([string]$RequestFile='.cache/hero-combat-lab/missile-source-requests.json')
$ErrorActionPreference='Stop'
$taskProjectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskCacheRoot=Join-Path $taskProjectRoot '.cache/hero-combat-lab/original-assets'
$taskLock=Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'sc2-casc-lock.json') | ConvertFrom-Json
$taskRequests=Get-Content -Raw -LiteralPath (Join-Path $taskProjectRoot $RequestFile) | ConvertFrom-Json
$null=[IO.Directory]::CreateDirectory($taskCacheRoot)
$taskManifestFile=Join-Path $taskCacheRoot 'sources.json'
$taskPrevious=@();if(Test-Path -LiteralPath $taskManifestFile){$taskPrevious=@(Get-Content -Raw -LiteralPath $taskManifestFile | ConvertFrom-Json)}
$taskPending=@($taskRequests | Where-Object {
 if($_.name -notmatch '^[a-z0-9_]+\.(m3|dds)$' -or $_.sourcePath -notmatch '^mods/(liberty|core)\.sc2mod/base\.sc2assets/Assets/(Effects/Terran/|Textures/)'){throw 'Unapproved asset path'}
 $taskDestination=[IO.Path]::GetFullPath((Join-Path $taskCacheRoot $_.name))
 if(-not $taskDestination.StartsWith($taskCacheRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Cache target escaped'}
 $taskRecord=$taskPrevious | Where-Object sourcePath -eq $_.sourcePath | Select-Object -First 1
 -not ($taskRecord -and (Test-Path -LiteralPath $taskDestination) -and (Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256).Hash.ToLowerInvariant() -eq $taskRecord.sha256)
})
if($taskPending.Count){
 $taskPatchHash=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'patch-casc-source.py')).Hash.Substring(0,12)
 $taskDll=Join-Path $taskProjectRoot ('.cache/casclib-'+$taskLock.cascRevision+'/CascLib-'+$taskPatchHash+'.dll')
 Add-Type -LiteralPath $taskDll
 [CASCLib.CDNCache]::CachePath=Join-Path $taskProjectRoot '.cache/casc-data'
 [CASCLib.CDNCache]::CacheData=$false
 [CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
 [CASCLib.CASCConfig]::BuildConfigKeyOverride=$taskLock.buildConfig
 [CASCLib.CASCConfig]::CDNConfigKeyOverride=$taskLock.cdnConfig
 [CASCLib.CASCConfig]::SelectionPattern='^(?:'+(($taskPending | ForEach-Object {[regex]::Escape($_.sourcePath)}) -join '|')+')$'
 $taskConfig=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
 $taskConfig.ActiveBuild=$taskConfig.Builds.Count-1
 if($taskConfig.BuildName -ne $taskLock.buildName){throw 'Unexpected original asset build'}
 $taskHandler=[CASCLib.CASCHandler]::OpenStorage($taskConfig,$null)
 $taskHandler.Root.LoadListFile('',$null)
 $null=$taskHandler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
 foreach($taskRequest in $taskPending){
  $taskStream=$taskHandler.OpenFile($taskRequest.sourcePath)
  if(-not $taskStream){throw ('Missing original '+$taskRequest.sourcePath)}
  try {
   if($taskStream.Length -le 24 -or $taskStream.Length -gt 20MB){throw 'Invalid asset size'}
   $taskMemory=[IO.MemoryStream]::new();$taskStream.CopyTo($taskMemory);$taskBytes=$taskMemory.ToArray();$taskMemory.Dispose()
   $taskMagic=[Text.Encoding]::ASCII.GetString($taskBytes,0,4)
   if($taskRequest.name.EndsWith('.m3') -and $taskMagic -notin @('43DM','33DM')){throw 'Invalid original model'}
   if($taskRequest.name.EndsWith('.dds') -and $taskMagic -ne 'DDS '){throw 'Invalid original texture'}
   $taskDestination=Join-Path $taskCacheRoot $taskRequest.name
   [IO.File]::WriteAllBytes($taskDestination,$taskBytes)
   $taskDigest=(Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256).Hash.ToLowerInvariant()
   $taskPrevious=@($taskPrevious | Where-Object name -ne $taskRequest.name)
   $taskPrevious+=@{name=$taskRequest.name;file=$taskDestination;sourcePath=$taskRequest.sourcePath;source='https://'+$taskLock.host+'/'+$taskLock.cdnPath;buildConfig=$taskLock.buildConfig;sourceBuild=$taskLock.version;bytes=$taskBytes.Length;sha256=$taskDigest}
   $taskPrevious | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $taskManifestFile -Encoding utf8
   Write-Output ('Fetched original '+$taskRequest.name+' / '+$taskBytes.Length+' bytes')
  }finally{$taskStream.Dispose()}
 }
}
Write-Output ('Verified requested original assets: '+$taskRequests.Count)
