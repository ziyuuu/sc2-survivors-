param([string]$Output='reports/local/camera-calibration-20261011/original-camera-source')
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
$lock=Get-Content tools/sc2-casc-lock.json -Raw | ConvertFrom-Json

function LocalPath([string]$relative){$p=[IO.Path]::GetFullPath((Join-Path $root $relative));if(-not $p.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Path outside project'};return $p}
$directory=LocalPath $Output
if(Test-Path -LiteralPath $directory){throw 'Evidence directory already exists; select a new output'}
$records=[Collections.Generic.List[object]]::new();$missing=[Collections.Generic.List[object]]::new()

$source=LocalPath ('.cache/casclib-'+$lock.cascRevision)
if(-not(Test-Path (Join-Path $source '.git'))){
 & git clone --no-checkout https://github.com/WoW-Tools/CascLib.git $source
 if($LASTEXITCODE){throw 'CASCLib source download failed'}
 & git -C $source checkout --detach $lock.cascRevision
 if($LASTEXITCODE){throw 'Pinned CASCLib revision unavailable'}
}
if((& git -C $source rev-parse HEAD) -ne $lock.cascRevision){throw 'Unexpected CASCLib revision'}
& python -X utf8 tools/patch-casc-source.py $source
if($LASTEXITCODE){throw 'CASCLib adaptation failed'}
$patchHash=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
if(-not(Test-Path (Join-Path $source ('CascLib-'+$patchHash+'.dll')))){
 $sources=Get-ChildItem (Join-Path $source 'CascLib') -Filter *.cs -Recurse | Where-Object Name -ne 'AssemblyInfo.cs' | ForEach-Object FullName
 Add-Type -Path $sources -CompilerOptions '/unsafe' -OutputAssembly (Join-Path $source ('CascLib-'+$patchHash+'.dll')) -IgnoreWarnings -WarningAction SilentlyContinue
}
Add-Type -LiteralPath (Join-Path $source ('CascLib-'+$patchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=LocalPath '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)gamedata[\\/](?:camera|gameui|sc2)data\.xml$'
$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Asset build changed'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$modules=@('mods/void.sc2mod','mods/swarm.sc2mod','mods/liberty.sc2mod','mods/core.sc2mod','mods/starcoop/starcoop.sc2mod','mods/novastoryassets.sc2mod','mods/libertystory.sc2mod','mods/swarmstory.sc2mod','mods/voidstory.sc2mod','mods/war3.sc2mod')
$catalogPaths=@([CASCLib.CASCFile]::Files.Values | ForEach-Object { $_.FullName.Replace('\','/') })


$dataPaths=@($catalogPaths | Where-Object {$_ -match '(?i)mods/.+\.sc2mod/base\.sc2data/gamedata/(?:camera|gameui|sc2)data\.xml$'})
$records=[Collections.Generic.List[object]]::new()
$null=[IO.Directory]::CreateDirectory($directory)
foreach($path in $dataPaths){
 $match=[regex]::Match($path,'(?i)mods/(.+)\.sc2mod/.*/([^/]+)\.xml$');$filename=$match.Groups[1].Value.Replace('/','-')+'-'+$match.Groups[2].Value.ToLowerInvariant()+'.xml';$destination=Join-Path $directory $filename
 try{$stream=$handler.OpenFile($path);if(-not $stream){continue};try{if($stream.Length -gt 2MB){throw 'Camera source exceeds bounded extraction size'};$memory=[IO.MemoryStream]::new();$stream.CopyTo($memory);$bytes=$memory.ToArray();$memory.Dispose()}finally{$stream.Dispose()};$text=[Text.Encoding]::UTF8.GetString($bytes);if(-not $text.Contains('<Catalog')){throw 'Invalid source XML'};[IO.File]::WriteAllBytes($destination,$bytes);$records.Add(@{path=$path;file=$filename;version=$lock.version;buildConfig=$lock.buildConfig;cdnConfig=$lock.cdnConfig;source=('https://'+$lock.host+'/'+$lock.cdnPath);bytes=$bytes.Length;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()});Write-Output ('OK '+$filename+' '+$bytes.Length)}catch{Write-Warning ($path+': '+$_.Exception.Message)}
}
ConvertTo-Json -InputObject @($records.ToArray()) -Depth 5 | Set-Content -LiteralPath (Join-Path $directory 'provenance.json') -Encoding utf8
