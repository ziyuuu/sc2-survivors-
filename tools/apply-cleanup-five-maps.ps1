$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path -LiteralPath 'D:\星际').Path.TrimEnd('\')
$planFile = Join-Path $workspace 'reports/local/cleanup-five-maps-20261006/cleanup-plan.json'
$plan = Get-Content -LiteralPath $planFile -Raw | ConvertFrom-Json
if ($plan.root -ne $workspace) { throw 'Cleanup workspace differs' }
function Protected-UI([string]$relative) {
 return ($relative -match '(^|/)(ui|ui-[^/]*|hud-[^/]*|[^/]*-ui)(/|$)' -or $relative -like 'preview/*' -or $relative -like '*/preview/*' -or $relative -like 'public/assets/icons/*')
}
function Checked-Path([string]$relative) {
 if ($relative -notmatch '^(\.cache|dist|reports/local|public/assets|test-results|playwright-report)/' -or (Protected-UI $relative)) { throw "Unapproved cleanup path: $relative" }
 $absolute = [IO.Path]::GetFullPath((Join-Path $workspace $relative))
 if (-not $absolute.StartsWith($workspace + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Cleanup path leaves workspace: $absolute" }
 return $absolute
}
# Validate the complete resolved allowlist before any deletion; never follow links.
$checked = foreach ($entry in $plan.files) {
 $absolute = Checked-Path $entry.path
 $item = Get-Item -LiteralPath $absolute -Force
 if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.Length -ne $entry.bytes) { throw "Cleanup candidate changed: $absolute" }
 [PSCustomObject]@{ Path = $absolute; Bytes = $entry.bytes }
}
$checkedLinks = foreach ($entry in $plan.links) {
 $absolute = Checked-Path $entry.path
 $item = Get-Item -LiteralPath $absolute -Force
 if (-not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Expected junction or symbolic link' }
 $absolute
}
$freeBefore = (Get-PSDrive -Name D).Free
$removed = 0
foreach ($entry in $checked) { Remove-Item -LiteralPath $entry.Path -Force; $removed++ }
foreach ($absolute in $checkedLinks) { Remove-Item -LiteralPath $absolute -Force }
foreach ($relative in $plan.directories) {
 if ($relative -notmatch '^(\.cache|dist|reports/local|public/assets|test-results|playwright-report)/' -or (Protected-UI $relative)) { continue }
 $absolute = Checked-Path $relative
 if ((Test-Path -LiteralPath $absolute) -and -not (Get-ChildItem -LiteralPath $absolute -Force | Select-Object -First 1)) { Remove-Item -LiteralPath $absolute -Force }
}
$freeAfter = (Get-PSDrive -Name D).Free
$result = [PSCustomObject]@{ At = (Get-Date).ToUniversalTime().ToString('o'); RemovedFiles = $removed; LogicalBytes = ($checked | Measure-Object -Property Bytes -Sum).Sum; FreeBefore = $freeBefore; FreeAfter = $freeAfter; ObservedFreeIncrease = $freeAfter - $freeBefore; RemovedLinks = @($checkedLinks).Count }
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $workspace 'reports/local/cleanup-five-maps-20261006/cleanup-result.json') -Encoding utf8
$result | ConvertTo-Json -Compress
