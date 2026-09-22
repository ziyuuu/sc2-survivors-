#requires -Version 7.4
# Public SC2 CDN, exact pinned files only. No full client/archive download or credentials.
param([string]$Python='python', [switch]$VerifyOnly, [switch]$Refetch, [string]$TargetFile='sc2-casc-targets.json', [string]$OutputFile='assets/private/casc-import.json')
$ErrorActionPreference='Stop'
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$lock=Get-Content (Join-Path $PSScriptRoot 'sc2-casc-lock.json') -Raw | ConvertFrom-Json
$targets=Get-Content (Join-Path $PSScriptRoot $TargetFile) -Raw | ConvertFrom-Json
function ProjectPath([string]$relative){
 $path=[IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
 if(-not $path.StartsWith($projectRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Target escapes the project directory'}
 return $path
}
function ValidFile($target,[string]$file){
 if(-not (Test-Path -LiteralPath $file)){return $false}
 $info=Get-Item -LiteralPath $file
 if($info.Length -ne $target.bytes){return $false}
 return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -eq $target.sha256
}
$pending=@($targets | Where-Object { $Refetch -or -not (ValidFile $_ (ProjectPath $_.cachedFile)) })
if($pending.Count -and $VerifyOnly){throw "Missing or invalid pinned files: $($pending.id -join ', ')"}
if($pending.Count){
 $source=ProjectPath ('.cache/casclib-'+$lock.cascRevision)
 if(-not (Test-Path (Join-Path $source '.git'))){
  & git clone --no-checkout https://github.com/WoW-Tools/CascLib.git $source
  if($LASTEXITCODE){throw 'CASCLib source download failed'}
  & git -C $source checkout --detach $lock.cascRevision
  if($LASTEXITCODE){throw 'CASCLib revision unavailable'}
 }
 if((& git -C $source rev-parse HEAD) -ne $lock.cascRevision){throw 'Unexpected CASCLib revision'}
 & $Python -X utf8 (Join-Path $PSScriptRoot 'patch-casc-source.py') $source
 if($LASTEXITCODE){throw 'CASCLib adaptation failed'}
 $patchHash=(Get-FileHash (Join-Path $PSScriptRoot 'patch-casc-source.py')).Hash.Substring(0,12)
 $dll=Join-Path $source ('CascLib-'+$patchHash+'.dll')
 if(-not (Test-Path $dll)){
  $sources=Get-ChildItem (Join-Path $source 'CascLib') -Filter *.cs -Recurse | Where-Object Name -ne 'AssemblyInfo.cs' | ForEach-Object FullName
  Add-Type -Path $sources -CompilerOptions '/unsafe' -OutputAssembly $dll -IgnoreWarnings -WarningAction SilentlyContinue
 }
 Add-Type -LiteralPath $dll
 [CASCLib.CDNCache]::CachePath=ProjectPath '.cache/casc-data'
 $null=[IO.Directory]::CreateDirectory([CASCLib.CDNCache]::CachePath)
 [CASCLib.CDNCache]::CacheData=$false
 [CASCLib.CASCConfig]::LoadFlags=[CASCLib.LoadFlags]::None
 [CASCLib.CASCConfig]::BuildConfigKeyOverride=$lock.buildConfig
 [CASCLib.CASCConfig]::CDNConfigKeyOverride=$lock.cdnConfig
 [CASCLib.CASCConfig]::SelectionPattern='^(?:'+(($pending | ForEach-Object { [regex]::Escape($_.sourcePath) }) -join '|')+')$'
 $config=[CASCLib.CASCConfig]::LoadOnlineStorageConfig('s2','us',$false,$null)
 # The override is appended after any CDN build list; select that exact pinned config.
 $config.ActiveBuild=$config.Builds.Count-1
 if($config.BuildName -ne $lock.buildName){throw 'SC2 asset build does not match the lock'}
 $handler=[CASCLib.CASCHandler]::OpenStorage($config,$null)
 $handler.Root.LoadListFile('',$null)
 $null=$handler.Root.SetFlags([CASCLib.LocaleFlags]::All,$false,$false,$true)
 foreach($target in $pending){
  $stream=$handler.OpenFile($target.sourcePath)
  if(-not $stream){throw ('CASC file missing: '+$target.sourcePath)}
  try {
   if($stream.Length -ne $target.bytes -or $stream.Length -gt 20MB){throw 'Unexpected source size'}
   $memory=[IO.MemoryStream]::new();$stream.CopyTo($memory);$bytes=$memory.ToArray();$memory.Dispose()
   $hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
   if($hash -ne $target.sha256){throw ('CASC content mismatch: '+$target.id)}
   $destination=ProjectPath $target.cachedFile
   $null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination))
   [IO.File]::WriteAllBytes($destination,$bytes)
   Write-Output ('Downloaded '+$target.id+' / '+$bytes.Length+' bytes')
  }finally {$stream.Dispose()}
 }
}
$records=@()
foreach($target in $targets){
 $sourceFile=ProjectPath $target.cachedFile
 if(-not (ValidFile $target $sourceFile)){throw ('Invalid source '+$target.id)}
 $destination=ProjectPath $target.installFile
 $null=[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination))
 if($sourceFile -ne $destination){[IO.File]::Copy($sourceFile,$destination,$true)}
 $records+=@{id=$target.id;file=$target.installFile;sourcePath=$target.sourcePath;source='https://'+$lock.host+'/'+$lock.cdnPath;version=$lock.version;buildConfig=$lock.buildConfig;sha256=$target.sha256;bytes=$target.bytes}
}
$report=ProjectPath $OutputFile
$records | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $report -Encoding utf8
Write-Output ('Verified and installed '+$records.Count+' original SC2 files. Run assets:prepare/build for runtime packaging.')

& $Python -X utf8 (Join-Path $PSScriptRoot 'convert-sc2-audio.py')
if($LASTEXITCODE){throw 'Original files downloaded; PCM conversion needs the local audio requirements shown above.'}
