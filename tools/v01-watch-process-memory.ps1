param([Parameter(Mandatory=$true)][string]$ProcessIds,[Parameter(Mandatory=$true)][string]$Output,[Parameter(Mandatory=$true)][string]$StopFile,[Parameter(Mandatory=$true)][string]$ReadyFile,[ValidateRange(1,600)][int]$DurationSeconds=600)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class V01Memory {
 [StructLayout(LayoutKind.Sequential)] public struct ProcessMemory {public uint Size,PageFaults;public UIntPtr PeakWorkingSet,WorkingSet,PeakPagedPool,PagedPool,PeakNonPagedPool,NonPagedPool,Pagefile,PeakPagefile,PrivateUsage;}
 [StructLayout(LayoutKind.Sequential)] public struct SystemMemory {public uint Size,Load;public ulong TotalPhysical,AvailablePhysical,TotalPagefile,AvailablePagefile,TotalVirtual,AvailableVirtual,AvailableExtended;}
 [StructLayout(LayoutKind.Sequential)] public struct Io {public ulong ReadOperations,WriteOperations,OtherOperations,ReadBytes,WriteBytes,OtherBytes;}
 [StructLayout(LayoutKind.Sequential)] public struct CounterValue {public uint Status;public double Value;}
 [StructLayout(LayoutKind.Sequential)] public struct FileTime {public uint Low,High;public ulong Value {get{return ((ulong)High<<32)+Low;}}}
 [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr OpenProcess(uint access,bool inherit,int pid);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle);
 [DllImport("psapi.dll",SetLastError=true)] public static extern bool GetProcessMemoryInfo(IntPtr handle,out ProcessMemory value,uint size);
 [DllImport("kernel32.dll")] public static extern bool GlobalMemoryStatusEx(ref SystemMemory value);
 [DllImport("kernel32.dll")] public static extern bool GetProcessIoCounters(IntPtr handle,out Io value);
 [DllImport("kernel32.dll")] public static extern bool GetProcessTimes(IntPtr handle,out FileTime created,out FileTime exit,out FileTime kernel,out FileTime user);
 [DllImport("pdh.dll",CharSet=CharSet.Unicode)] public static extern uint PdhOpenQuery(string source,IntPtr user,out IntPtr query);
 public static uint OpenQuery(out IntPtr query){return PdhOpenQuery(null,IntPtr.Zero,out query);}
 [DllImport("pdh.dll",CharSet=CharSet.Unicode)] public static extern uint PdhAddEnglishCounter(IntPtr query,string path,IntPtr user,out IntPtr counter);
 [DllImport("pdh.dll")] public static extern uint PdhCollectQueryData(IntPtr query);
 [DllImport("pdh.dll")] public static extern uint PdhGetFormattedCounterValue(IntPtr counter,uint format,out uint type,out CounterValue value);
 [DllImport("pdh.dll")] public static extern uint PdhCloseQuery(IntPtr query);
}
'@
$taskHandles=@{}
foreach($taskProcessId in $ProcessIds.Split(',')){$taskId=[int]$taskProcessId;$taskHandles[$taskId]=[V01Memory]::OpenProcess(0x410,$false,$taskId)}
$taskQuery=[IntPtr]::Zero
$taskCounters=@{};$taskPdhInfo=@{};$taskPdhInfo.open=[V01Memory]::OpenQuery([ref]$taskQuery)
if($taskPdhInfo.open-eq 0){foreach($taskCounterPath in @('\Memory\Page Reads/sec','\Memory\Pages Input/sec','\Processor(_Total)\% Processor Time')){$taskCounter=[IntPtr]::Zero;$taskPdhInfo[$taskCounterPath]=[V01Memory]::PdhAddEnglishCounter($taskQuery,$taskCounterPath,[IntPtr]::Zero,[ref]$taskCounter);if($taskPdhInfo[$taskCounterPath]-eq 0){$taskCounters[$taskCounterPath]=$taskCounter}};[void][V01Memory]::PdhCollectQueryData($taskQuery)}
$taskWriter=[IO.StreamWriter]::new($Output,$false,[Text.UTF8Encoding]::new($false));$taskWriter.AutoFlush=$true
$taskBegin=[DateTime]::UtcNow
try{
 [IO.File]::WriteAllText($ReadyFile,($taskPdhInfo|ConvertTo-Json -Compress))
 while(-not [IO.File]::Exists($StopFile) -and ([DateTime]::UtcNow-$taskBegin).TotalSeconds -lt $DurationSeconds){
  $taskSystem=[V01Memory+SystemMemory]::new();$taskSystem.Size=[Runtime.InteropServices.Marshal]::SizeOf($taskSystem);[void][V01Memory]::GlobalMemoryStatusEx([ref]$taskSystem)
  $taskRows=@();foreach($taskId in $taskHandles.Keys){$taskHandle=$taskHandles[$taskId];$taskMemory=[V01Memory+ProcessMemory]::new();$taskIo=[V01Memory+Io]::new();$taskCreated=[V01Memory+FileTime]::new();$taskExit=[V01Memory+FileTime]::new();$taskKernel=[V01Memory+FileTime]::new();$taskUser=[V01Memory+FileTime]::new();$taskOk=[V01Memory]::GetProcessMemoryInfo($taskHandle,[ref]$taskMemory,[Runtime.InteropServices.Marshal]::SizeOf($taskMemory));[void][V01Memory]::GetProcessIoCounters($taskHandle,[ref]$taskIo);[void][V01Memory]::GetProcessTimes($taskHandle,[ref]$taskCreated,[ref]$taskExit,[ref]$taskKernel,[ref]$taskUser);$taskRows+=@{pid=$taskId;ok=$taskOk;workingSet=$taskMemory.WorkingSet.ToUInt64();privateBytes=$taskMemory.PrivateUsage.ToUInt64();pageFaults=$taskMemory.PageFaults;readBytes=$taskIo.ReadBytes;writeBytes=$taskIo.WriteBytes;cpu100ns=($taskKernel.Value+$taskUser.Value)}}
  $taskPdh=@{};if($taskQuery-ne [IntPtr]::Zero){[void][V01Memory]::PdhCollectQueryData($taskQuery);foreach($taskName in $taskCounters.Keys){$taskValue=[V01Memory+CounterValue]::new();$taskType=[uint32]0;$taskStatus=[V01Memory]::PdhGetFormattedCounterValue($taskCounters[$taskName],0x200,[ref]$taskType,[ref]$taskValue);if($taskStatus-eq 0){$taskPdh[$taskName]=$taskValue.Value}}}
  $taskWriter.WriteLine((@{at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();availablePhysical=$taskSystem.AvailablePhysical;availableCommit=$taskSystem.AvailablePagefile;memoryLoad=$taskSystem.Load;counters=$taskPdh;processes=$taskRows}|ConvertTo-Json -Depth 5 -Compress))
  Start-Sleep -Milliseconds 250
 }
}finally{$taskWriter.Dispose();foreach($taskHandle in $taskHandles.Values){if($taskHandle-ne [IntPtr]::Zero){[void][V01Memory]::CloseHandle($taskHandle)}};if($taskQuery-ne [IntPtr]::Zero){[void][V01Memory]::PdhCloseQuery($taskQuery)}}
