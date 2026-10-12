$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'D:\星际'
# R3 changes only ground-projection tile transforms. Keep prior evidence at its
# actual build; recapture every affected native family and all shared layouts.
$jobs = @(
  @('candidate-r19','projection-native-r1','native','--groups=mode-tank,baneling,ravager,ultralisk'),
  @('candidate-r19','final-models-r2','models'),
  @('candidate-r19','final-matrix-r3','matrix'),
  @('candidate-r19','final-density-terran-r3','density','--race=terran'),
  @('candidate-r19','final-density-zerg-r2','density','--race=zerg')
)
foreach ($job in $jobs) {
  $log = 'reports/local/combat-effects-20261012/' + $job[1] + '.log'
  if (Test-Path -LiteralPath $log) { throw "Evidence exists: $log" }
  & node tools/qa-combat-visual.mjs @job *> $log
  if ($LASTEXITCODE -ne 0) { throw "QA failed: $($job[1])" }
  Write-Output "Completed $($job[1])"
}
& node tools/qa-combat-witnesses.mjs candidate-r19 final-witnesses-r3 *> reports/local/combat-effects-20261012/final-witnesses-r3.log
if ($LASTEXITCODE -ne 0) { throw 'Witnesses failed' }
& node tools/qa-combat-recording.mjs candidate-r19 final-recordings-r2 *> reports/local/combat-effects-20261012/final-recordings-r2.log
if ($LASTEXITCODE -ne 0) { throw 'Recordings failed' }
& node tools/qa-combat-video-review.mjs final-recordings-r2 video-review-r2 *> reports/local/combat-effects-20261012/video-review-r2.log
if ($LASTEXITCODE -ne 0) { throw 'Video decode failed' }
Write-Output 'R3 affected visual QA complete.'
