$ErrorActionPreference = 'Stop'
$taskWorkspace = [IO.Path]::GetFullPath('D:\星际')
if ([IO.Path]::GetFullPath((Get-Location).Path) -cne $taskWorkspace) { throw 'Unexpected workspace' }
$taskReportPath = Join-Path $taskWorkspace 'reports\qa\t01-gallery-20261025.json'
$taskReport = Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json
if ($taskReport.status -ne 'delivered-awaiting-user-visual-review') { throw 'Delivery not verified' }
$taskKeep = [IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskReport.delivery.file))
if ($taskKeep -cne (Join-Path $taskWorkspace 'reports\local\t01-20261024\offline-r12\T01-综合检测.html')) { throw 'Unexpected current delivery' }
if ((Get-FileHash -LiteralPath $taskKeep -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256) { throw 'Current delivery hash mismatch' }
$taskActive = Get-Content -LiteralPath (Join-Path $taskWorkspace 'reports\local\t01-20261024\active-source.json') -Raw | ConvertFrom-Json
if ([IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskActive.offlineDonor.out)) -cne $taskKeep) { throw 'Donor still references an old version' }
$taskRelatives = @('.cache\t01-gallery-20261025','reports\local\t01-20261024\offline-r7','reports\local\t01-20261024\offline-r8','reports\local\t01-20261024\offline-r9','reports\local\t01-20261024\offline-r10','reports\local\t01-20261024\offline-r11')
$taskTargets = @()
$taskFileCount = 0
$taskLogicalBytes = [long]0
foreach ($taskRelative in $taskRelatives) {
 $taskTarget = [IO.Path]::GetFullPath((Join-Path $taskWorkspace $taskRelative))
 if (-not $taskTarget.StartsWith($taskWorkspace + '\',[StringComparison]::OrdinalIgnoreCase) -or $taskKeep.StartsWith($taskTarget + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup boundary' }
 if (-not (Test-Path -LiteralPath $taskTarget)) { continue }
 $taskItem = Get-Item -LiteralPath $taskTarget -Force
 if (($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Unexpected root link' }
 $taskChildren = @(Get-ChildItem -LiteralPath $taskTarget -Force -Recurse)
 if (@($taskChildren | Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 }).Count -gt 0) { throw 'Unexpected nested link' }
 $taskFiles = @($taskChildren | Where-Object { -not $_.PSIsContainer })
 $taskFileCount += $taskFiles.Count
 foreach ($taskFile in $taskFiles) { $taskLogicalBytes += $taskFile.Length }
 $taskTargets += $taskTarget
}
# Browser QA scripts close their dedicated processes in finally before reaching here.
foreach ($taskTarget in $taskTargets) { Remove-Item -LiteralPath $taskTarget -Recurse -Force; if (Test-Path -LiteralPath $taskTarget) { throw 'Cleanup incomplete' } }
if ((Get-FileHash -LiteralPath $taskKeep -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReport.delivery.sha256) { throw 'Current delivery changed during cleanup' }
$taskReport.retention.cleanupPending = $false
$taskReport.retention | Add-Member -NotePropertyName removedFiles -NotePropertyValue $taskFileCount -Force
$taskReport.retention | Add-Member -NotePropertyName removedLogicalBytes -NotePropertyValue $taskLogicalBytes -Force
$taskReport.retention | Add-Member -NotePropertyName retainedCurrentHtmlVerified -NotePropertyValue $true -Force
$taskReport | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $taskReportPath -Encoding utf8
[pscustomobject]@{RemovedFiles=$taskFileCount;RemovedLogicalBytes=$taskLogicalBytes;CurrentVerified=$true;DDriveFree=(Get-PSDrive D).Free} | ConvertTo-Json
