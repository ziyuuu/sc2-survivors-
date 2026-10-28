"""Sample only an owned browser process tree; Windows private commit, not GPU RAM."""
import ctypes as c
from ctypes import wintypes as w
import json, pathlib, sys, time
root, output = int(sys.argv[1]), pathlib.Path(sys.argv[2])
class Entry(c.Structure):
    _fields_ = [('size',w.DWORD),('usage',w.DWORD),('pid',w.DWORD),('heap',c.c_size_t),('module',w.DWORD),('threads',w.DWORD),('parent',w.DWORD),('priority',w.LONG),('flags',w.DWORD),('exe',w.WCHAR*260)]
class Memory(c.Structure):
    _fields_ = [('size',w.DWORD),('faults',w.DWORD)] + [(n,c.c_size_t) for n in ['peakWorkingSet','workingSet','peakPaged','paged','peakNonPaged','nonPaged','pagefile','peakPagefile','private']]
k=c.WinDLL('kernel32',use_last_error=True);p=c.WinDLL('psapi',use_last_error=True)
k.CreateToolhelp32Snapshot.restype=w.HANDLE
k.Process32FirstW.argtypes=[w.HANDLE,c.POINTER(Entry)];k.Process32NextW.argtypes=k.Process32FirstW.argtypes
k.OpenProcess.restype=w.HANDLE;k.OpenProcess.argtypes=[w.DWORD,w.BOOL,w.DWORD]
k.CloseHandle.argtypes=[w.HANDLE];p.GetProcessMemoryInfo.argtypes=[w.HANDLE,c.POINTER(Memory),w.DWORD]
def sample():
    snap=k.CreateToolhelp32Snapshot(2,0);e=Entry();e.size=c.sizeof(e);parents={}
    ok=k.Process32FirstW(snap,c.byref(e))
    while ok:
        parents[e.pid]=e.parent;ok=k.Process32NextW(snap,c.byref(e))
    k.CloseHandle(snap)
    if root not in parents:return None
    owned={root}
    while True:
        children={pid for pid,parent in parents.items() if parent in owned}
        if children<=owned:break
        owned|=children
    rows=[]
    for pid in owned:
        handle=k.OpenProcess(0x410,False,pid)
        if not handle:continue
        m=Memory();m.size=c.sizeof(m)
        if p.GetProcessMemoryInfo(handle,c.byref(m),m.size):rows.append({'pid':pid,'privateBytes':m.private,'workingSetBytes':m.workingSet})
        k.CloseHandle(handle)
    return {'unixMs':round(time.time()*1000),'privateBytes':sum(r['privateBytes'] for r in rows),'workingSetBytes':sum(r['workingSetBytes'] for r in rows),'processes':rows}
output.parent.mkdir(parents=True,exist_ok=True)
with output.open('w',encoding='utf8') as f:
    while True:
        row=sample()
        if row is None:break
        f.write(json.dumps(row)+'\n');f.flush();time.sleep(.25)
