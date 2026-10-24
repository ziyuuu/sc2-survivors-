$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $PSScriptRoot 'v01-thread-observer.cs')
Add-Type -TypeDefinition @'
using System;
using System.Threading;
using System.Runtime.InteropServices;
public static class V01ThreadSmoke {
 [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentThread();
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern int SetThreadDescription(IntPtr handle,string text);
 public static volatile bool Running;public static uint BusyId,WaitingId;
 static Thread busy,waiting;static readonly ManualResetEventSlim stop=new ManualResetEventSlim(false);
 public static void Start(){
  Running=true;stop.Reset();
  busy=new Thread(()=>{BusyId=GetCurrentThreadId();SetThreadDescription(GetCurrentThread(),"V01ObserverSmokeBusyWorker");while(Running)Thread.SpinWait(100);}){IsBackground=true};
  waiting=new Thread(()=>{WaitingId=GetCurrentThreadId();SetThreadDescription(GetCurrentThread(),"V01ObserverSmokeWaitingWorker");stop.Wait();}){IsBackground=true};
  busy.Start();waiting.Start();
  for(int i=0;(BusyId==0||WaitingId==0)&&i<1000;i++)Thread.Sleep(1);
  if(BusyId==0||WaitingId==0)throw new Exception("Smoke workers did not start.");
 }
 public static void Stop(){Running=false;stop.Set();busy.Join();waiting.Join();}
}
'@
$taskObserver=$null
try {
 [V01ThreadSmoke]::Start()
 $taskObserver=[V01ThreadObserver]::new([int[]]@($PID))
 $taskSamples=@()
 for($taskIteration=0;$taskIteration-lt 80;$taskIteration++){
  $taskSample=$taskObserver.Read()
  if($taskSample.found.Count-ne 1-or $taskSample.found[0]-ne $PID){throw 'Process filtering failed.'}
  $taskBusy=@($taskSample.rows|Where-Object{$_[1]-eq [V01ThreadSmoke]::BusyId})
  $taskWaiting=@($taskSample.rows|Where-Object{$_[1]-eq [V01ThreadSmoke]::WaitingId})
  if($taskBusy.Count-ne 1-or $taskWaiting.Count-ne 1){throw 'Thread identity validation failed.'}
  $taskSamples+=@{at=$taskSample.at;qpc=$taskSample.qpc;uptimeMs=$taskSample.uptimeMs;queryMs=$taskSample.queryMs;busy=$taskBusy[0];waiting=$taskWaiting[0];newNames=$taskSample.newNames}
  Start-Sleep -Milliseconds 10
 }
 if(-not @($taskSamples|Where-Object{$_.busy[2]-eq 2-or $_.busy[2]-eq 1}).Count){throw 'Runnable worker state was not observed.'}
 if(@($taskSamples|Where-Object{$_.waiting[2]-eq 5}).Count-lt 70){throw 'Waiting worker state was not observed consistently.'}
 if($taskSamples[-1].busy[6]-le $taskSamples[0].busy[6]){throw 'Busy worker CPU-cycle counter did not advance.'}
 $taskTimes=@($taskSamples|Select-Object -Skip 1|ForEach-Object{$_.queryMs}|Sort-Object)
 $taskResult=@{pass=$true;scope='Observer validation in its own temporary PowerShell process only; runnable and waiting workers, process/thread IDs and CPU-cycle progression checked.';samples=$taskSamples;queryMs=@{mean=($taskTimes|Measure-Object -Average).Average;p95=$taskTimes[[Math]::Floor(($taskTimes.Count-1)*.95)];max=$taskTimes[-1]};sources=@('https://learn.microsoft.com/windows/win32/api/winternl/nf-winternl-ntquerysysteminformation','https://learn.microsoft.com/windows/win32/api/processthreadsapi/nf-processthreadsapi-getthreaddescription')}
 $taskOutput='D:\星际\reports\local\v01-20261024\spike-thread-observer-selfcheck.json'
 if(Test-Path -LiteralPath $taskOutput){throw 'Self-check record already exists.'}
 $taskResult|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $taskOutput -Encoding utf8NoBOM
 $taskResult.queryMs|ConvertTo-Json -Compress
}finally {if($taskObserver){$taskObserver.Dispose()};[V01ThreadSmoke]::Stop()}
