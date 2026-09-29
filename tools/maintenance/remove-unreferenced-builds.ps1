param([string]$AuditPath = 'reports/local/cleanup-20260929.json', [string]$ResultPath = 'reports/local/cleanup-20260929-result.json')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath '.').Path
$objectRoot = [IO.Path]::GetFullPath((Join-Path $root '.git/lfs/objects')) + [IO.Path]::DirectorySeparatorChar
$audit = Get-Content -LiteralPath $AuditPath -Raw | ConvertFrom-Json
if ((git rev-parse HEAD).Trim() -ne $audit.head) { throw 'HEAD changed since audit' }
$protected = [Collections.Generic.HashSet[string]]::new()
foreach ($line in (git lfs ls-files --all --long)) { [void]$protected.Add($line.Split(' ')[0]) }
foreach ($line in (git lfs ls-files --long)) { [void]$protected.Add($line.Split(' ')[0]) }
[void]$protected.Add((Get-FileHash -LiteralPath 'dist/SC2-Survivors-Demo.html' -Algorithm SHA256).Hash.ToLowerInvariant())
$before = (Get-PSDrive D).Free
$deleted = @()
foreach ($entry in $audit.candidates) {
    $target = [IO.Path]::GetFullPath($entry.path)
    if (-not $target.StartsWith($objectRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Candidate outside object directory' }
    if ($protected.Contains($entry.oid)) { continue }
    $item = Get-Item -LiteralPath $target
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing reparse point' }
    if ($item.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.oid) { throw 'Candidate changed' }
    Remove-Item -LiteralPath $target -Force
    $deleted += $entry
}
$after = (Get-PSDrive D).Free
@{ deleted=$deleted; count=$deleted.Count; logicalBytes=($deleted | Measure-Object bytes -Sum).Sum; freeBefore=$before; freeAfter=$after; actualFreeChange=$after-$before } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ResultPath -Encoding utf8
Get-Content -LiteralPath $ResultPath -Raw | ConvertFrom-Json | Select-Object count,logicalBytes,freeBefore,freeAfter,actualFreeChange | ConvertTo-Json
