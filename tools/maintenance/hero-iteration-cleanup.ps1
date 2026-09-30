param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if ($projectRoot -ne 'D:\星际') { throw 'Unexpected workspace' }
Set-Location -LiteralPath $projectRoot
$relativeTargets = @(
 'reports/local/race-fun-cache/profile-1790666876032',
 'reports/local/race-fun-cache/normal-profile-1790667141877',
 '.cache/race-fun-update-check', '.cache/race-fun-final-update',
 '.git/lfs/objects/4d/d7/4dd7993017e19fde799439df3714dcc44c07c94b31144c8a7c2408a171914b90',
 '.git/lfs/objects/59/f9/59f9e19e0881a9ac5fdf9ae5fba2a2e9b9d845f4e9c7637522d880990590c7a3',
 '.git/lfs/objects/93/8d/938d1b68047591e67acddc185fec8d05b1b0fd18fa9971b9de0e0f4b693c2911'
)
$index = @(git diff --cached --name-only)
if ($LASTEXITCODE -ne 0 -or $index.Count -gt 0) { throw 'Index changed; repeat audit' }
$refs = (git lfs ls-files --all --long) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'LFS reference audit failed' }
$objects = @(git rev-list --all --reflog --objects -- dist/SC2-Survivors-Demo.html)
if ($LASTEXITCODE -ne 0) { throw 'Reflog audit failed' }
$pointers = ''
foreach ($line in $objects) {
 $oid = ($line -split ' ')[0]
 $size = git cat-file -s $oid
 if ($LASTEXITCODE -ne 0) { throw 'Object audit failed' }
 if ([long]$size -lt 1024) { $pointers += (git cat-file -p $oid) -join "`n" }
}
$processes = @(Get-CimInstance Win32_Process)
$before = [IO.DriveInfo]::new('D:\').AvailableFreeSpace
$items = @()
foreach ($relative in $relativeTargets) {
 $path = [IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
 if (-not $path.StartsWith($projectRoot + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Path escaped workspace' }
 if (-not (Test-Path -LiteralPath $path)) { continue }
 $entry = Get-Item -LiteralPath $path -Force
 if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse target rejected' }
 if ($relative.StartsWith('.git/')) {
  $hash = $entry.Name
  if ($refs.Contains($hash) -or $pointers.Contains($hash)) { throw "Referenced object: $hash" }
  if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash) { throw 'Object hash mismatch' }
  $bytes = $entry.Length
 } else {
  if ($processes | Where-Object { $_.CommandLine -and ($_.CommandLine.Contains($entry.Name) -or $_.CommandLine.Contains($path)) }) { throw "Active test directory: $path" }
  $children = @(Get-ChildItem -LiteralPath $path -Force -Recurse)
  if ($children | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Nested reparse rejected' }
  $bytes = ($children | Where-Object { -not $_.PSIsContainer } | Measure-Object -Property Length -Sum).Sum
 }
 $items += [pscustomobject]@{path=$path;bytes=[long]$bytes;directory=$entry.PSIsContainer;deleted=$false}
}
if ($Apply) {
 foreach ($item in $items) {
  if ($item.directory) { Remove-Item -LiteralPath $item.path -Recurse -Force }
  else { Remove-Item -LiteralPath $item.path -Force }
  $item.deleted = -not (Test-Path -LiteralPath $item.path)
 }
}
$report = [pscustomobject]@{time=[DateTime]::UtcNow.ToString('o');applied=[bool]$Apply;before=$before;after=[IO.DriveInfo]::new('D:\').AvailableFreeSpace;items=$items}
$outDir = Join-Path $projectRoot 'reports/local/hero-iteration'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outDir 'cleanup.json') -Encoding utf8
$report | ConvertTo-Json -Depth 5
