param([ValidatePattern('^r[0-9]+$')][string]$Variant = 'r7')
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'reports/local/performance-d04-complete-20261021'))
$offlineRoot = [IO.Path]::GetFullPath((Join-Path $taskRoot ('offline-' + $Variant)))
if (-not $offlineRoot.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected output root' }
$binding = Get-Content -LiteralPath (Join-Path $offlineRoot 'build-inputs.json') -Raw | ConvertFrom-Json
$target = [IO.Path]::GetFullPath((Join-Path (Get-Location) $binding.html.file))
if (-not $target.StartsWith($offlineRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected output path' }
$file = Get-Item -LiteralPath $target
foreach ($item in @((Get-Item -LiteralPath $taskRoot), (Get-Item -LiteralPath $offlineRoot), $file)) { if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse target rejected' } }
$active = @(Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object { $_.CommandLine -and ($_.CommandLine.Contains($taskRoot) -or $_.CommandLine.Contains($taskRoot.Replace('\','/'))) })
if ($active.Count) { throw 'Task browser still active' }
$sha = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
if ($sha -ne $binding.html.sha256 -or $file.Length -ne $binding.html.bytes) { throw 'Output changed' }
$verification = & node tools/restore-performance-d04-complete-offline.mjs verify $Variant
if ($LASTEXITCODE -ne 0) { throw 'Reconstruction failed' }
$bytes = $file.Length
Remove-Item -LiteralPath $target
$record = [ordered]@{target=$target;bytes=$bytes;sha256=$sha;reconstructionVerified=$true;verification=$verification;removed=(-not (Test-Path -LiteralPath $target));time=[DateTime]::UtcNow.ToString('o');retained=@($binding.reconstruction.prefix,$binding.reconstruction.suffix,$binding.source.file)}
[IO.File]::WriteAllText((Join-Path $offlineRoot 'cleanup.json'), ($record | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$record | ConvertTo-Json -Compress -Depth 8
