$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
$lock=Get-Content tools/sc2-casc-lock.json -Raw | ConvertFrom-Json

function LocalPath([string]$relative){$p=[IO.Path]::GetFullPath((Join-Path $root $relative));if(-not $p.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Path outside project'};return $p}
$records=[Collections.Generic.List[object]]::new();$missing=[Collections.Generic.List[object]]::new()

$source=LocalPath ('.cache/casclib-'+$lock.cascRevision)
$patchHash=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path $source ('CascLib-'+$patchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=LocalPath '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)(?:assets[\\/]units[\\/].*\.m3|gamedata[\\/].*(?:unit|model|abil|behavior|effect|actor)data\.xml)$'
$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Asset build changed'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$modules=@('mods/void.sc2mod','mods/swarm.sc2mod','mods/liberty.sc2mod','mods/core.sc2mod','mods/starcoop/starcoop.sc2mod','mods/novastoryassets.sc2mod','mods/libertystory.sc2mod','mods/swarmstory.sc2mod','mods/voidstory.sc2mod','mods/war3.sc2mod')
$catalogPaths=@([CASCLib.CASCFile]::Files.Values | ForEach-Object { $_.FullName.Replace('\','/') })


$dataPaths=@($catalogPaths | Where-Object {$_ -match '(?i)campaigns/(liberty|swarm|void)\.sc2campaign/base\.sc2data/gamedata/(?:unit|abil|behavior|model|heroabil|effect|actor)data\.xml$'})
$records=[Collections.Generic.List[object]]::new()
$directory=LocalPath '.cache/sc2-campaign-data';$null=[IO.Directory]::CreateDirectory($directory)
foreach($path in $dataPaths){
 $match=[regex]::Match($path,'(?i)campaigns/([^/]+)\.sc2campaign/.*/([^/]+)\.xml$');$filename=$match.Groups[1].Value+'-'+$match.Groups[2].Value.ToLowerInvariant()+'.xml';$destination=Join-Path $directory $filename
 try{$stream=$handler.OpenFile($path);if(-not $stream){continue};try{$memory=[IO.MemoryStream]::new();$stream.CopyTo($memory);$bytes=$memory.ToArray();$memory.Dispose()}finally{$stream.Dispose()};$text=[Text.Encoding]::UTF8.GetString($bytes);if(-not $text.Contains('<Catalog')){throw 'Invalid source XML'};[IO.File]::WriteAllBytes($destination,$bytes);$records.Add(@{path=$path;file=$filename;version=$lock.version;bytes=$bytes.Length;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()});Write-Output ('OK '+$filename+' '+$bytes.Length)}catch{Write-Warning ($path+': '+$_.Exception.Message)}
}
ConvertTo-Json -InputObject @($records.ToArray()) -Depth 5 | Set-Content -LiteralPath (Join-Path $directory 'provenance.json') -Encoding utf8
