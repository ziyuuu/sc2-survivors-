#requires -Version 7
param([ValidatePattern('^R[1-9][0-9]*$')][string]$Revision='R1',[switch]$ResumeAfterWeb,[switch]$WebHtmlOnly)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskReport = 'reports/local/7a-20261013/final-' + $Revision.ToLowerInvariant()
$taskApplication = 'dist/MVP7A-Final-' + $Revision + '-Application-20261013'
if (-not $ResumeAfterWeb) {
  if (Test-Path -LiteralPath $taskReport) { throw 'Final evidence already exists' }
  New-Item -ItemType Directory -Path $taskReport | Out-Null
  & npm.cmd test *> ($taskReport + '/tests.log')
  if ($LASTEXITCODE -ne 0) { throw 'Regression tests failed' }
  & npm.cmd run typecheck *> ($taskReport + '/typecheck.log')
  if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed' }
  & npm.cmd run docs:check *> ($taskReport + '/docs-check.log')
  if ($LASTEXITCODE -ne 0) { throw 'Data docs failed' }
  & npm.cmd run build:web *> ($taskReport + '/build-web.log')
  if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
} else {
  if (-not (Test-Path -LiteralPath ($taskReport + '/typecheck.log'))) { throw 'No previous checks' }
  if (-not (Test-Path -LiteralPath 'dist/web/web-release.json')) { throw 'No complete Web build' }
}
$taskPreviousDemoOutput = $env:SC2_DEMO_OUTPUT
$env:SC2_DEMO_OUTPUT = 'dist/SC2-Survivors-MVP7A-Final-' + $Revision + '-20261013.html'
try {
  & node tools/build-demo.mjs *> ($taskReport + '/build-html.log')
  if ($LASTEXITCODE -ne 0) { throw 'Named offline build failed' }
} finally {
  if ($null -ne $taskPreviousDemoOutput) { $env:SC2_DEMO_OUTPUT = $taskPreviousDemoOutput }
  else { Remove-Item Env:SC2_DEMO_OUTPUT }
}
if ($WebHtmlOnly) {
  Write-Output 'Actual named Web and offline HTML built; application documentation will be finalized after validation.'
  return
}
& node --import tsx tools/prepare-current-handoff.mts --out $taskApplication --performance --ui-fidelity --coze --opening --battle-ui --mvp7a *> ($taskReport + '/prepare-app.log')
if ($LASTEXITCODE -ne 0) { throw 'Application build failed' }
& python tools/package-verified-application.py --app $taskApplication --report ($taskReport + '/zip-release.json') *> ($taskReport + '/zip.log')
if ($LASTEXITCODE -ne 0) { throw 'ZIP failed' }
Write-Output 'Named Web, offline HTML and application built; Current and local mirrors await preflight.'
