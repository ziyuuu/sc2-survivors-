param([switch]$ResumeAfterWeb)
$ErrorActionPreference = 'Stop'
$env:NO_COLOR = '1'
function Invoke-P6Command {
    param([string]$Executable, [string[]]$Arguments, [string]$Log)
    Write-Output ('P6 release step: ' + $Log)
    & $Executable @Arguments *> $Log
    if ($LASTEXITCODE -ne 0) { throw ('P6 release step failed: ' + $Log + ' (exit ' + $LASTEXITCODE + ')') }
}
if (-not $ResumeAfterWeb) {
Invoke-P6Command 'npm' @('test') 'reports/local/p6-regression-release.log'
Invoke-P6Command 'npm' @('run','typecheck') 'reports/local/p6-typecheck-release.log'
Invoke-P6Command 'node' @('tools/generate-m2-talents.mjs','--check') 'reports/local/p6-talent-generation-release.log'
Invoke-P6Command 'npm' @('run','docs:check') 'reports/local/p6-data-docs-release.log'
Invoke-P6Command 'npm' @('run','build:web') 'reports/local/p6-build-web-release.log'
$env:SC2_DEMO_OUTPUT = 'dist/SC2-Survivors-P6-20261006.html'
Invoke-P6Command 'node' @('tools/build-demo.mjs') 'reports/local/p6-build-offline-release.log'
Invoke-P6Command 'node' @('--import','tsx','tools/prepare-p6-handoff.mts','--refresh') 'reports/local/p6-handoff-prepare-release.log'
Invoke-P6Command 'node' @('tools/qa-p6-handoff.mjs') 'reports/local/p6-handoff-update-release.log'
Invoke-P6Command 'node' @('tools/qa-p6-preservation.mjs') 'reports/local/p6-preservation-release.log'
Invoke-P6Command 'node' @('--import','tsx','tools/qa-p6-offline.mts') 'reports/local/p6-offline-release.log'
Invoke-P6Command 'node' @('--import','tsx','tools/qa-p6-web-cache.mjs','--output','reports/local/p6-20261006/web-cache-final') 'reports/local/p6-web-cache-release.log'
} else {
    $p6ResumeWeb = Get-Content -LiteralPath 'reports/local/p6-20261006/web-cache-final/report.json' -Raw | ConvertFrom-Json
    $p6ResumeOffline = Get-Content -LiteralPath 'reports/local/p6-20261006/offline-final/offline.json' -Raw | ConvertFrom-Json
    if ($p6ResumeWeb.failure -or $p6ResumeWeb.errors.Count -ne 0 -or $p6ResumeOffline.failure -or $p6ResumeOffline.checks.Count -ne 6) { throw 'Resume requires the successful final Web and six offline groups' }
}
Invoke-P6Command 'node' @('--import','tsx','tools/qa-p6-production-performance.mjs') 'reports/local/p6-production-performance.log'
Invoke-P6Command 'pwsh' @('-NoProfile','-File','tools/qa-p6-package.ps1') 'reports/local/p6-package-release.log'
Invoke-P6Command 'node' @('--import','tsx','tools/qa-p6-collect.mts') 'reports/local/p6-evidence-index.log'
Invoke-P6Command 'node' @('tools/qa-p6-finalize.mjs') 'reports/local/p6-finalize.log'
Invoke-P6Command 'node' @('tools/qa-p6-closeout.mjs') 'reports/local/p6-closeout.log'
Invoke-P6Command 'node' @('tools/check-mvp-plan.mjs') 'reports/local/p6-plan-release.log'
Write-Output 'P6 release checks finished.'
