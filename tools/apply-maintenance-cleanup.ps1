param([ValidateSet('project-cache','c-cache')][string]$Group)
$ErrorActionPreference='Stop'
$maintenanceRoot=(Resolve-Path -LiteralPath 'D:\星际').Path
$maintenanceOut=Join-Path $maintenanceRoot 'reports/local/maintenance-audit-20261008'
$maintenancePlan=Get-Content -LiteralPath (Join-Path $maintenanceOut 'cleanup-plan.json') -Raw | ConvertFrom-Json
$maintenanceAllowed=if($Group -eq 'project-cache'){@('D:\星际\.cache')}else{@('C:\Users\zyuu\AppData\Local\Temp','C:\Users\zyuu\AppData\Local\pip\Cache')}
$maintenanceCommands=@(Get-CimInstance Win32_Process | ForEach-Object {$_.CommandLine} | Where-Object {$_})
$maintenanceChecked=[Collections.Generic.List[object]]::new()
$maintenanceSkipped=[Collections.Generic.List[object]]::new()
$maintenanceActive=@{}
$maintenanceParents=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach($entry in $maintenancePlan.files){
 if(($Group -eq 'project-cache') -ne ($entry.root -eq 'D:/星际')){continue}
 $absolute=[IO.Path]::GetFullPath($entry.path)
 $base=@($maintenanceAllowed | Where-Object {$absolute.StartsWith($_+'\',[StringComparison]::OrdinalIgnoreCase)})
 if($base.Count -ne 1){throw "Unapproved cleanup path: $absolute"}
 $relative=$absolute.Substring($base[0].Length+1)
 if($Group -eq 'project-cache' -and $relative -notmatch '^(p5-tests|current-update-[^\\]+|ui-coze-main-[^\\]+|ui-offline-final-[^\\]+|p6-update-[^\\]+|coze-update-test-[^\\]+|ui-lfs-[^\\]+|git-baseline-20261006|fixed-performance-vite|wasm-individual-vite|wasm-test-npm)\\'){throw 'Unexpected project cache'}
 $top=Join-Path $base[0] ($relative.Split('\')[0])
 if(!$maintenanceActive.ContainsKey($top)){$maintenanceActive[$top]=@($maintenanceCommands | Where-Object {$_.IndexOf($top,[StringComparison]::OrdinalIgnoreCase) -ge 0 -or $_.IndexOf($top.Replace('\','/'),[StringComparison]::OrdinalIgnoreCase) -ge 0}).Count -gt 0}
 $active=$maintenanceActive[$top]
 if($active){$maintenanceSkipped.Add(@{path=$absolute;reason='Referenced by a live process'});continue}
 $cursor=[IO.Path]::GetDirectoryName($absolute)
 while($cursor.Length -ge $base[0].Length -and !$maintenanceParents.Contains($cursor)){if((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Link in cleanup parent: $cursor"};[void]$maintenanceParents.Add($cursor);$cursor=[IO.Path]::GetDirectoryName($cursor)}
 $item=Get-Item -LiteralPath $absolute -Force -ErrorAction SilentlyContinue
 if(!$item -or $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.Length -ne $entry.bytes -or [Math]::Abs(([DateTimeOffset]$item.LastWriteTimeUtc).ToUnixTimeMilliseconds()-$entry.mtime) -gt 3){$maintenanceSkipped.Add(@{path=$absolute;reason='Missing or changed after inventory'});continue}
 $maintenanceChecked.Add(@{path=$absolute;bytes=$item.Length;links=$entry.links})
}
$maintenanceDrive=if($Group -eq 'project-cache'){'D'}else{'C'}
$maintenanceBefore=(Get-PSDrive -Name $maintenanceDrive).Free
$maintenanceRemoved=[Collections.Generic.List[object]]::new()
foreach($entry in $maintenanceChecked){try{Remove-Item -LiteralPath $entry.path -Force;$maintenanceRemoved.Add($entry)}catch{$maintenanceSkipped.Add(@{path=$entry.path;reason='In use or inaccessible: '+$_.Exception.Message})}}
# Never recurse through directories or links. Only now-empty reviewed parent paths are removed.
$maintenanceDirs=@($maintenanceRemoved | ForEach-Object {[IO.Path]::GetDirectoryName($_.path)} | Sort-Object -Unique | Sort-Object Length -Descending)
foreach($dir in $maintenanceDirs){if(@($maintenanceAllowed | Where-Object {$dir.StartsWith($_+'\',[StringComparison]::OrdinalIgnoreCase)}).Count -eq 1 -and (Test-Path -LiteralPath $dir) -and !(Get-ChildItem -LiteralPath $dir -Force | Select-Object -First 1)){try{Remove-Item -LiteralPath $dir -Force}catch{}}}
$maintenanceAfter=(Get-PSDrive -Name $maintenanceDrive).Free
$maintenanceResult=@{at=(Get-Date).ToUniversalTime().ToString('o');group=$Group;removedFiles=$maintenanceRemoved.Count;logicalBytes=($maintenanceRemoved | Measure-Object bytes -Sum).Sum;hardlinkedBytes=($maintenanceRemoved | Where-Object {$_.links -gt 1} | Measure-Object bytes -Sum).Sum;diskFreeBefore=$maintenanceBefore;diskFreeAfter=$maintenanceAfter;observedFreeIncrease=$maintenanceAfter-$maintenanceBefore;removed=$maintenanceRemoved;skipped=$maintenanceSkipped}
$maintenanceResult | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $maintenanceOut ('cleanup-'+$Group+'.json')) -Encoding utf8
[PSCustomObject]$maintenanceResult | Select-Object group,removedFiles,logicalBytes,hardlinkedBytes,observedFreeIncrease | ConvertTo-Json -Compress
