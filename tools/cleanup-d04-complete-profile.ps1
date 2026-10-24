param([Parameter(Mandatory=$true)][string]$Run)
$ErrorActionPreference = 'Stop'
$allowed = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../reports/local/performance-d04-complete-20261021'))
$runPath = [IO.Path]::GetFullPath((Join-Path $allowed $Run))
$target = [IO.Path]::GetFullPath((Join-Path $runPath 'profile'))
if (-not $runPath.StartsWith($allowed + '\', [StringComparison]::OrdinalIgnoreCase) -or $Run -notmatch '^[a-zA-Z0-9-]+$') { throw 'Profile outside the dedicated test scope' }
if (-not (Test-Path -LiteralPath $target)) { return }
$active = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($target) })
if ($active.Count) { throw 'Test browser still running; profile retained' }
$entries = @(Get-Item -LiteralPath $target; Get-ChildItem -LiteralPath $target -Force -Recurse)
if (@($entries | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Refusing profile with reparse points' }
$files = @($entries | Where-Object { -not $_.PSIsContainer })
$record = [ordered]@{target=$target;closed=$true;files=$files.Count;bytes=($files | Measure-Object -Property Length -Sum).Sum;time=(Get-Date).ToUniversalTime().ToString('o')}
Remove-Item -LiteralPath $target -Recurse -Force
$record.removed = -not (Test-Path -LiteralPath $target)
$record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runPath 'profile-cleanup.json') -Encoding utf8
$record | ConvertTo-Json -Compress
