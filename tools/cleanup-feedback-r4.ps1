$ErrorActionPreference='Stop'
$r4Base=[IO.Path]::GetFullPath('D:\星际\reports\local\feedback-r4-20261022')
$r4Profile=[IO.Path]::GetFullPath((Join-Path $r4Base 'qa-shared\profile'))
if(-not $r4Profile.StartsWith($r4Base+[IO.Path]::DirectorySeparatorChar) -or $r4Profile -ne (Join-Path $r4Base 'qa-shared\profile')){throw 'Unexpected profile target'}
$r4Closure=Get-Content -LiteralPath (Join-Path $r4Base 'qa-process-closure.json') -Raw | ConvertFrom-Json
if(-not $r4Closure.allOwnedQaSessionsExited){throw 'Owned QA browser sessions have not exited'}
$r4Verification=Get-Content -LiteralPath (Join-Path $r4Base 'verification.json') -Raw | ConvertFrom-Json
if(-not $r4Verification.pass){throw 'Verification incomplete'}
$r4Source=Get-Content -LiteralPath (Join-Path $r4Base 'final-source.json') -Raw | ConvertFrom-Json
$r4Protected=@($r4Source.files | ForEach-Object {Join-Path 'D:\星际' $_.file})
$r4Protected+='D:\星际\dist\SC2-Survivors-Current-20261006.html'
foreach($r4Name in @('qa-interactions-r9','qa-battle-r4','qa-hordes-r3','qa-production-r2','qa-touch-r2')){
 $r4Protected+=Join-Path $r4Base "$r4Name\result.json"
 $r4Protected+=Get-ChildItem -LiteralPath (Join-Path $r4Base "$r4Name\screens") -File | Select-Object -ExpandProperty FullName
}
$r4Before=@{};foreach($r4File in $r4Protected){$r4Before[$r4File]=(Get-FileHash -LiteralPath $r4File -Algorithm SHA256).Hash}
$r4CacheFiles=Get-ChildItem -LiteralPath $r4Profile -Recurse -File -Force
$r4CacheBytes=($r4CacheFiles | Measure-Object -Property Length -Sum).Sum
Remove-Item -LiteralPath $r4Profile -Recurse -Force
$r4Plan=Get-Content -LiteralPath (Join-Path $r4Base 'archive-r1-plan.json') -Raw | ConvertFrom-Json
if(-not $r4Plan.pass){throw 'Archive incomplete'}
$r4Removed=@()
foreach($r4Row in $r4Plan.targets){
 $r4Target=[IO.Path]::GetFullPath((Join-Path 'D:\星际' $r4Row.path))
 if(-not $r4Target.StartsWith($r4Base+[IO.Path]::DirectorySeparatorChar) -or [IO.Path]::GetFileName($r4Target) -notin @('offline-game-r1.html','offline-lab-r1.html')){throw 'Unexpected obsolete build target'}
 if((Get-FileHash -LiteralPath $r4Target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $r4Row.sha256){throw 'Obsolete build identity changed'}
 Remove-Item -LiteralPath $r4Target -Force
 $r4Removed+=@{path=$r4Target;bytes=$r4Row.bytes;sha256=$r4Row.sha256;restore='python tools/archive-feedback-r4.py restore '+$r4Row.path}
}
foreach($r4File in $r4Protected){if((Get-FileHash -LiteralPath $r4File -Algorithm SHA256).Hash -ne $r4Before[$r4File]){throw "Protected file changed: $r4File"}}
$r4Result=@{pass=$true;profile=$r4Profile;profileLogicalBytes=$r4CacheBytes;profileFiles=$r4CacheFiles.Count;archivedBuilds=$r4Removed;archiveCompressedBytes=$r4Plan.compressedBytes;protectedFiles=$r4Before.Count;protectedExact=$true;browserClosed=$true;scope='Only owned closed R4 QA browser profile and two obsolete R1 offline files with SHA-exact reconstruction. Sources, logs, screenshots, final R2 builds and Current retained.'}
$r4Result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $r4Base 'cleanup.json') -Encoding utf8
$r4Result | ConvertTo-Json -Compress -Depth 8
