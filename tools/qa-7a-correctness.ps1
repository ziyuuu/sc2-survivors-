#requires -Version 7
param([switch]$SkipBuild,[ValidatePattern('^r[1-9][0-9]*$')][string]$Revision='r1')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskRoot = 'reports/local/7a-20261013'
if (-not $SkipBuild) {
& node tools/build-7a-visual.mjs visual-baseline-r1 --baseline *> ($taskRoot + '/visual-baseline-build-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Frozen baseline diagnostic build failed' }
& node tools/build-7a-visual.mjs visual-final-r1 *> ($taskRoot + '/visual-final-build-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Current diagnostic build failed' }
}
foreach ($taskVariant in @('baseline','final')) {
  & node tools/qa-7a-visual.mjs ('visual-' + $taskVariant + '-r1') ('replay-' + $taskVariant + '-' + $Revision) replay *> ($taskRoot + '/replay-' + $taskVariant + '-' + $Revision + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Native replay $taskVariant failed" }
  Write-Output "Completed native replay $taskVariant"
}
& node tools/verify-7a-pairs.mjs ('replay-baseline-' + $Revision) ('replay-final-' + $Revision) *> ($taskRoot + '/paired-replay.log')
if ($LASTEXITCODE -ne 0) { throw 'Native paired states differ' }
foreach ($taskVariant in @('baseline','final')) {
  & node tools/qa-7a-visual.mjs ('visual-' + $taskVariant + '-r1') ('resources-' + $taskVariant + '-' + $Revision) resources *> ($taskRoot + '/resources-' + $taskVariant + '-' + $Revision + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Two rounds of map resource checks failed: $taskVariant" }
  Write-Output "Completed map resource round trips $taskVariant"
}
Write-Output 'Native replay and five-map round trips complete; screenshots still require bounded visual review.'
