#requires -Version 7.4
# Download only original dependencies resolved by ModelData; record hashes for repeatable verification.
param([switch]$VerifyOnly)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
$lock=Get-Content tools/sc2-casc-lock.json -Raw | ConvertFrom-Json
$models=@(Get-Content tools/expansion-models.json -Raw | ConvertFrom-Json)+@(Get-Content tools/expansion-effects.json -Raw | ConvertFrom-Json)
function LocalPath([string]$relative){$p=[IO.Path]::GetFullPath((Join-Path $root $relative));if(-not $p.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Path outside project'};return $p}
$records=[Collections.Generic.List[object]]::new();$missing=[Collections.Generic.List[object]]::new()
$previous=@();if(Test-Path tools/expansion-dependencies.json){$previous=@(Get-Content tools/expansion-dependencies.json -Raw | ConvertFrom-Json)}
$source=LocalPath ('.cache/casclib-'+$lock.cascRevision)
$patchHash=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path $source ('CascLib-'+$patchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=LocalPath '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)assets[\\/](?:units[\\/].*\.m3a?|textures[\\/].*\.dds|effects[\\/].*\.m3)$'
$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Asset build changed'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$modules=@('mods/void.sc2mod','mods/swarm.sc2mod','mods/liberty.sc2mod','mods/core.sc2mod','mods/starcoop/starcoop.sc2mod','mods/novastoryassets.sc2mod','mods/libertystory.sc2mod','mods/swarmstory.sc2mod','mods/voidstory.sc2mod','mods/war3.sc2mod')
$catalogPaths=@([CASCLib.CASCFile]::Files.Values | ForEach-Object { $_.FullName.Replace('\','/') })
function FetchOriginal([string]$id,[string]$assetPath,[string]$file){
 $destination=LocalPath $file
 $old=$previous | Where-Object installFile -eq $file | Select-Object -First 1
 if($old -and (Test-Path -LiteralPath $destination) -and (Get-FileHash -LiteralPath $destination).Hash.ToLowerInvariant() -eq $old.sha256){$records.Add($old);return ,([IO.File]::ReadAllBytes($destination))}
 if($VerifyOnly){$missing.Add(@{id=$id;assetPath=$assetPath;installFile=$file;reason='Missing pinned bytes'});return $null}
 $candidates=@($modules | ForEach-Object { $_+'/base.sc2assets/'+$assetPath })+@($catalogPaths | Where-Object { $_.EndsWith('/'+$assetPath,[StringComparison]::OrdinalIgnoreCase) })
 foreach($path in ($candidates | Select-Object -Unique)){
  if(-not $handler.FileExists($path)){continue}
  try {
   $stream=$handler.OpenFile($path);if(-not $stream){continue}
   try {if($stream.Length -gt 32MB){throw 'Unexpected file size'};$memory=[IO.MemoryStream]::new();$stream.CopyTo($memory);$bytes=$memory.ToArray();$memory.Dispose()}finally{$stream.Dispose()}
   $magic=[Text.Encoding]::ASCII.GetString($bytes,0,4)
   if($file -match '\.dds$'){if($magic -ne 'DDS ' -or $bytes.Length -lt 128){throw 'Invalid DDS'}}else{
    if($magic -notin @('43DM','33DM') -or $bytes.Length -lt 24){throw 'Invalid M3'}
    $offset=[BitConverter]::ToUInt32($bytes,4);$count=[BitConverter]::ToUInt32($bytes,8)
    if($count -eq 0 -or $offset+$count*16 -gt $bytes.Length){throw 'Invalid M3 section table'}
   }
   $null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination));[IO.File]::WriteAllBytes($destination,$bytes)
   $hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
   $records.Add(@{id=$id;sourcePath=$path;installFile=$file;cachedFile=$file;bytes=$bytes.Length;sha256=$hash;verifiedCascBuild=$true;version=$lock.version})
   Write-Output ('OK '+$id+' '+$bytes.Length) | Out-Host
   return ,$bytes
  }catch{Write-Warning ($path+': '+$_.Exception.Message)}
 }
 $missing.Add(@{id=$id;assetPath=$assetPath;installFile=$file;reason='Not available in pinned public CASC roots'});return $null
}
$textures=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach($model in $models){
 $bytes=FetchOriginal $model.id $model.assetPath ('assets/private/m3/'+$model.name+'.m3')
 if($bytes){foreach($match in [regex]::Matches([Text.Encoding]::ASCII.GetString($bytes),'(?i)(?:[a-z0-9_ .-]+)\.dds')){$null=$textures.Add($match.Value.Trim().ToLowerInvariant())}}
}
foreach($name in @('btn-unit-terran-marauder','btn-unit-zerg-hydralisk','btn-unit-terran-marineraynorhev','btn-unit-terran-marinetychus','btn-unit-terran-nova','btn-ability-terran-penetratorround','btn-ability-terran-punishergrenade-color','btn-ability-terran-snipe-color')){$null=$textures.Add($name+'.dds')}
foreach($name in $textures){$null=FetchOriginal ('texture.'+$name) ('Assets/Textures/'+$name) ('assets/private/dds/'+$name)}
ConvertTo-Json -InputObject @($records.ToArray()) -Depth 6 | Set-Content -LiteralPath (LocalPath 'tools/expansion-dependencies.json') -Encoding utf8
ConvertTo-Json -InputObject @($missing.ToArray()) -Depth 6 | Set-Content -LiteralPath (LocalPath 'reports/local/expansion-missing.json') -Encoding utf8
Write-Output ('Verified '+$records.Count+' files; missing '+$missing.Count)
