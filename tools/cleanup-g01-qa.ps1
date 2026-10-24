$ErrorActionPreference = 'Stop'
$g01Root = (Resolve-Path -LiteralPath 'D:\星际').Path
$g01Base = Join-Path $g01Root 'reports\local\g01-20261022'
$g01Expected = [IO.Path]::GetFullPath((Join-Path $g01Base 'qa-shared\profile'))
$g01Target = (Resolve-Path -LiteralPath $g01Expected).Path
if ($g01Target -ne $g01Expected -or -not $g01Target.StartsWith($g01Base + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'QA profile escaped the intended workspace target' }
$g01Processes = @(Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('/','\').Contains($g01Target) })
if ($g01Processes.Count -ne 0) { throw 'Owned QA browser is still running; refuse cache deletion' }
$g01Source = Get-Content -LiteralPath (Join-Path $g01Base 'final-source.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$g01Protected = @($g01Source.files | ForEach-Object { Join-Path $g01Root $_.file })
$g01Protected += Join-Path $g01Root 'dist\SC2-Survivors-Current-20261006.html'
foreach ($g01Folder in @('qa-cards-r3','qa-production-r1')) {
  $g01Protected += Join-Path $g01Base ($g01Folder + '\result.json')
  $g01Protected += @(Get-ChildItem -LiteralPath (Join-Path $g01Base ($g01Folder + '\screens')) -File | ForEach-Object { $_.FullName })
}
$g01Hashes = @{}
foreach ($g01File in $g01Protected) { $g01Hashes[$g01File] = (Get-FileHash -LiteralPath $g01File -Algorithm SHA256).Hash }
$g01Items = @(Get-ChildItem -LiteralPath $g01Target -File -Recurse -Force)
$g01Bytes = ($g01Items | Measure-Object -Property Length -Sum).Sum
Remove-Item -LiteralPath $g01Target -Recurse -Force
foreach ($g01File in $g01Protected) { if ((Get-FileHash -LiteralPath $g01File -Algorithm SHA256).Hash -ne $g01Hashes[$g01File]) { throw "Protected file changed: $g01File" } }
if (Test-Path -LiteralPath $g01Target) { throw 'QA profile still exists' }
$g01Report = [ordered]@{pass=$true;profile=$g01Target;browserClosed=$true;profileFiles=$g01Items.Count;profileLogicalBytes=$g01Bytes;protectedFiles=$g01Hashes.Count;protectedExact=$true;scope='Only this closed G01 QA browser profile. All source, frozen inputs, screenshots, raw reports, final builds and Current retained.'}
$g01Report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $g01Base 'cleanup.json') -Encoding UTF8
$g01Report | ConvertTo-Json -Compress
