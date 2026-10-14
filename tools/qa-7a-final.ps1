#requires -Version 7
param([switch]$SkipBinding,[switch]$SkipFormal,[switch]$PackageOnly)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskReport = 'reports/local/7a-20261013/final-r1'
$taskHtml = 'dist/SC2-Survivors-MVP7A-Final-R1-20261013.html'
$taskApplication = 'dist/MVP7A-Final-R1-Application-20261013'
if (-not $PackageOnly) {
  if (-not $SkipBinding) {
    & node tools/verify-7a-inputs.mjs *> ($taskReport + '/formal-binding.log')
    if ($LASTEXITCODE -ne 0) { throw 'Source binding failed' }
    $taskOldEntry = $env:SC2_ENTRY_HTML
    $taskOldPackReport = $env:SC2_ENTRY_PACK_REPORT
    $env:SC2_ENTRY_HTML = $taskHtml
    $env:SC2_ENTRY_PACK_REPORT = $taskReport + '/offline-decoder.json'
    try {
      & node --expose-gc --import tsx tools/verify-entry-offline.mts *> ($taskReport + '/offline-decoder.log')
      if ($LASTEXITCODE -ne 0) { throw 'Actual offline decoder failed' }
    } finally {
      if ($null -ne $taskOldEntry) { $env:SC2_ENTRY_HTML = $taskOldEntry } else { Remove-Item Env:SC2_ENTRY_HTML }
      if ($null -ne $taskOldPackReport) { $env:SC2_ENTRY_PACK_REPORT = $taskOldPackReport } else { Remove-Item Env:SC2_ENTRY_PACK_REPORT }
    }
  }
  if (-not $SkipFormal) {
    foreach ($variant in @('web','offline','missing')) {
      $taskOut = $taskReport + '/formal-' + $variant + '-r1'
      $taskFlags = @('--html=' + $taskHtml)
      if ($variant -eq 'offline') { $taskFlags += '--offline' }
      if ($variant -eq 'missing') { $taskFlags += @('--missing','--missing-id=model.scv') }
      & node --import tsx tools/qa-combat-formal.mts $taskOut @taskFlags *> ($taskOut + '.log')
      if ($LASTEXITCODE -ne 0) { throw "Formal $variant failed" }
      Write-Output "Completed formal $variant"
    }
  }
  return
}
& node tools/qa-ui-coze-main.mjs --app $taskApplication --out ($taskReport + '/release-package-r1') *> ($taskReport + '/release-package-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Packaged startup failed' }
New-Item -ItemType Directory -Path ($taskReport + '/release-update-r1') | Out-Null
& node tools/qa-current-handoff.mjs --app $taskApplication --baseline ('reports/local/7a-20261013/baseline/web/' + (Get-Content -LiteralPath reports/local/7a-20261013/baseline/web/web-release.json -Raw | ConvertFrom-Json).manifest) --out ($taskReport + '/release-update-r1') *> ($taskReport + '/release-update-r1.log')
if ($LASTEXITCODE -ne 0) { throw 'Packaged update failed' }
Write-Output 'Four packaged startup modes and bounded update/configuration/rollback checks complete; no online operations.'
