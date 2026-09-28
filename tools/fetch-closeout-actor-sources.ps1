$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$lock=Get-Content tools/sc2-casc-lock.json -Raw|ConvertFrom-Json
$patchHash=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path (Get-Location) ('.cache/casclib-'+$lock.cascRevision+'/CascLib-'+$patchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=Join-Path (Get-Location) '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)gamedata[\\/](?:actor|model|weapon|unit|effect)data\.xml$'
$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Asset build changed'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$paths=@([CASCLib.CASCFile]::Files.Values|ForEach-Object {$_.FullName.Replace('\','/')}|Where-Object {$_ -match '(?i)^(?:mods/(?:core|liberty|swarm|void|libertystory|swarmstory|voidstory|novastoryassets)\.sc2mod|mods/starcoop/starcoop\.sc2mod|campaigns/(?:liberty|swarm|void)\.sc2campaign)/base\.sc2data/gamedata/(?:actor|model|weapon|unit|effect)data\.xml$'}|Sort-Object -Unique)
$records=@()
$missing=@()
$previous=@();if(Test-Path tools/closeout-actor-dependencies.json){$previous=@(Get-Content tools/closeout-actor-dependencies.json -Raw|ConvertFrom-Json)}
foreach($path in $paths){
 try{
 $file=Join-Path 'assets/private/actor-source' $path
 $prior=$previous|Where-Object sourcePath -eq $path|Select-Object -First 1
 if($prior -and (Test-Path -LiteralPath $file) -and (Get-FileHash -LiteralPath $file).Hash.ToLowerInvariant() -eq $prior.sha256){$bytes=[IO.File]::ReadAllBytes((Join-Path (Get-Location) $file))}else{
  $stream=$handler.OpenFile($path)
  try{$memory=[IO.MemoryStream]::new();$stream.CopyTo($memory);$bytes=$memory.ToArray();$memory.Dispose()}finally{$stream.Dispose()}
  $null=[IO.Directory]::CreateDirectory((Split-Path -Parent (Join-Path (Get-Location) $file)))
  [IO.File]::WriteAllBytes((Join-Path (Get-Location) $file),$bytes)
 }
 $xml=[xml][Text.Encoding]::UTF8.GetString($bytes)
 if($xml.DocumentElement.Name -ne 'Catalog'){throw ('Unexpected XML '+$path)}
 $records+=@{sourcePath=$path;installFile=$file.Replace('\','/');bytes=$bytes.Length;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant();build=$lock.buildName}
 Write-Output ('Verified '+$path+' '+$bytes.Length)
 }catch{$missing+=@{sourcePath=$path;error=$_.Exception.Message};Write-Warning ($path+': '+$_.Exception.Message)}
}
$records|ConvertTo-Json -Depth 5|Set-Content tools/closeout-actor-dependencies.json -Encoding utf8
ConvertTo-Json -InputObject @($missing) -Depth 5|Set-Content reports/local/closeout-actor-missing.json -Encoding utf8
Write-Output ('Verified XML files: '+$records.Count)
