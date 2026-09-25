param([switch]$Execute)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath 'D:\星际').Path
$backupRoot = 'C:\Users\zyuu\AppData\Local\Temp\sc2-v26-before-build-20260924'
$sourceRoot = 'C:\Users\zyuu\AppData\Local\Temp\sc2-v26-assets'
$reportRoot = Join-Path $projectRoot 'reports\local'
$plan = Get-Content -LiteralPath (Join-Path $reportRoot 'cleanup-plan-20260924.json') -Raw | ConvertFrom-Json
$resources = Get-Content -LiteralPath (Join-Path $reportRoot 'cleanup-resource-candidates.json') -Raw | ConvertFrom-Json
$restore = Get-Content -LiteralPath (Join-Path $reportRoot 'cleanup-source-restore-audit.json') -Raw | ConvertFrom-Json
$currentBuild = Join-Path $projectRoot 'dist\SC2-Survivors-Demo.html'
$expectedBuildHash = 'aa6be4b7a401125376aa93d19a90c47ae1b2adad625869569b13a159a8b004db'
$checkedAncestors = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)

function Assert-ContainedPath([string]$Path, [string[]]$Roots) {
    $absolute = [IO.Path]::GetFullPath($Path)
    $root = $Roots | Where-Object {
        $absolute.Equals($_, [StringComparison]::OrdinalIgnoreCase) -or
        $absolute.StartsWith($_.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)
    } | Select-Object -First 1
    if (-not $root) { throw "Path escapes the audited scope: $absolute" }
    $ancestor = $absolute
    while ($ancestor -and $ancestor.Length -ge $root.Length) {
        if (-not $checkedAncestors.Add($ancestor)) { break }
        if (Test-Path -LiteralPath $ancestor) {
            $item = Get-Item -LiteralPath $ancestor -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point is not permitted: $ancestor" }
        }
        $ancestor = [IO.Path]::GetDirectoryName($ancestor)
    }
    return $absolute
}

