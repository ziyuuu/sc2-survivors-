$ErrorActionPreference = 'Stop'
$cinematicRoot = 'reports/local/cinematic-preload-20261012/final-r2'
foreach ($cinematicIndex in 1..3) {
    node --import tsx tools/qa-cinematic-profile.mts "$cinematicRoot/timing-after-$cinematicIndex" terran --fixed-seed
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
foreach ($cinematicDwell in @(15000, 30000)) {
    node --import tsx tools/qa-cinematic-profile.mts "$cinematicRoot/timing-dwell-$cinematicDwell" terran --fixed-seed "--dwell=$cinematicDwell"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node --import tsx tools/qa-cinematic-profile.mts "$cinematicRoot/timing-optional-complete" terran --fixed-seed --wait-background
exit $LASTEXITCODE
