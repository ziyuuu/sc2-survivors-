$ErrorActionPreference = 'Stop'
$taskWorkspace = [IO.Path]::GetFullPath('D:\星际')
if ([IO.Path]::GetFullPath((Get-Location).Path) -cne $taskWorkspace) { throw 'Unexpected workspace' }
$taskReportPath = Join-Path $taskWorkspace 'reports\qa\t01-set-layout-20261025.json'
$taskReport = Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json
if ($taskReport.status -ne 'completed-limited-set-description-update') { throw 'UI work not verified' }
$taskKeep = [IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskReport.delivery.file))
if ($taskKeep -cne (Join-Path $taskWorkspace 'reports\local\t01-20261024\offline-r15\T01-综合检测.html')) { throw 'Unexpected current delivery' }
if ((Get-FileHash -LiteralPath $taskKeep -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256) { throw 'Current delivery hash mismatch' }
$taskActive = Get-Content -LiteralPath (Join-Path $taskWorkspace 'reports\local\t01-20261024\active-source.json') -Raw | ConvertFrom-Json
if ([IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskActive.offlineDonor.out)) -cne $taskKeep) { throw 'Donor still references an old version' }
$taskTargets = @()
$taskFilesRemoved = 0
$taskBytesRemoved = [long]0
foreach ($taskRelative in @('.cache\t01-set-layout-20261025','reports\local\t01-20261024\offline-r14')) {
 $taskTarget = [IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskRelative))
 if (-not $taskTarget.StartsWith($taskWorkspace + '\',[StringComparison]::OrdinalIgnoreCase) -or $taskKeep.StartsWith($taskTarget + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup boundary' }
 if (-not (Test-Path -LiteralPath $taskTarget)) { continue }
 if ((Resolve-Path -LiteralPath $taskTarget).Path -cne $taskTarget) { throw 'Resolved target mismatch' }
 if ((Get-Item -LiteralPath $taskTarget -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unexpected root link' }
 $taskChildren = @(Get-ChildItem -LiteralPath $taskTarget -Force -Recurse)
 if (@($taskChildren | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count -gt 0) { throw 'Unexpected nested link' }
 foreach ($taskFile in @($taskChildren | Where-Object { -not $_.PSIsContainer })) { $taskFilesRemoved++; $taskBytesRemoved += $taskFile.Length }
 $taskTargets += $taskTarget
}
foreach ($taskTarget in $taskTargets) { Remove-Item -LiteralPath $taskTarget -Recurse -Force; if (Test-Path -LiteralPath $taskTarget) { throw 'Cleanup incomplete' } }
if ((Get-FileHash -LiteralPath $taskKeep -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256) { throw 'Current delivery changed' }
$taskReport.retention.cleanupPending = $false
$taskReport.retention | Add-Member -NotePropertyName removedFiles -NotePropertyValue $taskFilesRemoved -Force
$taskReport.retention | Add-Member -NotePropertyName removedLogicalBytes -NotePropertyValue $taskBytesRemoved -Force
$taskReport.retention | Add-Member -NotePropertyName retainedCurrentHtmlVerified -NotePropertyValue $true -Force
$taskReport | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath $taskReportPath -Encoding utf8
$taskGalleryPath = Join-Path $taskWorkspace 'reports\qa\t01-gallery-20261025.json'
$taskGallery = Get-Content -LiteralPath $taskGalleryPath -Raw | ConvertFrom-Json
$taskGallery.retention = $taskReport.retention
$taskGallery | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath $taskGalleryPath -Encoding utf8
[pscustomobject]@{RemovedFiles=$taskFilesRemoved;RemovedLogicalBytes=$taskBytesRemoved;CurrentVerified=$true} | ConvertTo-Json
