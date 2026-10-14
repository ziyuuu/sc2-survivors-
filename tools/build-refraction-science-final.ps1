#requires -Version 7
param([switch]$ResumeAfterWeb)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskReport = 'reports/local/refraction-science-20261013/final-r2'
if (-not $ResumeAfterWeb) {
if (Test-Path -LiteralPath $taskReport) { throw 'Final evidence directory already exists' }
New-Item -ItemType Directory -Path $taskReport | Out-Null
& npm.cmd run typecheck *> ($taskReport + '/typecheck.log')
if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed' }
& npm.cmd run docs:check *> ($taskReport + '/docs-check.log')
if ($LASTEXITCODE -ne 0) { throw 'Data docs check failed' }
& npm.cmd run build:web *> ($taskReport + '/build-web.log')
if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
} else {
if (-not (Test-Path -LiteralPath ($taskReport + '/typecheck.log'))) { throw 'No preceding build checks' }
if (-not (Test-Path -LiteralPath 'dist/web/web-release.json')) { throw 'No complete preceding Web release' }
}
$env:SC2_DEMO_OUTPUT = 'dist/SC2-Survivors-Refraction-Science-Final-R2-20261013.html'
try {
  & node tools/build-demo.mjs *> ($taskReport + '/build-html.log')
  if ($LASTEXITCODE -ne 0) { throw 'HTML build failed' }
} finally { Remove-Item Env:SC2_DEMO_OUTPUT }
& node --import tsx tools/prepare-current-handoff.mts --out dist/Refraction-Science-Final-R2-Application-20261013 --performance --ui-fidelity --coze --opening --battle-ui --refraction-science *> ($taskReport + '/prepare-app.log')
if ($LASTEXITCODE -ne 0) { throw 'Application build failed' }
& python tools/package-verified-application.py --app dist/Refraction-Science-Final-R2-Application-20261013 --report ($taskReport + '/zip-release.json') *> ($taskReport + '/zip.log')
if ($LASTEXITCODE -ne 0) { throw 'ZIP failed' }
Write-Output 'Named Web / HTML / application candidate built; local mirrors unchanged until acceptance checks.'
