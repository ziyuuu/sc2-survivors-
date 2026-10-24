param([switch]$Execute, [int]$LimitGroups = 0, [int]$SkipGroups = 0)
$ErrorActionPreference = 'Stop'
$boundary = [IO.Path]::GetFullPath('D:\星际')
$runRoot = Join-Path $boundary 'reports\local\disk-cleanup-20261021\artifact-pass'
$plan = Get-Content -LiteralPath (Join-Path $runRoot 'link-plan.json') -Raw | ConvertFrom-Json
$validatedDirectories = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$log = [Collections.Generic.List[object]]::new()
$errors = [Collections.Generic.List[object]]::new()
$before = @(Get-PSDrive -Name C,D | Select-Object Name,Used,Free)
$started = (Get-Date).ToString('o')
$suffix = if ($Execute) { if ($LimitGroups -gt 0) { 'pilot' } else { 'execute' } } else { 'dry-run' }
$journal = Join-Path $runRoot ('hardlinks-' + $suffix + '.jsonl')
if (Test-Path -LiteralPath $journal) { throw "Existing journal must not be overwritten: $journal" }

function Assert-Parent([string]$directory) {
    if ($validatedDirectories.Contains($directory)) { return }
    $cursor = $directory
    while ($true) {
        if (-not ($cursor.Equals($boundary, [StringComparison]::OrdinalIgnoreCase) -or $cursor.StartsWith($boundary + '\', [StringComparison]::OrdinalIgnoreCase))) { throw "Outside boundary: $cursor" }
        $item = Get-Item -LiteralPath $cursor -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Reparse directory: $cursor" }
        if ($cursor.Equals($boundary, [StringComparison]::OrdinalIgnoreCase)) { break }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
    }
    [void]$validatedDirectories.Add($directory)
}
function Assert-Asset([string]$asset, [string]$hash, [long]$size) {
    $full = [IO.Path]::GetFullPath($asset)
    if (-not $full.Equals($asset, [StringComparison]::OrdinalIgnoreCase)) { throw "Noncanonical path: $asset" }
    $allowed = $false
    foreach ($relative in @('reports\local', 'dist', 'preview')) {
        if ($full.StartsWith((Join-Path $boundary $relative) + '\', [StringComparison]::OrdinalIgnoreCase)) { $allowed = $true }
    }
    if (-not $allowed) { throw "Outside generated outputs: $asset" }
    if ([IO.Path]::GetFileName($full) -notmatch ('^' + $hash + '\.(glb|png|webp|ogg|mp3|wav|bin)$')) { throw "Not content-addressed: $asset" }
    Assert-Parent ([IO.Path]::GetDirectoryName($full))
    $item = Get-Item -LiteralPath $full -Force
    if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Not a regular asset: $asset" }
    if ($item.Length -ne $size) { throw "Size changed: $asset" }
    return $full
}
function Assert-Hash([string]$asset, [string]$expected) {
    $actual = (Get-FileHash -LiteralPath $asset -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw "Hash changed: $asset" }
}

try {
    $groups = @($plan.groups)
    if ($SkipGroups -gt 0) { $groups = @($groups | Select-Object -Skip $SkipGroups) }
    if ($LimitGroups -gt 0) { $groups = @($groups | Select-Object -First $LimitGroups) }
    $groupIndex = 0
    foreach ($group in $groups) {
        $canonical = Assert-Asset $group.canonical $group.sha256 $group.bytes
        if ($Execute) { Assert-Hash $canonical $group.sha256 }
        foreach ($target in $group.targets) {
            $target = Assert-Asset $target $group.sha256 $group.bytes
            if ($Execute) {
                Assert-Hash $target $group.sha256
                $temporary = $target + '.dedup-' + [guid]::NewGuid().ToString('N')
                $backup = $target + '.backup-' + [guid]::NewGuid().ToString('N')
                # Both generated names are adjacent to an already validated target.
                if ([IO.Path]::GetDirectoryName($temporary) -ne [IO.Path]::GetDirectoryName($target) -or [IO.Path]::GetDirectoryName($backup) -ne [IO.Path]::GetDirectoryName($target)) { throw 'Unexpected adjacent path' }
                [void](New-Item -ItemType HardLink -Path $temporary -Value $canonical)
                [IO.File]::Replace($temporary, $target, $backup)
                try { Assert-Hash $target $group.sha256 }
                catch {
                    [IO.File]::Replace($backup, $target, $temporary)
                    throw
                }
                Remove-Item -LiteralPath $backup -Force
            }
            $entry = [ordered]@{path=$target; canonical=$canonical; sha256=$group.sha256; bytes=$group.bytes; action=$(if($Execute){'hardlinked'}else{'validated'}); at=(Get-Date).ToString('o')}
            $log.Add($entry)
            $entry | ConvertTo-Json -Compress | Add-Content -LiteralPath $journal -Encoding utf8
        }
        $groupIndex++
        if ($groupIndex % 100 -eq 0) { Write-Output "Verified groups: $groupIndex/$($groups.Count); paths: $($log.Count)" }
    }
} catch {
    $errors.Add([ordered]@{message=$_.Exception.Message; position=$_.InvocationInfo.PositionMessage; stack=$_.ScriptStackTrace; at=(Get-Date).ToString('o')})
} finally {
    $result = [ordered]@{started=$started; finished=(Get-Date).ToString('o'); execute=[bool]$Execute; limitGroups=$LimitGroups; skipGroups=$SkipGroups; completedPaths=$log.Count; before=$before; after=@(Get-PSDrive -Name C,D | Select-Object Name,Used,Free); errors=@($errors.ToArray()); method='Atomic File.Replace with adjacent backup; delete backup only after SHA-256 passes; path/ancestor/regular-file checks.'}
    $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $runRoot ('hardlinks-' + $suffix + '.json')) -Encoding utf8
    $result | ConvertTo-Json -Depth 4
}
if ($errors.Count -gt 0) { throw $errors[0].message }
