$ErrorActionPreference = 'Stop'
$g02Root = (Resolve-Path -LiteralPath 'D:\星际').Path
$g02Base = Join-Path $g02Root 'reports\local\g02-20261022'
$g02Expected = [IO.Path]::GetFullPath((Join-Path $g02Base 'qa-shared\profile'))
$g02Target = (Resolve-Path -LiteralPath $g02Expected).Path
if ($g02Target -ne $g02Expected -or -not $g02Target.StartsWith($g02Base + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'QA profile escaped the intended workspace target' }
$g02Processes = @(Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('/','\').Contains($g02Target) })
if ($g02Processes.Count -ne 0) { throw 'Owned QA browser is still running; refuse cache deletion' }
$g02Source = Get-Content -LiteralPath (Join-Path $g02Base 'final-source.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$g02Protected = @($g02Source.files | ForEach-Object { Join-Path $g02Root $_.file })
$g02Protected += Join-Path $g02Root 'dist\SC2-Survivors-Current-20261006.html'
$g02Protected += @(Get-ChildItem -LiteralPath $g02Base -File | Where-Object { $_.Extension -in @('.json','.log','.tap') } | ForEach-Object { $_.FullName })
foreach ($g02Folder in @('qa-production-r1','qa-ui-still-r1','qa-runtime-r1','qa-runtime-r2')) {
  $g02Protected += Join-Path $g02Base ($g02Folder + '\result.json')
  $g02Protected += @(Get-ChildItem -LiteralPath (Join-Path $g02Base ($g02Folder + '\screens')) -File | ForEach-Object { $_.FullName })
}
foreach ($g02Document in @('AGENTS.md','docs\project\performance-board.json','docs\project\PERFORMANCE_BOARD.html','docs\project\PERFORMANCE_TODO.md','docs\project\G01_HERO_G02_REVIEW_20261022.md','docs\project\FUN_FEEDBACK_R4_PLAN_20261022.md','docs\project\FUN_FEEDBACK_R4_20261022.md','reports\qa\g01-hero-g02-20261022.json','preview\g02-20261022\index.html')) { $g02Protected += Join-Path $g02Root $g02Document }
$g02Hashes = @{}
foreach ($g02File in $g02Protected) { $g02Hashes[$g02File] = (Get-FileHash -LiteralPath $g02File -Algorithm SHA256).Hash }
$g02Items = @(Get-ChildItem -LiteralPath $g02Target -File -Recurse -Force)
$g02Bytes = ($g02Items | Measure-Object -Property Length -Sum).Sum
Remove-Item -LiteralPath $g02Target -Recurse -Force
foreach ($g02File in $g02Protected) { if ((Get-FileHash -LiteralPath $g02File -Algorithm SHA256).Hash -ne $g02Hashes[$g02File]) { throw "Protected file changed: $g02File" } }
if (Test-Path -LiteralPath $g02Target) { throw 'QA profile still exists' }
$g02Report = [ordered]@{pass=$true;profile=$g02Target;browserClosed=$true;profileFiles=$g02Items.Count;profileLogicalBytes=$g02Bytes;protectedFiles=$g02Hashes.Count;protectedExact=$true;scope='Only this closed G02 QA browser profile. All source, frozen inputs, screenshots, raw reports, final builds and Current retained. Logical bytes are not a measured physical disk-space delta.'}
$g02Report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $g02Base 'cleanup.json') -Encoding UTF8
$g02Report | ConvertTo-Json -Compress
