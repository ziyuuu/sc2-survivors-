$ErrorActionPreference='Stop'
$i02Base=[IO.Path]::GetFullPath('D:\星际\reports\local\integration-i02-20261022')
$i02Profile=[IO.Path]::GetFullPath((Join-Path $i02Base 'qa-shared\profile'))
if(-not $i02Profile.StartsWith($i02Base+[IO.Path]::DirectorySeparatorChar) -or $i02Profile -ne (Join-Path $i02Base 'qa-shared\profile')){throw 'Unexpected cleanup target'}
$i02Busy=Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'chrome.exe' -and ($_.CommandLine -like '*integration-i02-20261022/qa-shared/profile*' -or $_.CommandLine -like '*integration-i02-20261022\qa-shared\profile*')}
if($i02Busy){throw 'I02 QA browser is still running'}
$i02Protected=@('D:\星际\src\simulation\special-stages\bridge.ts','D:\星际\src\simulation\special-stages\crossing.ts','D:\星际\src\simulation\special-stages\combat-state.ts','D:\星际\test\integration-i02.test.ts','D:\星际\test\integration-i02-transactions.test.ts','D:\星际\dist\SC2-Survivors-Current-20261006.html')
foreach($i02Name in @('qa-web-r5','qa-offline-r1','qa-production-r1','qa-touch-r1')){
 $i02Protected+=Join-Path $i02Base "$i02Name\result.json"
 $i02Protected+=Get-ChildItem -LiteralPath (Join-Path $i02Base "$i02Name\screens") -File | Select-Object -ExpandProperty FullName
}
$i02Before=@{};foreach($i02File in $i02Protected){$i02Before[$i02File]=(Get-FileHash -LiteralPath $i02File -Algorithm SHA256).Hash}
$i02CacheFiles=Get-ChildItem -LiteralPath $i02Profile -Recurse -File -Force
$i02Bytes=($i02CacheFiles | Measure-Object -Property Length -Sum).Sum
Remove-Item -LiteralPath $i02Profile -Recurse -Force
foreach($i02File in $i02Protected){if((Get-FileHash -LiteralPath $i02File -Algorithm SHA256).Hash -ne $i02Before[$i02File]){throw "Protected file changed: $i02File"}}
$i02Result=@{pass=$true;removed=$i02Profile;logicalBytes=$i02Bytes;files=$i02CacheFiles.Count;protectedFiles=$i02Before.Count;protectedExact=$true;browserClosed=$true;scope='Only the finished I02 QA browser profile. Screenshots, logs, frozen input, output and Current retained.'}
$i02Result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $i02Base 'cleanup.json') -Encoding utf8
$i02Result | ConvertTo-Json -Compress
