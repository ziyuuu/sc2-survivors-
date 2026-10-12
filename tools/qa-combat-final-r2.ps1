$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'D:\星际'
$jobs = @(
  @('candidate-r16','final-lifecycle-r2','lifecycle'),
  @('candidate-r16','final-native-terran-r2','native','--race=terran'),
  @('candidate-r16','final-matrix-r2','matrix'),
  @('candidate-r16','final-density-terran-r2','density','--race=terran'),
  @('candidate-r16','final-density-zerg-r1','density','--race=zerg'),
  @('candidate-r16','final-density-protoss-r1','density','--race=protoss'),
  @('candidate-r16','final-edges-r1','edges'),
  @('candidate-r16','final-models-r1','models'),
  @('baseline-r4','baseline-native-terran-r1','native','--race=terran'),
  @('baseline-r4','baseline-native-zerg-r1','native','--race=zerg'),
  @('baseline-r4','baseline-native-protoss-r1','native','--race=protoss'),
  @('baseline-r4','baseline-matrix-r1','matrix'),
  @('baseline-r4','baseline-branches-r1','branches'),
  @('baseline-r4','baseline-edges-r1','edges')
)
foreach ($job in $jobs) {
  $log = 'reports/local/combat-effects-20261012/' + $job[1] + '.log'
  if (Test-Path -LiteralPath $log) { throw "Evidence exists: $log" }
  & node tools/qa-combat-visual.mjs @job *> $log
  if ($LASTEXITCODE -ne 0) { throw "QA failed: $($job[1]); see $log" }
  Write-Output "Completed $($job[1])"
}
& node tools/qa-combat-recording.mjs candidate-r16 final-recordings-r1 *> reports/local/combat-effects-20261012/final-recordings-r1.log
if ($LASTEXITCODE -ne 0) { throw 'Native recordings failed' }
& node tools/qa-combat-video-review.mjs final-recordings-r1 video-review-r1 *> reports/local/combat-effects-20261012/video-review-r1.log
if ($LASTEXITCODE -ne 0) { throw 'Video decode review failed' }
foreach ($variant in @('web','offline','missing')) {
  $out = 'reports/local/combat-effects-20261012/final-r2/formal-' + $variant + '-r1'
  $flags = @()
  if ($variant -eq 'offline') { $flags = @('--offline') }
  if ($variant -eq 'missing') { $flags = @('--missing') }
  & node --import tsx tools/qa-combat-formal.mts $out @flags *> ($out + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Formal $variant failed" }
  Write-Output "Completed formal $variant"
}
foreach ($variant in @('web','offline')) {
  $out = 'reports/local/combat-effects-20261012/final-r2/controls-' + $variant + '-r1'
  $flags = @('--race=terran','--manual')
  if ($variant -eq 'offline') { $flags += '--offline' }
  & node --import tsx tools/qa-combat-controls.mts $out @flags *> ($out + '.log')
  if ($LASTEXITCODE -ne 0) { throw "Controls $variant failed" }
  Write-Output "Completed controls $variant"
}
# No game QA browser or build remains during packaged startup/update checks.
& node tools/qa-ui-coze-main.mjs --app dist/Combat-Effects-Final-R2-Application-20261012 --out reports/local/combat-effects-20261012/final-r2/release-package-r1 *> reports/local/combat-effects-20261012/final-r2/release-package-r1.log
if ($LASTEXITCODE -ne 0) { throw 'Packaged startup failed' }
& node tools/qa-current-handoff.mjs --app dist/Combat-Effects-Final-R2-Application-20261012 --baseline reports/local/combat-effects-20261012/baseline-asset-manifest.json --out reports/local/combat-effects-20261012/final-r2/release-update-r1 *> reports/local/combat-effects-20261012/final-r2/release-update-r1.log
if ($LASTEXITCODE -ne 0) { throw 'Packaged update failed' }
Write-Output 'Final R2 serial QA completed.'
