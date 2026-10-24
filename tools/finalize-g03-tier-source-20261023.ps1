$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'D:\星际'
$g03Root = 'reports/local/g03-tier-balance-20261023'
do {
  $g03Files = @(Get-ChildItem -LiteralPath $g03Root -File | Where-Object { $_.Name -match '^(terran|zerg|protoss)-.*-\d+\.json$' })
  $g03Locks = @(Get-ChildItem -LiteralPath $g03Root -Filter '*.lock' -File)
  if ($g03Files.Count -ne 84 -or $g03Locks.Count -ne 0) { Start-Sleep -Seconds 5 }
} while ($g03Files.Count -ne 84 -or $g03Locks.Count -ne 0)
$g03Original = 'src/simulation/combat/enemy-specials.ts'
$g03Fixed = "$g03Root/behemoth-runtime/src/simulation/combat/enemy-specials.ts"
if ((Get-FileHash -LiteralPath $g03Original -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'e8bc27bbd609dee14dd62ff73d4bada3a62889ee6107ceedc102f5775baf7c9d') { throw 'Main enemy-specials changed before planned integration.' }
if ((Get-FileHash -LiteralPath $g03Fixed -Algorithm SHA256).Hash.ToLowerInvariant() -ne '0ab2034923a278300ba5cc5f7aa33a1d48a32a64c64ea4ca3b814acba296b3f6') { throw 'Isolated fixed source changed.' }
Copy-Item -LiteralPath $g03Fixed -Destination $g03Original
Copy-Item -LiteralPath "$g03Root/proposed-test/g03-behemoth-skill.test.ts" -Destination 'test/g03-behemoth-skill.test.ts'
Write-Output 'All 84 original records finished; exact isolated behemoth guard integrated. Starting final checks.'
$g03Checks = [ordered]@{ started = (Get-Date -Format o); mainOriginalRecords = $g03Files.Count; fixedSha256 = (Get-FileHash -LiteralPath $g03Original -Algorithm SHA256).Hash.ToLowerInvariant() }
@(Get-ChildItem -LiteralPath '.cache/p5-tests' -Directory | Select-Object -ExpandProperty FullName) | ConvertTo-Json -AsArray | Set-Content -LiteralPath "$g03Root/p5-cache-before-final.json" -Encoding utf8
node --import tsx --test test/g03-behemoth-skill.test.ts *> "$g03Root/behemoth-main-green.log"
$g03Checks.focusedExit = $LASTEXITCODE
npm test *> "$g03Root/regression-final.log"
$g03Checks.regressionExit = $LASTEXITCODE
npm run typecheck *> "$g03Root/type-final.log"
$g03Checks.typeExit = $LASTEXITCODE
npm run docs:check *> "$g03Root/data-final.log"
$g03Checks.dataExit = $LASTEXITCODE
$g03Checks.finished = Get-Date -Format o
$g03Checks | ConvertTo-Json | Set-Content -LiteralPath "$g03Root/checks-final.json" -Encoding utf8
Write-Output ($g03Checks | ConvertTo-Json -Compress)
if ($g03Checks.focusedExit -ne 0 -or $g03Checks.regressionExit -ne 0 -or $g03Checks.typeExit -ne 0 -or $g03Checks.dataExit -ne 0) { exit 1 }
