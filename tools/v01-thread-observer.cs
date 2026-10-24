// Diagnostic only. Read documented SYSTEM_PROCESS_INFORMATION / SYSTEM_THREAD_INFORMATION.
// https://learn.microsoft.com/windows/win32/api/winternl/nf-winternl-ntquerysysteminformation
// Only selected test-browser processes are returned. No thread is suspended or modified.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;

public sealed class V01ThreadObserver : IDisposable {
 [DllImport("ntdll.dll")] static extern int NtQuerySystemInformation(int type,IntPtr buffer,int length,out int returned);
 [DllImport("kernel32.dll")] static extern IntPtr OpenThread(uint access,bool inherit,uint id);
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,int id);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
 [DllImport("kernel32.dll")] static extern int GetThreadDescription(IntPtr handle,out IntPtr text);
 [DllImport("kernel32.dll")] static extern bool QueryThreadCycleTime(IntPtr handle,out ulong cycles);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
 [DllImport("kernel32.dll")] static extern ulong GetTickCount64();
 readonly Dictionary<int,IntPtr> targets=new Dictionary<int,IntPtr>();
 readonly Dictionary<string,IntPtr> threadHandles=new Dictionary<string,IntPtr>();
 readonly Dictionary<string,string> descriptions=new Dictionary<string,string>();
 IntPtr buffer=IntPtr.Zero;int capacity=4*1024*1024;
 public V01ThreadObserver(int[] ids){
  if(IntPtr.Size!=8)throw new PlatformNotSupportedException("This observer validates the documented x64 layouts only.");
  foreach(int id in ids){var handle=OpenProcess(0x101000,false,id);if(handle==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());targets.Add(id,handle);}
  buffer=Marshal.AllocHGlobal(capacity);
 }
 public sealed class Snapshot {
  public long at;public long qpc;public long qpcFrequency;public ulong uptimeMs;public double queryMs;public int bytes;
  public List<long[]> rows=new List<long[]>();public Dictionary<string,string> newNames=new Dictionary<string,string>();
  public List<int> found=new List<int>();
 }
 public Snapshot Read(){
  var result=new Snapshot();var timer=Stopwatch.StartNew();int returned,status;
  for(;;){
   status=NtQuerySystemInformation(5,buffer,capacity,out returned);
   if(status==unchecked((int)0xc0000004)){
    int next=Math.Max(capacity*2,returned+65536);if(next>32*1024*1024)throw new InvalidOperationException("Unexpected process snapshot size.");
    Marshal.FreeHGlobal(buffer);capacity=next;buffer=Marshal.AllocHGlobal(capacity);continue;
   }
   if(status!=0)throw new InvalidOperationException("NtQuerySystemInformation failed: "+status.ToString("x8"));break;
  }
  result.at=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();result.qpc=Stopwatch.GetTimestamp();result.qpcFrequency=Stopwatch.Frequency;result.uptimeMs=GetTickCount64();result.bytes=returned;
  var live=new HashSet<string>();int offset=0;
  while(offset+256<=returned){
   var entry=IntPtr.Add(buffer,offset);int next=Marshal.ReadInt32(entry,0),count=Marshal.ReadInt32(entry,4);long rawPid=Marshal.ReadInt64(entry,80);
   int available=next==0?returned-offset:next;
   if(count<0||count>100000||available<256||offset+available>returned||256L+80L*count>available)throw new InvalidOperationException("Process/thread layout validation failed.");
   IntPtr target;
   if(rawPid<=int.MaxValue&&targets.TryGetValue((int)rawPid,out target)&&WaitForSingleObject(target,0)==0x102){
    int pid=(int)rawPid;result.found.Add(pid);
    for(int i=0;i<count;i++){
     var thread=IntPtr.Add(entry,256+i*80);
     long owner=Marshal.ReadInt64(thread,40),tid=Marshal.ReadInt64(thread,48);
     int state=Marshal.ReadInt32(thread,68),reason=Marshal.ReadInt32(thread,72);
     if(owner!=pid||tid<=0||tid>int.MaxValue||state<0||state>32||reason<0||reason>256)throw new InvalidOperationException("Thread layout validation failed.");
     string key=pid+":"+tid;live.Add(key);IntPtr handle;
     if(!threadHandles.TryGetValue(key,out handle)){
      handle=OpenThread(0x800,false,(uint)tid);threadHandles.Add(key,handle);IntPtr text;
      string name="";if(handle!=IntPtr.Zero&&GetThreadDescription(handle,out text)>=0){try{name=Marshal.PtrToStringUni(text)??"";}finally{LocalFree(text);}}
      descriptions[key]=name;result.newNames[key]=name;
     }
     ulong cycles=0;bool queryCycles=descriptions[key].IndexOf("Main",StringComparison.OrdinalIgnoreCase)>=0||descriptions[key].IndexOf("Worker",StringComparison.OrdinalIgnoreCase)>=0||descriptions[key].IndexOf("Compositor",StringComparison.OrdinalIgnoreCase)>=0;
     long cycleValue=queryCycles&&handle!=IntPtr.Zero&&QueryThreadCycleTime(handle,out cycles)?(long)cycles:-1;
     result.rows.Add(new long[]{pid,tid,state,state==5?reason:-1,Marshal.ReadInt32(thread,56),Marshal.ReadInt32(thread,60),cycleValue});
    }
   }
   if(next==0)break;offset+=next;
  }
  foreach(var key in new List<string>(threadHandles.Keys))if(!live.Contains(key)){if(threadHandles[key]!=IntPtr.Zero)CloseHandle(threadHandles[key]);threadHandles.Remove(key);descriptions.Remove(key);}
  result.queryMs=timer.Elapsed.TotalMilliseconds;return result;
 }
 public void Dispose(){foreach(var h in threadHandles.Values)if(h!=IntPtr.Zero)CloseHandle(h);threadHandles.Clear();foreach(var p in targets.Values)CloseHandle(p);targets.Clear();if(buffer!=IntPtr.Zero){Marshal.FreeHGlobal(buffer);buffer=IntPtr.Zero;}}
}
