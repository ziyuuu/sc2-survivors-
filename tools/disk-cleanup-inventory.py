"""Read-only directory size inventory; never follows Windows reparse points."""
import os, sys, json, time
from pathlib import Path

output = Path(sys.argv[1])
roots = sys.argv[2:]
result = {"started": time.time(), "roots": [], "errors": []}
for root in roots:
    rows = []
    if not os.path.exists(root):
        result["roots"].append({"path":root,"missing":True})
        continue
    def walk(folder):
        total=0; count=0; latest=0
        try:
            with os.scandir(folder) as entries:
                for e in entries:
                    try:
                        s=e.stat(follow_symlinks=False)
                        if getattr(s,'st_file_attributes',0)&1024 or e.is_symlink():
                            continue
                        if e.is_dir(follow_symlinks=False):
                            n,c,t=walk(e.path);total+=n;count+=c;latest=max(latest,t)
                        else:
                            total+=s.st_size;count+=1;latest=max(latest,s.st_mtime)
                    except OSError as ex: result['errors'].append({'path':e.path,'error':str(ex)})
        except OSError as ex: result['errors'].append({'path':folder,'error':str(ex)})
        rows.append({'path':str(folder),'bytes':total,'files':count,'latestModified':latest})
        return total,count,latest
    total,count,latest=walk(root)
    rows.sort(key=lambda r:r['bytes'],reverse=True)
    result['roots'].append({'path':root,'bytes':total,'files':count,'dirs':rows})
    print(json.dumps({'root':root,'GiB':round(total/2**30,3),'files':count,'top':rows[:12]},ensure_ascii=False),flush=True)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
result['finished']=time.time()
output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
