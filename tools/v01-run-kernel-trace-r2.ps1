param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$traceBase=[IO.Path]::GetFullPath('D:\星际\reports\local\v01-20261024')
$traceRoot=[IO.Path]::GetFullPath($RunDirectory)
if(-not $traceRoot.StartsWith($traceBase+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Trace output must remain inside the named task directory.'}
if(-not (Test-Path -LiteralPath $traceRoot -PathType Container)){throw 'Trace run directory must already exist.'}
if((Get-Item -LiteralPath $traceRoot).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Trace directory cannot be a reparse point.'}
$traceName=[IO.Path]::GetFileName($traceRoot)
if($traceName -notmatch '^spike-kernel-[a-z0-9-]+$'){throw 'Unexpected trace run name.'}
$traceInstance='V01-'+$traceName
$traceWpr=Join-Path $env:SystemRoot 'System32\wpr.exe'
$traceProfile='D:\星际\tools\v01-spike-scheduling-r2.wprp!V01Scheduling.Light'
$traceStatus=[ordered]@{instance=$traceInstance;helperPid=$PID;requestUtc=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();started=$false;stopped=$false;limitSeconds=600}
try{
  & $traceWpr -start $traceProfile -instancename $traceInstance *> (Join-Path $traceRoot 'kernel-start.log')
  $traceStatus.startExit=$LASTEXITCODE
  if($LASTEXITCODE -ne 0){throw 'Windows performance recording did not start; see kernel-start.log.'}
  $traceStatus.started=$true
  $traceStatus.startedUtc=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $traceStatus.qpc=[Diagnostics.Stopwatch]::GetTimestamp()
  $traceStatus.qpcFrequency=[Diagnostics.Stopwatch]::Frequency
  $traceStatus | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $traceRoot 'kernel-ready.json') -Encoding utf8NoBOM
  $traceStop=Join-Path $traceRoot 'kernel-stop.json'
  $traceTimer=[Diagnostics.Stopwatch]::StartNew()
  while(-not (Test-Path -LiteralPath $traceStop) -and $traceTimer.Elapsed.TotalSeconds -lt 600){Start-Sleep -Milliseconds 50}
  $traceStatus.stopReason=if(Test-Path -LiteralPath $traceStop){Get-Content -LiteralPath $traceStop -Raw}else{'bounded-timeout'}
}catch{
  $traceStatus.failure=$_.Exception.Message
}finally{
  if($traceStatus.started){
    $traceStatus.stopRequestedUtc=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    & $traceWpr -stop (Join-Path $traceRoot 'kernel.etl') 'V01 thread scheduling and hard-fault diagnosis' -skipPdbGen -instancename $traceInstance *> (Join-Path $traceRoot 'kernel-stop.log')
    $traceStatus.stopExit=$LASTEXITCODE
    $traceStatus.stopped=$LASTEXITCODE -eq 0
    if(-not $traceStatus.stopped){
      & $traceWpr -cancel -instancename $traceInstance *> (Join-Path $traceRoot 'kernel-cancel.log')
      $traceStatus.cancelExit=$LASTEXITCODE
    }
  }
  $traceStatus.finishedUtc=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $traceStatus | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $traceRoot 'kernel-finished.json') -Encoding utf8NoBOM
}
