$ErrorActionPreference = 'Stop'
$cinematicRoot = 'reports/local/cinematic-preload-20261012'
foreach ($cinematicIndex in 1..3) {
    foreach ($cinematicVersion in @('before', 'after')) {
        $cinematicWeb = if ($cinematicVersion -eq 'before') { "$cinematicRoot/baseline-web" } else { 'dist/web' }
        node --import tsx tools/qa-cinematic-profile.mts "$cinematicRoot/timing-$cinematicVersion-$cinematicIndex" terran --fixed-seed "--web=$cinematicWeb"
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}
foreach ($cinematicDwell in @(15000, 30000)) {
    node --import tsx tools/qa-cinematic-profile.mts "$cinematicRoot/timing-dwell-$cinematicDwell" terran --fixed-seed "--dwell=$cinematicDwell"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node --import tsx tools/qa-cinematic-profile.mts "$cinematicRoot/timing-optional-complete" terran --fixed-seed --wait-background
exit $LASTEXITCODE
