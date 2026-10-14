#requires -Version 7.4
param([string]$Evidence='reports/local/mvp5-environment-samples-20261013/source-fetch-r1',[string]$Targets='')
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
function Local([string]$relative){$p=[IO.Path]::GetFullPath((Join-Path $root $relative));if(-not $p.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Outside workspace'};return $p}
$out=Local $Evidence
if(Test-Path -LiteralPath $out){throw 'Use fresh evidence directory'}
$null=[IO.Directory]::CreateDirectory($out)
$lock=Get-Content tools/sc2-casc-lock.json -Raw|ConvertFrom-Json
$patchHash=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Local ('.cache/casclib-'+$lock.cascRevision+'/CascLib-'+$patchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=Local '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
$audit=Get-Content reports/local/mvp5-environment-audit-20261013/completion.json -Raw|ConvertFrom-Json
$wanted=@($audit.uniqueMissingDds)+@('CliffNatural2_diffuse_00.dds','CliffNatural2_normal_00.dds')
if($Targets){$wanted=@(Get-Content -LiteralPath (Local $Targets) -Raw|ConvertFrom-Json)}
[CASCLib.CASCConfig]::SelectionPattern='(?i)(?:'+(($wanted|ForEach-Object{[regex]::Escape($_)})-join'|')+'|gamedata[\\/](?:water|terrain|terraintex)data\.xml)$'
$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Build lock mismatch'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$paths=@([CASCLib.CASCFile]::Files.Values|ForEach-Object{$_.FullName.Replace('\','/')})
$paths|ConvertTo-Json|Set-Content (Join-Path $out 'catalog-paths.json') -Encoding utf8
$records=[Collections.Generic.List[object]]::new();$missing=[Collections.Generic.List[object]]::new()
function Save([string]$sourcePath,[string]$relative){
 $stream=$handler.OpenFile($sourcePath);if(-not $stream){throw 'Missing stream'}
 try{if($stream.Length -gt 32MB){throw 'Source exceeds bounded extraction'};$memory=[IO.MemoryStream]::new();$stream.CopyTo($memory);$bytes=$memory.ToArray()}finally{if($memory){$memory.Dispose()};$stream.Dispose()}
 $hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
 $destination=Local $relative
 if(Test-Path -LiteralPath $destination){if((Get-FileHash -LiteralPath $destination).Hash.ToLowerInvariant() -ne $hash){throw 'Refusing to change original'}}else{$null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination));[IO.File]::WriteAllBytes($destination,$bytes)}
 $record=@{sourcePath=$sourcePath;installFile=$relative;sha256=$hash;bytes=$bytes.Length;version=$lock.version;build=$lock.buildName;verifiedCascBuild=$true}
 $records.Add($record);$record|ConvertTo-Json -Compress|Add-Content (Join-Path $out 'progress.ndjson') -Encoding utf8
 Write-Output ('Verified '+$sourcePath+' / '+$bytes.Length)
}
foreach($name in $wanted){
 $candidates=@($paths|Where-Object{$_.EndsWith('/'+$name,[StringComparison]::OrdinalIgnoreCase)}|Sort-Object)
 if(-not $candidates.Count){$missing.Add(@{filename=$name;reason='No matching filename in pinned B97563 selected roots'});continue}
 foreach($candidate in $candidates){Save $candidate ('assets/private/environment-samples/'+$candidate)}
}
foreach($mod in @('core','liberty','swarm','void')){foreach($kind in @('Water','Terrain','TerrainTex')){$candidate='mods/'+$mod+'.sc2mod/base.sc2data/GameData/'+$kind+'Data.xml';if($handler.FileExists($candidate)){Save $candidate ('assets/private/environment-samples/'+$candidate)}}}
ConvertTo-Json -InputObject @($records.ToArray()) -Depth 6|Set-Content (Join-Path $out 'verified.json') -Encoding utf8
ConvertTo-Json -InputObject @($missing.ToArray()) -Depth 6|Set-Content (Join-Path $out 'missing.json') -Encoding utf8
Write-Output ('Sources '+$records.Count+' / missing '+$missing.Count)
