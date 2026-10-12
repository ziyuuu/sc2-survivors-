$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'D:\星际'
$report = 'reports/local/combat-effects-20261012/final-r3'
if (Test-Path -LiteralPath $report) { throw 'R3 evidence directory already exists' }
New-Item -ItemType Directory -Path $report | Out-Null
& npm.cmd test *> ($report + '/regressions.log')
if ($LASTEXITCODE -ne 0) { throw 'Regressions failed' }
& npm.cmd run typecheck *> ($report + '/typecheck.log')
if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed' }
& npm.cmd run docs:check *> ($report + '/docs-check.log')
if ($LASTEXITCODE -ne 0) { throw 'Data docs check failed' }
& npm.cmd run build:web *> ($report + '/build-web.log')
if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
$env:SC2_DEMO_OUTPUT = 'dist/SC2-Survivors-Combat-Effects-Final-R3-20261012.html'
& node tools/build-demo.mjs *> ($report + '/build-html.log')
if ($LASTEXITCODE -ne 0) { throw 'HTML build failed' }
Remove-Item Env:SC2_DEMO_OUTPUT
& node --import tsx tools/prepare-current-handoff.mts --out dist/Combat-Effects-Final-R3-Application-20261012 --performance --ui-fidelity --coze --opening --battle-ui --combat-effects *> ($report + '/prepare-app.log')
if ($LASTEXITCODE -ne 0) { throw 'Application build failed' }
& python tools/package-verified-application.py --app dist/Combat-Effects-Final-R3-Application-20261012 --report ($report + '/zip-release.json') *> ($report + '/zip.log')
if ($LASTEXITCODE -ne 0) { throw 'ZIP failed' }
& node tools/verify-combat-inputs.mjs r3 *> ($report + '/formal-binding.log')
if ($LASTEXITCODE -ne 0) { throw 'Formal input binding failed' }
$env:SC2_ENTRY_HTML = 'dist/SC2-Survivors-Combat-Effects-Final-R3-20261012.html'
$env:SC2_ENTRY_PACK_REPORT = $report + '/offline-decoder.json'
& node --expose-gc --import tsx tools/verify-entry-offline.mts *> ($report + '/offline-decoder.log')
if ($LASTEXITCODE -ne 0) { throw 'Offline decoder failed' }
Remove-Item Env:SC2_ENTRY_HTML
Remove-Item Env:SC2_ENTRY_PACK_REPORT
foreach ($variant in @('web','offline','missing')) {
  $out = $report + '/formal-' + $variant + '-r1'
  $flags = @()
  if ($variant -eq 'offline') { $flags = @('--offline') }
  if ($variant -eq 'missing') { $flags = @('--missing') }
  & node --import tsx tools/qa-combat-formal.mts $out @flags *> ($out + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Formal $variant failed" }
  Write-Output "Completed formal $variant"
}
foreach ($variant in @('web','offline')) {
  $out = $report + '/controls-' + $variant + '-r1'
  $flags = @('--race=terran','--manual')
  if ($variant -eq 'offline') { $flags += '--offline' }
  & node --import tsx tools/qa-combat-controls.mts $out @flags *> ($out + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Controls $variant failed" }
  Write-Output "Completed controls $variant"
}
& node tools/qa-ui-coze-main.mjs --app dist/Combat-Effects-Final-R3-Application-20261012 --out ($report + '/release-package-r1') *> ($report + '/release-package-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Packaged startup failed' }
New-Item -ItemType Directory -Path ($report + '/release-update-r1') | Out-Null
& node tools/qa-current-handoff.mjs --app dist/Combat-Effects-Final-R3-Application-20261012 --baseline reports/local/combat-effects-20261012/baseline-asset-manifest.json --out ($report + '/release-update-r1') *> ($report + '/release-update-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Packaged update failed' }
Write-Output 'Final R3 formal and packaged QA complete.'