$allowedDeletionRoots = @(
    $backupRoot,
    "$projectRoot\public\assets",
    "$projectRoot\dist\assets",
    "$projectRoot\reports\local",
    "$projectRoot\.git\lfs\tmp",
    "$projectRoot\.cache\performance-2059e87ad05a2cee432efe6a724c1c76a7ff5e60",
    "$projectRoot\.cache\performance-521a87a61b34f2b57946ffc71a52b9886639ac32",
    "$projectRoot\.cache\performance-cca5e344fd9231eb0243d785eac22b3397e6de7d"
)
$files = [System.Collections.Generic.List[object]]::new()
foreach ($entry in $plan.Files) { $files.Add($entry) }
foreach ($entry in @($resources.public) + @($resources.dist)) {
    if ($entry.tracked) { throw "Tracked resource cannot be deleted: $($entry.path)" }
    $files.Add([pscustomobject]@{Path=$entry.path; Bytes=$entry.bytes; ModifiedUtc=$null; Reason=$entry.reason})
}
$runtime = Get-Content -LiteralPath (Join-Path $reportRoot 'runtime-assets.json') -Raw | ConvertFrom-Json
$protected = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($entry in $runtime) {
    if ($entry.status -ne 'available') { continue }
    [void]$protected.Add([IO.Path]::GetFullPath((Join-Path $projectRoot $entry.packedFile)))
    [void]$protected.Add([IO.Path]::GetFullPath((Join-Path "$projectRoot\dist" $entry.url)))
}
[void]$protected.Add($currentBuild)
$seen = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($file in $files) {
    $file.Path = Assert-ContainedPath $file.Path $allowedDeletionRoots
    if (-not $seen.Add($file.Path)) { throw "Duplicate cleanup entry: $($file.Path)" }
    if ($protected.Contains($file.Path)) { throw "Current runtime resource cannot be deleted: $($file.Path)" }
    if ($file.Path.StartsWith("$reportRoot\", [StringComparison]::OrdinalIgnoreCase) -and
        [IO.Path]::GetExtension($file.Path) -in @('.json','.md','.ts','.mjs','.ps1')) {
        # The only code candidate here is the obsolete compiled JS in migration-originals/dist.
        throw "Text evidence/source cannot be deleted: $($file.Path)"
    }
    if (-not (Test-Path -LiteralPath $file.Path)) { continue }
    $item = Get-Item -LiteralPath $file.Path -Force
    if ($item.PSIsContainer -or $item.Length -ne $file.Bytes) { throw "Candidate changed since inventory: $($file.Path)" }
}
if ((Get-FileHash -LiteralPath $currentBuild -Algorithm SHA256).Hash -ne $expectedBuildHash) {
    throw 'The current tested playable build changed; stop before cleanup.'
}
if ($restore.invalid.Count -or $restore.collisions.Count -or $restore.extraFiles.Count) { throw 'Source restore audit is not clean.' }
$sourcesAlreadyRestored = -not (Test-Path -LiteralPath $sourceRoot)
foreach ($entry in $restore.restore) {
    $entry.source = Assert-ContainedPath $entry.source @($sourceRoot)
    $entry.destination = Assert-ContainedPath $entry.destination @("$projectRoot\assets\private\m3", "$projectRoot\assets\private\dds")
    if ($sourcesAlreadyRestored) {
        $item = Get-Item -LiteralPath $entry.destination
        if ($item.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $entry.destination -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Previously restored source changed: $($entry.destination)" }
        continue
    }
    if (Test-Path -LiteralPath $entry.destination) { throw "Source destination already exists: $($entry.destination)" }
    $item = Get-Item -LiteralPath $entry.source
    if ($item.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $entry.source -Algorithm SHA256).Hash -ne $entry.sha256) {
        throw "Source verification failed before moving: $($entry.source)"
    }
}
$summary = [pscustomobject]@{
    CandidateFiles=$files.Count; CandidateBytes=($files | Measure-Object Bytes -Sum).Sum
    RestoreFiles=$restore.restore.Count; RestoreBytes=$restore.bytes; Execute=[bool]$Execute
}
$summary | ConvertTo-Json
if (-not $Execute) { exit 0 }

$receipt = [ordered]@{StartedAt=[DateTime]::UtcNow.ToString('o'); Deleted=@(); Skipped=@(); Restored=@(); EmptyDirectoriesRemoved=@(); PreservedBuildSha256=$expectedBuildHash}
try {
    # Stop only stale, closed LFS fragments. Completed objects, refs and index are outside the allowed root.
    $lfsActive = @(Get-CimInstance Win32_Process -Filter "Name = 'git-lfs.exe'").Count -gt 0
    foreach ($file in $files) {
        if (-not (Test-Path -LiteralPath $file.Path)) {
            $receipt.Skipped += [pscustomobject]@{Path=$file.Path;Reason='Already absent before deletion'}; continue
        }
        $item = Get-Item -LiteralPath $file.Path -Force
        if ($item.Length -ne $file.Bytes -or ($file.ModifiedUtc -and $item.LastWriteTimeUtc -ne ([DateTime]$file.ModifiedUtc).ToUniversalTime())) {
            $receipt.Skipped += [pscustomobject]@{Path=$file.Path;Reason='Changed after inventory'}; continue
        }
        if ($file.Path.StartsWith("$projectRoot\.git\lfs\tmp\", [StringComparison]::OrdinalIgnoreCase)) {
            if ($lfsActive -or $item.LastWriteTimeUtc -ge [DateTime]::UtcNow.AddMinutes(-10)) {
                $receipt.Skipped += [pscustomobject]@{Path=$file.Path;Reason='LFS activity or recent file'}; continue
            }
            try { $handle=[IO.File]::Open($file.Path,'Open','ReadWrite','None'); $handle.Dispose() }
            catch { $receipt.Skipped += [pscustomobject]@{Path=$file.Path;Reason='File is open'}; continue }
        }
        Remove-Item -LiteralPath $file.Path -Force
        $receipt.Deleted += [pscustomobject]@{Path=$file.Path;Bytes=$file.Bytes;Reason=$file.Reason}
    }
    if (-not $sourcesAlreadyRestored) {
    $sourceManifest = Join-Path $sourceRoot 'relocated-sources.json'
    $sourceHistory = Join-Path $reportRoot 'source-relocation-history-20260924.json'
    Copy-Item -LiteralPath $sourceManifest -Destination $sourceHistory
    if ((Get-FileHash -LiteralPath $sourceManifest -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $sourceHistory -Algorithm SHA256).Hash) { throw 'Source history copy failed verification.' }
    foreach ($entry in $restore.restore) {
        Move-Item -LiteralPath $entry.source -Destination $entry.destination
        if ((Get-FileHash -LiteralPath $entry.destination -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Moved source hash mismatch: $($entry.destination)" }
        $receipt.Restored += [pscustomobject]@{Source=$entry.source;Destination=$entry.destination;Bytes=$entry.bytes;Sha256=$entry.sha256}
    }
    Remove-Item -LiteralPath $sourceManifest
    }
    # Remove only verified empty directories, never recursive directory deletion.
    foreach ($root in @($backupRoot,$sourceRoot)) {
        [void](Assert-ContainedPath $root @($backupRoot,$sourceRoot))
        if (-not (Test-Path -LiteralPath $root)) { continue }
        foreach ($dir in Get-ChildItem -LiteralPath $root -Directory -Recurse -Force | Sort-Object { $_.FullName.Length } -Descending) {
            [void](Assert-ContainedPath $dir.FullName @($root))
            if (@(Get-ChildItem -LiteralPath $dir.FullName -Force).Count -eq 0) { Remove-Item -LiteralPath $dir.FullName; $receipt.EmptyDirectoriesRemoved += $dir.FullName }
        }
        if (@(Get-ChildItem -LiteralPath $root -Force).Count -eq 0) { Remove-Item -LiteralPath $root; $receipt.EmptyDirectoriesRemoved += $root }
    }
    $receipt.FinalBuildSha256 = (Get-FileHash -LiteralPath $currentBuild -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($receipt.FinalBuildSha256 -ne $expectedBuildHash) { throw 'Playable build hash changed unexpectedly.' }
    $receipt.CompletedAt = [DateTime]::UtcNow.ToString('o')
} finally {
    $receipt.DeletedBytes = ($receipt.Deleted | Measure-Object Bytes -Sum).Sum
    $receipt.DrivesAfter = @(Get-PSDrive C,D | Select-Object Name,Used,Free)
    $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $reportRoot 'cleanup-receipt-20260924.json') -Encoding utf8
    [pscustomobject]@{DeletedFiles=$receipt.Deleted.Count;DeletedBytes=$receipt.DeletedBytes;Skipped=$receipt.Skipped.Count;RestoredFiles=$receipt.Restored.Count;CompletedAt=$receipt.CompletedAt} | ConvertTo-Json
}
