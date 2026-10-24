$ErrorActionPreference='Stop'
$i03Base=[IO.Path]::GetFullPath('D:\星际\reports\local\integration-i03-20261022')
$i03Profile=[IO.Path]::GetFullPath((Join-Path $i03Base 'qa-shared\profile'))
if(-not $i03Profile.StartsWith($i03Base+[IO.Path]::DirectorySeparatorChar) -or $i03Profile -ne (Join-Path $i03Base 'qa-shared\profile')){throw 'Unexpected cleanup target'}
$i03Closure=Get-Content -LiteralPath (Join-Path $i03Base 'qa-process-closure.json') -Raw | ConvertFrom-Json
if(-not $i03Closure.allOwnedQaSessionsExited){throw 'Owned I03 QA browser sessions have not exited'}
$i03SourceManifest=Get-Content -LiteralPath (Join-Path $i03Base 'final-source.json') -Raw | ConvertFrom-Json
$i03Protected=@($i03SourceManifest.files | ForEach-Object {Join-Path 'D:\星际' $_.path})
$i03Protected+='D:\星际\dist\SC2-Survivors-Current-20261006.html'
foreach($i03Name in @('qa-production-r1','qa-touch-r1','qa-effects-r3')){
 $i03Protected+=Join-Path $i03Base "$i03Name\result.json"
 $i03Protected+=Get-ChildItem -LiteralPath (Join-Path $i03Base "$i03Name\screens") -File | Select-Object -ExpandProperty FullName
}
$i03Before=@{};foreach($i03File in $i03Protected){$i03Before[$i03File]=(Get-FileHash -LiteralPath $i03File -Algorithm SHA256).Hash}
$i03CacheFiles=Get-ChildItem -LiteralPath $i03Profile -Recurse -File -Force
$i03Bytes=($i03CacheFiles | Measure-Object -Property Length -Sum).Sum
Remove-Item -LiteralPath $i03Profile -Recurse -Force
foreach($i03File in $i03Protected){if((Get-FileHash -LiteralPath $i03File -Algorithm SHA256).Hash -ne $i03Before[$i03File]){throw "Protected file changed: $i03File"}}
$i03Result=@{pass=$true;removed=$i03Profile;logicalBytes=$i03Bytes;files=$i03CacheFiles.Count;protectedFiles=$i03Before.Count;protectedExact=$true;browserClosed=$true;scope='Only the finished I03 QA browser profile. Screenshots, logs, frozen input, output and Current retained.'}
$i03Result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $i03Base 'cleanup.json') -Encoding utf8
$i03Result | ConvertTo-Json -Compress
