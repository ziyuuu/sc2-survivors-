$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskLock=Get-Content -LiteralPath tools/sc2-casc-lock.json -Raw|ConvertFrom-Json
$taskPatch=(Get-FileHash -LiteralPath tools/patch-casc-source.py).Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path (Get-Location) ('.cache/casclib-'+$taskLock.cascRevision+'/CascLib-'+$taskPatch+'.dll'))
[CASCLib.CDNCache]::CachePath=Join-Path (Get-Location) '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$taskLock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$taskLock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)(?:base\.sc2assets[\\/]assets[\\/]sounds[\\/].*(?:movement|foot|track|tread|walk|marine|siege|tank|terran|fs_).*(?:wav|ogg)$)'
$taskConfig=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$taskConfig.ActiveBuild=$taskConfig.Builds.Count-1
if($taskConfig.BuildName -ne $taskLock.buildName){throw 'Pinned build changed'}
$taskHandler=[CASCLib.CASCHandler]::OpenStorage($taskConfig,$null)
$taskHandler.Root.LoadListFile('',$null)
$null=$taskHandler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$taskPaths=@([CASCLib.CASCFile]::Files.Values|ForEach-Object {$_.FullName.Replace('\','/')}|Sort-Object -Unique)
$null=New-Item -ItemType Directory -Force -Path .cache/t01-sound-recheck
ConvertTo-Json -InputObject $taskPaths -Depth 3|Set-Content -LiteralPath .cache/t01-sound-recheck/casc-movement-paths.json -Encoding utf8
Write-Output ('Indexed movement/footstep/track/Marine/Tank/FS source candidates: '+$taskPaths.Count)
