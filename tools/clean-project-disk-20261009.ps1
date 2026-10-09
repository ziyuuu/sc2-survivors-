$ErrorActionPreference='Stop'
$diskRoot=(Resolve-Path -LiteralPath 'D:\星际').Path
$diskOut=Join-Path $diskRoot 'reports/local/disk-cleanup-20261009'
$diskPlan=Get-Content -LiteralPath (Join-Path $diskOut 'plan.json') -Raw | ConvertFrom-Json
if($diskPlan.root -ne $diskRoot){throw 'Cleanup root mismatch'}
$diskProcesses=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -match '^(node|python|chrome)' -and $_.CommandLine -notmatch 'trusted-worker|experimental-vm-modules'} | ForEach-Object {$_.CommandLine})
$diskRemoved=[Collections.Generic.List[object]]::new()
$diskSkipped=[Collections.Generic.List[object]]::new()
$diskParents=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$diskBefore=(Get-PSDrive D).Free
foreach($entry in $diskPlan.files){
 $target=[IO.Path]::GetFullPath($entry.path)
 if(!$target.StartsWith($diskRoot+'\',[StringComparison]::OrdinalIgnoreCase)){throw "Outside workspace: $target"}
 $relative=$target.Substring($diskRoot.Length+1).Replace('\','/')
 if($relative -ne $entry.relative -or $relative -notmatch '^(dist/|\.cache/|reports/local/hero-iteration/cache-(hud-final|shipping)/normal-profile-[0-9]+/)'){throw "Outside reviewed scope: $target"}
 $parent=[IO.Path]::GetDirectoryName($target)
 while($parent.Length -ge $diskRoot.Length -and !$diskParents.Contains($parent)){
  if((Get-Item -LiteralPath $parent -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Linked parent: $parent"}
  [void]$diskParents.Add($parent);$parent=[IO.Path]::GetDirectoryName($parent)
 }
 $activeKey=if($relative -match '^(reports/local/hero-iteration/cache-[^/]+/normal-profile-[^/]+)'){$Matches[1]}elseif($relative -match '^(\.cache/[^/]+)'){$Matches[1]}elseif($relative -match '^(dist/[^/]+)'){$Matches[1]}else{$relative}
 if(@($diskProcesses | Where-Object {$_ -and ($_.Contains($activeKey) -or $_.Contains($activeKey.Replace('/','\')))}).Count){$diskSkipped.Add(@{path=$target;reason='Live process reference'});continue}
 $item=Get-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
 if(!$item){$diskSkipped.Add(@{path=$target;reason='Already absent'});continue}
 if($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw "Unexpected file kind: $target"}
 if($item.Length -ne $entry.bytes -or [Math]::Abs(([DateTimeOffset]$item.LastWriteTimeUtc).ToUnixTimeMilliseconds()-$entry.mtimeMs) -gt 3 -or (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256){$diskSkipped.Add(@{path=$target;reason='Changed after inventory'});continue}
 try{Remove-Item -LiteralPath $target -Force;$diskRemoved.Add($entry)}catch{$diskSkipped.Add(@{path=$target;reason=$_.Exception.Message})}
}
# Delete only verified empty directories; never recurse through unknown contents.
$emptyRemoved=0
foreach($dir in $diskPlan.directories){
 $target=[IO.Path]::GetFullPath($dir)
 if(!$target.StartsWith($diskRoot+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Directory outside workspace'}
 if(!(Test-Path -LiteralPath $target)){continue}
 $item=Get-Item -LiteralPath $target -Force
 if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked directory'}
 if(!(Get-ChildItem -LiteralPath $target -Force | Select-Object -First 1)){try{Remove-Item -LiteralPath $target -Force;$emptyRemoved++}catch{}}
}
$diskAfter=(Get-PSDrive D).Free
$result=@{at=(Get-Date).ToUniversalTime().ToString('o');removedFiles=$diskRemoved.Count;logicalBytes=($diskRemoved | Measure-Object bytes -Sum).Sum;removedEmptyDirectories=$emptyRemoved;freeBefore=$diskBefore;freeAfter=$diskAfter;observedFreeIncrease=$diskAfter-$diskBefore;removed=$diskRemoved;skipped=$diskSkipped}
$result | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $diskOut 'cleanup-result.json') -Encoding utf8
$result | Select-Object removedFiles,logicalBytes,removedEmptyDirectories,freeBefore,freeAfter,observedFreeIncrease | ConvertTo-Json -Compress
