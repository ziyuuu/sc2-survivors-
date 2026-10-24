$ErrorActionPreference = 'Stop'
$g03Root = (Resolve-Path -LiteralPath 'D:\星际').Path
$g03Base = Join-Path $g03Root 'reports\local\g03-content-20261022'
$g03Expected = [IO.Path]::GetFullPath((Join-Path $g03Base 'qa-shared\profile'))
$g03Target = (Resolve-Path -LiteralPath $g03Expected).Path
if ($g03Target -ne $g03Expected -or -not $g03Target.StartsWith($g03Base + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'QA profile escaped the intended workspace target' }
$g03Processes = @(Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('/','\').Contains($g03Target) })
if ($g03Processes.Count -ne 0) { throw 'Owned QA browser is still running; refuse cache deletion' }
$g03ArchivePath = Join-Path $g03Base 'offline-r1-archive.json'
$g03Archive = Get-Content -LiteralPath $g03ArchivePath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $g03Archive.pass -or -not $g03Archive.recomposedHashExact) { throw 'Intermediate archive is not verified' }
$g03OldExpected = [IO.Path]::GetFullPath((Join-Path $g03Base 'offline-game-r1.html'))
$g03Old = (Resolve-Path -LiteralPath $g03OldExpected).Path
if ($g03Old -ne $g03OldExpected -or -not $g03Old.StartsWith($g03Base + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Intermediate target escaped batch directory' }
if ((Get-FileHash -LiteralPath $g03Old -Algorithm SHA256).Hash.ToLowerInvariant() -ne $g03Archive.originalSha256) { throw 'Intermediate SHA differs from archived input' }
$g03Source = Get-Content -LiteralPath (Join-Path $g03Base 'final-source.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$g03Protected = @($g03Source.files | ForEach-Object { Join-Path $g03Root $_.file })
$g03Protected += Join-Path $g03Root 'dist\SC2-Survivors-Current-20261006.html'
$g03Protected += Join-Path $g03Base 'offline-game-r2.html'
$g03Protected += Join-Path $g03Base 'offline-game-r1-difference.json.gz'
$g03Protected += @(Get-ChildItem -LiteralPath $g03Base -File | Where-Object { $_.Extension -in @('.json','.log','.tap') -and $_.Name -ne 'offline-r1-archive.json' } | ForEach-Object { $_.FullName })
foreach ($g03Folder in @('qa-production-r1','qa-production-r2','qa-content-r1','qa-content-r2')) {
  $g03Protected += Join-Path $g03Base ($g03Folder + '\result.json')
  $g03Protected += @(Get-ChildItem -LiteralPath (Join-Path $g03Base ($g03Folder + '\screens')) -File | ForEach-Object { $_.FullName })
}
foreach ($g03Document in @('AGENTS.md','docs\project\performance-board.json','docs\project\G03_DIFFICULTY_CONTENT_PLAN_20261022.md','docs\project\G03_CONTENT_INTEGRATION_20261022.md')) { $g03Protected += Join-Path $g03Root $g03Document }
$g03Hashes = @{}
foreach ($g03File in $g03Protected) { $g03Hashes[$g03File] = (Get-FileHash -LiteralPath $g03File -Algorithm SHA256).Hash }
$g03Items = @(Get-ChildItem -LiteralPath $g03Target -File -Recurse -Force)
$g03Bytes = ($g03Items | Measure-Object -Property Length -Sum).Sum
Remove-Item -LiteralPath $g03Target -Recurse -Force
Remove-Item -LiteralPath $g03Old -Force
foreach ($g03File in $g03Protected) { if ((Get-FileHash -LiteralPath $g03File -Algorithm SHA256).Hash -ne $g03Hashes[$g03File]) { throw "Protected file changed: $g03File" } }
if ((Test-Path -LiteralPath $g03Target) -or (Test-Path -LiteralPath $g03Old)) { throw 'Cleanup target still exists' }
$g03Archive | Add-Member -NotePropertyName expandedPresent -NotePropertyValue $false -Force
$g03Archive | Add-Member -NotePropertyName restoreCommand -NotePropertyValue 'node tools/restore-g03-r1.mjs' -Force
$g03Archive | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $g03ArchivePath -Encoding UTF8
$g03Report = [ordered]@{pass=$true;profile=$g03Target;browserClosed=$true;profileFiles=$g03Items.Count;profileLogicalBytes=$g03Bytes;archivedExpandedBytes=$g03Archive.originalBytes;differenceBytes=$g03Archive.differenceBytes;protectedFiles=$g03Hashes.Count;protectedExact=$true;scope='Only this closed G03 QA profile and verified intermediate r1 expanded HTML. Final r2 donor, exact r1 difference, all source, screenshots, raw reports and Current retained. Logical bytes are not measured physical disk-space savings.'}
$g03Report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $g03Base 'cleanup.json') -Encoding UTF8
$g03Report | ConvertTo-Json -Compress
