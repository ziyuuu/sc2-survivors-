#requires -Version 7
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskRoot = 'reports/local/7a-20261013'
foreach ($taskVariant in @('baseline','final')) {
  $taskSource = if ($taskVariant -eq 'baseline') { $taskRoot + '/baseline/source' } else { '.' }
  $taskBuild = $taskRoot + '/profile-' + $taskVariant + '-build-r1'
  & node tools/build-7a-diagnostic.mjs ('--source=' + $taskSource) ('--out=' + $taskBuild) *> ($taskBuild + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Diagnostic build failed: $taskVariant" }
  $taskRun = 'profile-' + $taskVariant + '-gpu-memory-r1'
  & node tools/qa-7a-loading.mjs ('--web=' + $taskBuild) ('--out=' + $taskRoot + '/' + $taskRun) --shader=full --gpu --profile --process-memory --menu-probe --seconds=10 *> ($taskRoot + '/' + $taskRun + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Diagnostic profile failed: $taskVariant" }
  & node tools/analyze-7a-menu.mjs $taskRun *> ($taskRoot + '/' + $taskRun + '/menu-summary.log')
  if ($LASTEXITCODE -ne 0) { throw "Menu attribution failed: $taskVariant" }
  Write-Output "Completed separate GPU/memory/CPU diagnostic: $taskVariant"
}
& node tools/qa-7a-loading.mjs --html=dist/SC2-Survivors-MVP7A-Final-R1-20261013.html ('--out=' + $taskRoot + '/final-offline-profile-r1') --profile --seconds=10 *> ($taskRoot + '/final-offline-profile-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Actual offline profile failed' }
foreach ($taskVariant in @('baseline','final')) {
  & node tools/analyze-7a-offline-cpu.mjs $taskVariant ($taskVariant + '-offline-profile-r1') *> ($taskRoot + '/cpu-source-' + $taskVariant + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Exact offline CPU source attribution failed: $taskVariant" }
}
Write-Output 'Separate diagnostic profiles complete. No diagnostic timings enter the formal A/B acceptance series.'
