#requires -Version 7.4
param([switch]$CatalogsOnly,[switch]$AttachmentCatalogs,[string]$Evidence='reports/local/combat-effects-20261012/source-fetch-r1')
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
function LocalPath([string]$relative){$p=[IO.Path]::GetFullPath((Join-Path $root $relative));if(-not $p.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Path outside project'};return $p}
function Hash([byte[]]$bytes){return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()}
$out=LocalPath $Evidence
if(Test-Path -LiteralPath $out){throw 'Choose a new evidence directory'}
$null=[IO.Directory]::CreateDirectory($out)
$lock=Get-Content tools/sc2-casc-lock.json -Raw|ConvertFrom-Json
$patchHash=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (LocalPath ('.cache/casclib-'+$lock.cascRevision+'/CascLib-'+$patchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=LocalPath '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern=if($CatalogsOnly -or $AttachmentCatalogs){'(?i)gamedata[\\/](?:actor|model|weapon|effect|attachmethod)data\.xml$'}else{'(?i)assets[\\/].*\.(?:m3|m3a|dds)$'}
$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Asset build changed'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$catalogPaths=@([CASCLib.CASCFile]::Files.Values|ForEach-Object {$_.FullName.Replace('\','/')})
$records=[Collections.Generic.List[object]]::new();$missing=[Collections.Generic.List[object]]::new()
$priorByFile=@{}
foreach($manifest in @(Get-ChildItem -LiteralPath tools -Filter '*dependencies.json')+@(Get-Item tools/sc2-casc-targets.json)){
 foreach($r in @(Get-Content -LiteralPath $manifest.FullName -Raw|ConvertFrom-Json)){if($r.installFile -and $r.sha256){foreach($key in @($r.installFile,$r.requestedFile)|Where-Object {$_}|Select-Object -Unique){$key=$key.Replace('\','/').ToLowerInvariant();$priorByFile[$key]=@($priorByFile[$key])+@($r)}}}
}
function ReadCasc([string]$sourcePath){
 $stream=$handler.OpenFile($sourcePath);if(-not $stream){throw 'Missing stream'}
 try{if($stream.Length -gt 64MB){throw 'Source exceeds extraction bound'};$memory=[IO.MemoryStream]::new();$stream.CopyTo($memory);return ,$memory.ToArray()}finally{if($memory){$memory.Dispose()};$stream.Dispose()}
}
function SaveOriginal([string]$id,[string]$sourcePath,[string]$file,[byte[]]$bytes){
 $requestedFile=$file;$destination=LocalPath $file;$digest=Hash $bytes
 if((Test-Path -LiteralPath $destination) -and (Get-FileHash -LiteralPath $destination).Hash.ToLowerInvariant() -ne $digest){
  if($CatalogsOnly -or $AttachmentCatalogs){throw ('Refusing to overwrite original catalog: '+$file)}
  $file='assets/private/combat-effects/'+$(if($file -match '\.dds$'){'dds/'}else{'m3/'})+[IO.Path]::GetFileName($file);$destination=LocalPath $file
 }
 if(Test-Path -LiteralPath $destination){if((Get-FileHash -LiteralPath $destination).Hash.ToLowerInvariant() -ne $digest){throw ('Refusing to overwrite original bytes: '+$file)}}else{$null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination));[IO.File]::WriteAllBytes($destination,$bytes)}
 $r=@{id=$id;sourcePath=$sourcePath;requestedFile=$requestedFile;installFile=$file.Replace('\','/');bytes=$bytes.Length;sha256=$digest;version=$lock.version;build=$lock.buildName;verifiedCascBuild=$true};$records.Add($r)
 ($r|ConvertTo-Json -Depth 8 -Compress)|Add-Content -LiteralPath (Join-Path $out 'progress.ndjson') -Encoding utf8
 Write-Host ('Verified '+$file+' '+$bytes.Length)
}
if($AttachmentCatalogs){
 foreach($layer in @('core','liberty','swarm','void','libertymulti','swarmmulti','voidmulti','balancemulti')){
  $sourcePath='mods/'+$layer+'.sc2mod/base.sc2data/GameData/AttachMethodData.xml'
  if(-not $handler.FileExists($sourcePath)){continue}
  $bytes=ReadCasc $sourcePath;SaveOriginal ($layer+'.AttachMethod') $sourcePath ('assets/private/actor-source/'+$sourcePath) $bytes
 }
 $manifest='tools/combat-effects-attachments-dependencies.json'
}elseif($CatalogsOnly){
 foreach($layer in @('libertymulti','swarmmulti','voidmulti','balancemulti')){foreach($kind in @('Actor','Model','Weapon','Effect')){
  $sourcePath='mods/'+$layer+'.sc2mod/base.sc2data/GameData/'+$kind+'Data.xml'
  $file='assets/private/actor-source/'+$sourcePath
  try{$bytes=ReadCasc $sourcePath;$xml=[xml][Text.Encoding]::UTF8.GetString($bytes);if($xml.DocumentElement.Name -ne 'Catalog'){throw 'Invalid Catalog'};SaveOriginal ($layer+'.'+$kind) $sourcePath $file $bytes}catch{$missing.Add(@{sourcePath=$sourcePath;error=$_.Exception.Message});Write-Warning ($sourcePath+': '+$_.Exception.Message)}
 }}
 $manifest='tools/combat-effects-catalog-dependencies.json'
}else{
 $modules=@('mods/void.sc2mod','mods/swarm.sc2mod','mods/liberty.sc2mod','mods/core.sc2mod','mods/starcoop/starcoop.sc2mod','mods/novastoryassets.sc2mod','mods/libertystory.sc2mod','mods/swarmstory.sc2mod','mods/voidstory.sc2mod','mods/war3.sc2mod')
 $seen=@{}
 function FetchOriginal([string]$id,[string]$assetPath,[string]$file){
  $key=$file.ToLowerInvariant();if($seen.ContainsKey($key)){return ,$seen[$key]}
  $destination=LocalPath $file;$old=$priorByFile[$key]
  $verified=@($old|Where-Object {$_.requestedFile -and $_.version -eq $lock.version -and $_.verifiedCascBuild -and $_.sourcePath.Replace('\','/').EndsWith('/'+$assetPath.Replace('\','/'),[StringComparison]::OrdinalIgnoreCase)})|Select-Object -First 1
  if($verified -and (Test-Path -LiteralPath (LocalPath $verified.installFile))){$bytes=[IO.File]::ReadAllBytes((LocalPath $verified.installFile));if((Hash $bytes) -ne $verified.sha256){throw ('Changed verified combat source '+$verified.installFile)};$records.Add($verified);$seen[$key]=$bytes;return ,$bytes}
  if($old -and (Test-Path -LiteralPath $destination)){
   $bytes=[IO.File]::ReadAllBytes($destination);$digest=Hash $bytes;$match=@($old|Where-Object {$_.sha256 -eq $digest -and $_.sourcePath -and $_.sourcePath.Replace('\','/').EndsWith('/'+$assetPath.Replace('\','/'),[StringComparison]::OrdinalIgnoreCase)})|Select-Object -First 1
   if(-not @($old|Where-Object sha256 -eq $digest).Count){throw ('Changed protected original: '+$file)}
   if($match){$records.Add($match);$seen[$key]=$bytes;return ,$bytes}
  }
  $candidates=@($modules|ForEach-Object {$_+'/base.sc2assets/'+$assetPath})+@($catalogPaths|Where-Object {$_.EndsWith('/'+$assetPath,[StringComparison]::OrdinalIgnoreCase)})
  foreach($sourcePath in ($candidates|Select-Object -Unique)){
   if(-not $handler.FileExists($sourcePath)){continue}
   try{$bytes=ReadCasc $sourcePath;$magic=[Text.Encoding]::ASCII.GetString($bytes,0,4)
    if($file -match '\.dds$'){if($magic -ne 'DDS ' -or $bytes.Length -lt 128){throw 'Invalid DDS'}}else{if($magic -notin @('43DM','33DM') -or $bytes.Length -lt 24){throw 'Invalid M3'}}
    SaveOriginal $id $sourcePath $file $bytes;$seen[$key]=$bytes;return ,$bytes
   }catch{if($_.Exception.Message -like '*overwrite original*'){throw};Write-Warning ($sourcePath+': '+$_.Exception.Message)}
  }
  $missing.Add(@{id=$id;assetPath=$assetPath;installFile=$file;error='Unavailable in pinned public CASC roots'});return $null
 }
 $textures=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
 foreach($model in @(Get-Content tools/combat-effects-models.json -Raw|ConvertFrom-Json)){
  $bytes=FetchOriginal $model.id $model.assetPath ('assets/private/m3/'+$model.name+[IO.Path]::GetExtension($model.assetPath))
  if($bytes){foreach($match in [regex]::Matches([Text.Encoding]::ASCII.GetString($bytes),'(?i)(?:[a-z0-9_ .-]+)\.dds')){$null=$textures.Add($match.Value.Trim().ToLowerInvariant())}}
 }
 foreach($name in $textures){$null=FetchOriginal ('texture.'+$name) ('Assets/Textures/'+$name) ('assets/private/dds/'+$name)}
 $manifest='tools/combat-effects-dependencies.json'
}
ConvertTo-Json -InputObject @($records.ToArray()) -Depth 8|Set-Content -LiteralPath (Join-Path $out 'verified.json') -Encoding utf8
ConvertTo-Json -InputObject @($missing.ToArray()) -Depth 8|Set-Content -LiteralPath (Join-Path $out 'missing.json') -Encoding utf8
Copy-Item -LiteralPath (Join-Path $out 'verified.json') -Destination (LocalPath $manifest)
Write-Output ('Verified '+$records.Count+' sources; missing '+$missing.Count)
if($missing.Count){exit 2}
