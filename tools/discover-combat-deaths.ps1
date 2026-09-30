$ModelManifest="tools/combat-death-models.json"
$DependenciesFile="tools/combat-death-dependencies.json"
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
$lock=Get-Content tools/sc2-casc-lock.json -Raw | ConvertFrom-Json

function LocalPath([string]$relative){$p=[IO.Path]::GetFullPath((Join-Path $root $relative));if(-not $p.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Path outside project'};return $p}
$records=[Collections.Generic.List[object]]::new();$missing=[Collections.Generic.List[object]]::new()
$previous=@();if(Test-Path -LiteralPath $DependenciesFile){$previous=@(Get-Content -LiteralPath $DependenciesFile -Raw | ConvertFrom-Json)}
foreach($priorManifest in @('tools/sc2-casc-targets.json','tools/expansion-dependencies.json','tools/three-race-dependencies.json','tools/three-race-additional-dependencies.json','tools/three-race-animation-dependencies.json')){if($priorManifest -ne $DependenciesFile -and (Test-Path -LiteralPath $priorManifest)){$previous+=@(Get-Content -LiteralPath $priorManifest -Raw | ConvertFrom-Json)}}
$source=LocalPath ('.cache/casclib-'+$lock.cascRevision)
$patchHash=(Get-FileHash tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path $source ('CascLib-'+$patchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=LocalPath '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)assets[\\/](?:units[\\/].*\.m3a?|buildings[\\/].*\.m3a?|textures[\\/].*\.dds|effects[\\/].*\.m3)$'
try{$config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)}catch{throw ('Pinned CASC metadata failed: '+$_.Exception.ToString())}
$config.ActiveBuild=$config.Builds.Count-1
if($config.BuildName -ne $lock.buildName){throw 'Asset build changed'}
$handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$modules=@('mods/void.sc2mod','mods/swarm.sc2mod','mods/liberty.sc2mod','mods/core.sc2mod','mods/starcoop/starcoop.sc2mod','mods/novastoryassets.sc2mod','mods/libertystory.sc2mod','mods/swarmstory.sc2mod','mods/voidstory.sc2mod','mods/war3.sc2mod')
$catalogPaths=@([CASCLib.CASCFile]::Files.Values | ForEach-Object { $_.FullName.Replace('\','/') })
$matches=@($catalogPaths | Where-Object { $_ -match '(?i)assets/units/.*(reaper|lurker|mutalisk|ultralisk|colossus|sciencevessel|zagara|swarmqueen|expeditionqueen).*death.*\.m3$' })
ConvertTo-Json -InputObject $matches -Depth 3 | Set-Content -LiteralPath 'reports/local/hero-iteration/death-path-candidates.json' -Encoding utf8
Write-Output ('Candidate paths '+$matches.Count)
