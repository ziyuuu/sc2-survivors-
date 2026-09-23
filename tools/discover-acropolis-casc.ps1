$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$lock = Get-Content 'tools/sc2-casc-lock.json' -Raw | ConvertFrom-Json
$dll = Get-ChildItem ('.cache/casclib-' + $lock.cascRevision) -Filter 'CascLib-*.dll' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $dll) { throw 'CASCLib is missing. Run the existing local CASC bootstrap first.' }
Add-Type -LiteralPath $dll.FullName
[CASCLib.CDNCache]::CachePath = (Join-Path (Get-Location) '.cache/casc-data')
[CASCLib.CDNCache]::CacheData = $false
[CASCLib.CASCConfig]::LoadFlags = [CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride = $lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride = $lock.cdnConfig
$map = Get-Content 'assets/private/maps/acropolis-extracted.json' -Raw | ConvertFrom-Json
$missing = Get-Content 'assets/private/maps/acropolis-missing-models.json' -Raw | ConvertFrom-Json
$textures = @($map.textures | ForEach-Object { @($_.diffuse, $_.normal) } | Where-Object { $_ } | ForEach-Object { [IO.Path]::GetFileName(($_ -replace '/', '\')) } | Sort-Object -Unique)
$models = @($missing | ForEach-Object model | Where-Object { $_ } | Sort-Object -Unique)
$terms = @($textures + $models | ForEach-Object { [regex]::Escape($_) })
[CASCLib.CASCConfig]::SelectionPattern = '(?i)(?:' + ($terms -join '|') + '|assets/terrain/|assets/cliffs/)'
$config = [CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild = $config.Builds.Count - 1
$handler = [CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null = $handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$files = @([CASCLib.CASCFile]::Files.Values | ForEach-Object FullName | Where-Object { $_ -match '\.(m3|dds)$' })
$files | ConvertTo-Json -Depth 3 | Set-Content 'assets/private/maps/acropolis-casc-files.json' -Encoding utf8
Write-Output ('Indexed ' + $files.Count + ' Acropolis dependency candidates')
