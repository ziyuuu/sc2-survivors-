$ErrorActionPreference='Stop'
$p6Root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $p6Root
$p6Lock=Get-Content -LiteralPath 'tools/sc2-casc-lock.json' -Raw | ConvertFrom-Json
$p6Library=Join-Path $p6Root ('.cache/casclib-'+$p6Lock.cascRevision)
$p6PatchHash=(Get-FileHash -LiteralPath 'tools/patch-casc-source.py').Hash.Substring(0,12)
Add-Type -LiteralPath (Join-Path $p6Library ('CascLib-'+$p6PatchHash+'.dll'))
[CASCLib.CDNCache]::CachePath=Join-Path $p6Root '.cache/casc-data'
[CASCLib.CDNCache]::CacheData=$false
[CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride=$p6Lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride=$p6Lock.cdnConfig
[CASCLib.CASCConfig]::SelectionPattern='(?i)gamedata[\\/](?:unit|abil|effect)data\.xml$'
$p6Config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$p6Config.ActiveBuild=$p6Config.Builds.Count-1
if($p6Config.BuildName -ne $p6Lock.buildName){throw 'Pinned source build differs'}
$p6Handler=[CASCLib.CASCHandler]::OpenStorage($p6Config,$null)
$p6Handler.Root.LoadListFile('',$null)
$null=$p6Handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$p6StoryPaths=@([CASCLib.CASCFile]::Files.Values | ForEach-Object {$_.FullName.Replace('\','/')} | Where-Object {$_ -match '(?i)libertystory.*gamedata/abildata\.xml$'})
Write-Output ('Observed LibertyStory sources: '+($p6StoryPaths -join ', '))
$p6Expected=@{
 'campaigns/liberty.sc2campaign/base.sc2data/gamedata/unitdata.xml'=@('liberty-unitdata.xml','52026354da439891b67b4767f3caa7adb21088382aa61f167ac30f692574b963')
 'campaigns/liberty.sc2campaign/base.sc2data/gamedata/abildata.xml'=@('liberty-abildata.xml','4c4020f5bbd1bd02cc88df5be7946e045626869967fd120631fd04032471f746')
 'campaigns/liberty.sc2campaign/base.sc2data/gamedata/effectdata.xml'=@('liberty-effectdata.xml','6e0739ef81bf313f0bbe42d6d1b8b029a45753ad4892cf39fbeb2fc6442159f4')
 'mods/libertystory.sc2mod/base.sc2data/gamedata/abildata.xml'=@('libertystory-abildata.xml','0241cbd3ad314be4b59e4415b710bef70444cf4a16647d7338e5cc850bc32814')
}
$p6Rows=[Collections.Generic.List[object]]::new()
foreach($p6Entry in $p6Expected.GetEnumerator()){
 $p6SourcePath=$p6Entry.Key
 if($p6Entry.Value[0] -eq 'libertystory-abildata.xml'){if($p6StoryPaths.Count -ne 1){throw 'Expected one actual LibertyStory ability catalog'};$p6SourcePath=$p6StoryPaths[0]}
 $p6Stream=$p6Handler.OpenFile($p6SourcePath)
 if(-not $p6Stream){throw ('Missing pinned catalog '+$p6Entry.Key)}
 try{$p6Memory=[IO.MemoryStream]::new();$p6Stream.CopyTo($p6Memory);$p6Bytes=$p6Memory.ToArray();$p6Memory.Dispose()}finally{$p6Stream.Dispose()}
 $p6Hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($p6Bytes)).ToLowerInvariant()
 if($p6Hash -ne $p6Entry.Value[1]){throw ('Pinned catalog hash differs: '+$p6Entry.Key)}
 $p6Destination=Join-Path $p6Root ('.cache/sc2-campaign-data/'+$p6Entry.Value[0])
 [IO.File]::WriteAllBytes($p6Destination,$p6Bytes)
 $p6Rows.Add(@{path=$p6SourcePath;file=$p6Entry.Value[0];bytes=$p6Bytes.Length;sha256=$p6Hash;version=$p6Lock.version})
 Write-Output ('Verified '+$p6Entry.Value[0])
}
ConvertTo-Json -InputObject @($p6Rows.ToArray()) -Depth 5 | Set-Content -LiteralPath 'reports/local/p6-20261006/campaign-source-restoration.json' -Encoding utf8
