#requires -Version 7
param([switch]$ResumeAfterBinding)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskReport = 'reports/local/refraction-science-20261013/final-r2'
$taskHtml = 'dist/SC2-Survivors-Refraction-Science-Final-R2-20261013.html'
if (-not $ResumeAfterBinding) {
& node tools/verify-refraction-inputs.mjs *> ($taskReport + '/formal-binding.log')
if ($LASTEXITCODE -ne 0) { throw 'Formal input binding failed' }
$env:SC2_ENTRY_HTML = $taskHtml
$env:SC2_ENTRY_PACK_REPORT = $taskReport + '/offline-decoder.json'
try {
  & node --expose-gc --import tsx tools/verify-entry-offline.mts *> ($taskReport + '/offline-decoder.log')
  if ($LASTEXITCODE -ne 0) { throw 'Offline decoder failed' }
} finally { Remove-Item Env:SC2_ENTRY_HTML; Remove-Item Env:SC2_ENTRY_PACK_REPORT }
}
foreach ($variant in @('web','offline','missing-refraction','missing-science')) {
  $taskOut = $taskReport + '/formal-' + $variant + '-r2'
  $taskFlags = @('--html=' + $taskHtml)
  if ($variant -eq 'offline') { $taskFlags += '--offline' }
  if ($variant -eq 'missing-refraction') { $taskFlags += @('--missing','--missing-id=combat-fx.mesh.refraction.GuardianShield') }
  if ($variant -eq 'missing-science') { $taskFlags += @('--missing','--missing-id=combat-fx.mesh.Hologram_Death_Large') }
  & node --import tsx tools/qa-combat-formal.mts $taskOut @taskFlags *> ($taskOut + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Formal $variant failed" }
  Write-Output "Completed formal $variant"
}
& node tools/qa-ui-coze-main.mjs --app dist/Refraction-Science-Final-R2-Application-20261013 --out ($taskReport + '/release-package-r1') *> ($taskReport + '/release-package-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Packaged startup failed' }
New-Item -ItemType Directory -Path ($taskReport + '/release-update-r1') | Out-Null
& node tools/qa-current-handoff.mjs --app dist/Refraction-Science-Final-R2-Application-20261013 --baseline reports/local/refraction-science-20261013/baseline-asset-manifest.json --out ($taskReport + '/release-update-r1') *> ($taskReport + '/release-update-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Packaged update failed' }
Write-Output 'Formal and package checks complete. No online operations.'
