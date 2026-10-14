#requires -Version 7.4
param([string]$Evidence='reports/local/refraction-science-20261013/science-source-fetch-r1')
$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
function LocalPath([string]$relative){$p=[IO.Path]::GetFullPath((Join-Path $taskRoot $relative));if(-not $p.StartsWith($taskRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Path outside project'};return $p}
function Hash([byte[]]$bytes){return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()}
$out=LocalPath $Evidence;if(Test-Path -LiteralPath $out){throw 'Choose a new evidence directory'};$null=[IO.Directory]::CreateDirectory($out)
$lock=Get-Content tools/sc2-casc-lock.json -Raw|ConvertFrom-Json
$patchHash=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (LocalPath ('.cache/casclib-'+$lock.cascRevision+'/CascLib-'+$patchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=LocalPath '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)gamedata[\\/](?:skin|skinpack)data\.xml$'
$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null);$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Asset build changed'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null);$handler.Root.LoadListFile('',$null);$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$records=[Collections.Generic.List[object]]::new();$paths=@([CASCLib.CASCFile]::Files.Values|ForEach-Object {$_.FullName.Replace('\','/')}|Where-Object {$_ -match '(?i)gamedata/(skin|skinpack)data.xml$'}|Sort-Object -Unique)
foreach($sourcePath in $paths){
 $stream=$handler.OpenFile($sourcePath);if(-not $stream){throw "Missing source $sourcePath"}
 try{if($stream.Length -gt 32MB){throw 'Source size bound'};$memory=[IO.MemoryStream]::new();$stream.CopyTo($memory);$bytes=$memory.ToArray()}finally{if($memory){$memory.Dispose()};$stream.Dispose()}
 $file='assets/private/actor-source/'+$sourcePath;$destination=LocalPath $file;$digest=Hash $bytes
 if(Test-Path -LiteralPath $destination){if((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $digest){throw "Preserving changed original $file"}}
 else{$null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination));[IO.File]::WriteAllBytes($destination,$bytes)}
 $records.Add([pscustomobject]@{sourcePath=$sourcePath;installFile=$file;version=$lock.version;build=$lock.buildName;verifiedCascBuild=$true;sha256=$digest;bytes=$bytes.Length})
}
$report=[pscustomobject]@{build=$lock.buildName;records=$records;catalogPaths=$paths}
$report|ConvertTo-Json -Depth 12|Set-Content -LiteralPath (Join-Path $out 'result.json') -Encoding utf8
$records|ConvertTo-Json -Depth 12|Set-Content -LiteralPath (LocalPath 'tools/science-vessel-source-dependencies.json') -Encoding utf8
Write-Output ('Pinned source catalogs: '+$records.Count)
