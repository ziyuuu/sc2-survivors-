param([string]$RecordName='profile-cleanup-20261025-r3.json')
$ErrorActionPreference='Stop'
$taskBase=(Resolve-Path -LiteralPath 'D:\星际\reports\local\t01-20261024').Path
$taskTempBase=[IO.Path]::GetFullPath('C:\Users\zyuu\AppData\Local\Temp\codex-t01-20261024')
$taskProcesses=@(Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | Select-Object -ExpandProperty CommandLine)
$taskCandidates=@()
$taskSkipped=@()
foreach($taskDir in Get-ChildItem -LiteralPath $taskBase -Directory){
 $taskReport=Join-Path $taskDir.FullName 'report.json';$taskProfile=Join-Path $taskDir.FullName 'profile'
 if((Test-Path -LiteralPath $taskReport) -and (Test-Path -LiteralPath $taskProfile)){
  $taskData=Get-Content -LiteralPath $taskReport -Raw | ConvertFrom-Json
  if($taskData.profileClosed -eq $true){$taskCandidates+=Get-Item -LiteralPath $taskProfile}
 }
 if(Test-Path -LiteralPath $taskReport){
  $taskData=Get-Content -LiteralPath $taskReport -Raw | ConvertFrom-Json
  if($taskData.profileClosed -eq $true -and $taskData.profilePath -and $taskData.run -eq $taskDir.Name -and $taskDir.Name -match '^(ui-interactions|residual-probe|actions|card-cycles|offline-qa|tool-controls-probe)-r\d+(?:-r\d+)?$'){
   $taskExpected=[IO.Path]::GetFullPath((Join-Path $taskTempBase $taskDir.Name))
   $taskClaimed=[IO.Path]::GetFullPath([string]$taskData.profilePath)
   if($taskClaimed -ne $taskExpected){$taskSkipped += [PSCustomObject]@{path=$taskClaimed;status='skipped-unexpected-location'};continue}
   if(Test-Path -LiteralPath $taskExpected){$taskCandidates+=Get-Item -LiteralPath $taskExpected}
  }
 }
}
$taskMenuReport=Get-Content -LiteralPath 'D:\星际\reports\local\v03-20261024\t01-menu-bar-r1\report.json' -Raw | ConvertFrom-Json
if($taskMenuReport.profileClosed -eq $true -and (Test-Path -LiteralPath (Join-Path $taskBase 'menu-bar-profile'))){$taskCandidates+=Get-Item -LiteralPath (Join-Path $taskBase 'menu-bar-profile')}
if($RecordName -notmatch '^profile-cleanup-\d{8}-r\d+\.json$'){throw 'Invalid cleanup record name'}
$taskResults=@($taskSkipped);$taskOutput=Join-Path $taskBase $RecordName
if(Test-Path -LiteralPath $taskOutput){throw 'Preserve existing cleanup evidence; use a new record name'}
foreach($taskItem in $taskCandidates){
 $taskTarget=(Resolve-Path -LiteralPath $taskItem.FullName).Path
 $taskInWorkspace=$taskTarget.StartsWith($taskBase+'\',[StringComparison]::OrdinalIgnoreCase)
 $taskInTemp=$taskTarget.StartsWith($taskTempBase+'\',[StringComparison]::OrdinalIgnoreCase) -and $taskItem.Parent.FullName -eq $taskTempBase
 if(-not ($taskInWorkspace -or $taskInTemp)){throw 'Cleanup target escaped T01 cache locations'}
 if($taskInWorkspace -and ($taskTarget -eq $taskBase -or $taskItem.Name -notin @('profile','menu-bar-profile'))){throw 'Unexpected cleanup leaf'}
 if($taskInTemp -and $taskItem.Name -notmatch '^(ui-interactions|residual-probe|actions|card-cycles|offline-qa|tool-controls-probe)-r\d+(?:-r\d+)?$'){throw 'Unexpected temporary profile leaf'}
 if($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refuse reparse-point root'}
 if(@($taskProcesses | Where-Object {$_ -and $_.Contains($taskTarget)}).Count){$taskResults+=[PSCustomObject]@{path=$taskTarget;status='skipped-active'};continue}
 $taskBytes=(Get-ChildItem -LiteralPath $taskTarget -File -Recurse -Force | Measure-Object -Property Length -Sum).Sum
 $taskEntry=[PSCustomObject]@{path=$taskTarget;bytes=$taskBytes;status='verified-closed'};$taskResults+=$taskEntry
 $taskResults | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $taskOutput -Encoding utf8
 Remove-Item -LiteralPath $taskTarget -Recurse -Force
 $taskEntry.status='removed';$taskResults | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $taskOutput -Encoding utf8
}
[PSCustomObject]@{removed=@($taskResults | Where-Object status -eq removed).Count;bytes=($taskResults | Where-Object status -eq removed | Measure-Object bytes -Sum).Sum;skipped=@($taskResults | Where-Object status -eq skipped-active).Count} | ConvertTo-Json -Compress
