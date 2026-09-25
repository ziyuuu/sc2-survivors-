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
[CASCLib.CASCConfig]::SelectionPattern='(?i)(?:assets[\\/]units[\\/].*\.m3|gamedata[\\/].*\.xml)$'
$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Asset build changed'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$modules=@('mods/void.sc2mod','mods/swarm.sc2mod','mods/liberty.sc2mod','mods/core.sc2mod','mods/starcoop/starcoop.sc2mod','mods/novastoryassets.sc2mod','mods/libertystory.sc2mod','mods/swarmstory.sc2mod','mods/voidstory.sc2mod','mods/war3.sc2mod')
$catalogPaths=@([CASCLib.CASCFile]::Files.Values | ForEach-Object { $_.FullName.Replace('\','/') })

$modelsFound=@($catalogPaths | Where-Object {$_ -match '(?i)assets/units/.*(ScienceVessel|Swann|Tosh|Niadra|Alarak|Vorazun).*\.m3$' -and $_ -notmatch '(?i)Hologram|Death|Portrait|Attack|Missile|Weapon'})
$dataFound=@($catalogPaths | Where-Object {$_ -match '(?i)campaigns/(?:liberty|swarm|void)\.sc2campaign/base\.sc2data/gamedata/.*\.xml$'})
@{models=$modelsFound;campaignData=$dataFound} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (LocalPath 'reports/local/three-race-casc-audit.json') -Encoding utf8
Write-Output ('Found '+$modelsFound.Count+' named model paths; '+$dataFound.Count+' campaign data paths')
$modelsFound | Select-Object -First 35 | Write-Output
$dataFound | Select-Object -First 10 | Write-Output
