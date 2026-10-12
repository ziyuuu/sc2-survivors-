$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'D:\星际'
$jobs = @(
  @('candidate-r14','final-native-terran-r1','native','--race=terran'),
  @('candidate-r14','final-native-zerg-r1','native','--race=zerg'),
  @('candidate-r14','final-native-protoss-r1','native','--race=protoss'),
  @('candidate-r14','final-matrix-r1','matrix'),
  @('candidate-r14','final-lifecycle-r1','lifecycle'),
  @('candidate-r14','final-density-terran-r1','density','--race=terran'),
  @('candidate-r14','final-density-zerg-r1','density','--race=zerg'),
  @('candidate-r14','final-density-protoss-r1','density','--race=protoss'),
  @('candidate-r14','final-edges-r1','edges'),
  @('candidate-r14','final-models-r1','models'),
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
