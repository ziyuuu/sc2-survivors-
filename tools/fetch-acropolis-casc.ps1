$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$lock = Get-Content 'tools/sc2-casc-lock.json' -Raw | ConvertFrom-Json
$dll = Get-ChildItem ('.cache/casclib-' + $lock.cascRevision) -Filter 'CascLib-*.dll' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $dll) { throw 'CASCLib is missing. Run npm run assets:originals first.' }
Add-Type -LiteralPath $dll.FullName
[CASCLib.CDNCache]::CachePath = (Join-Path (Get-Location) '.cache/casc-data')
[CASCLib.CDNCache]::CacheData = $false
[CASCLib.CASCConfig]::LoadFlags = [CASCLib.LoadFlags]::None
[CASCLib.CASCConfig]::BuildConfigKeyOverride = $lock.buildConfig
[CASCLib.CASCConfig]::CDNConfigKeyOverride = $lock.cdnConfig
$map = Get-Content 'assets/private/maps/acropolis-extracted.json' -Raw | ConvertFrom-Json
$names = @($map.textures | ForEach-Object { @($_.diffuse, $_.normal) } | Where-Object { $_ } | ForEach-Object { [IO.Path]::GetFileName(($_ -replace '/', '\')).ToLowerInvariant() } | Sort-Object -Unique)
[CASCLib.CASCConfig]::SelectionPattern = '(?i)(?:' + (($names | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')'
$config = [CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
$config.ActiveBuild = $config.Builds.Count - 1
$handler = [CASCLib.CASCHandler]::OpenStorage($config,$null)
$handler.Root.LoadListFile('',$null)
$null = $handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
$files = @([CASCLib.CASCFile]::Files.Values | ForEach-Object FullName | Where-Object { $_ -match '\.dds$' })
$results = @()
foreach ($name in $names) {
 $source = $files | Where-Object { [IO.Path]::GetFileName($_).ToLowerInvariant() -eq $name } | Sort-Object @{Expression={ if($_ -match 'liberty\.sc2mod') { 0 } else { 1 } }},Length | Select-Object -First 1
 if (-not $source) { throw ('No original DDS for ' + $name) }
 $dest = Join-Path 'assets/private/dds' $name
 if (Test-Path -LiteralPath $dest) { $bytes = [IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $dest)) }
 else { $stream = $handler.OpenFile($source);if (-not $stream) { throw ('Cannot open ' + $source) };try { if($stream.Length -gt 32MB) { throw ('Unexpected DDS size: ' + $source) };$memory = [IO.MemoryStream]::new();$stream.CopyTo($memory);$bytes=$memory.ToArray();$memory.Dispose() } finally { $stream.Dispose() };[IO.File]::WriteAllBytes((Join-Path (Get-Location) $dest),$bytes) }
 if([Text.Encoding]::ASCII.GetString($bytes,0,4) -ne 'DDS ') { throw ('Invalid DDS header: ' + $name) }
 $results += @{name=$name;sourcePath=$source;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant();bytes=$bytes.Length;version=$lock.version}
 Write-Output ('Acropolis texture ' + $results.Count + '/' + $names.Count + ' ' + $name)
}
$results | ConvertTo-Json -Depth 4 | Set-Content 'tools/acropolis-textures-lock.json' -Encoding utf8
