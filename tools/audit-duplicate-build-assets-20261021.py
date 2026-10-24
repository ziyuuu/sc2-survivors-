import json,re,hashlib,os,time,collections
from pathlib import Path
root=Path('reports/local/disk-cleanup-20261021/artifact-pass')
rows=json.loads((root/'files-before.json').read_text(encoding='utf-8'))['files']
groups=collections.defaultdict(list)
for row in rows:
    m=re.fullmatch(r'([0-9a-f]{64})\.(glb|png|webp|ogg|mp3|wav|bin)',Path(row['path']).name)
    if m and row['bytes']>0:groups[(m[1],row['bytes'])].append(row)
groups={k:v for k,v in groups.items() if len(v)>1}
result={'started':time.time(),'groups':[],'mismatches':[],'logicalRedundancy':0,'distinctFileRedundancy':0}
print(json.dumps({'candidateGroups':len(groups),'candidateFiles':sum(len(v) for v in groups.values()),'candidateLogicalGiB':sum(k[1]*(len(v)-1) for k,v in groups.items())/2**30}),flush=True)
for n,((expected,size),items) in enumerate(groups.items()):
    checked=[]
    for item in items:
        p=Path(item['path']);h=hashlib.sha256()
        with p.open('rb') as f:
            for block in iter(lambda:f.read(4*1024*1024),b''):h.update(block)
        st=p.stat();actual=h.hexdigest()
        if actual!=expected:result['mismatches'].append({'path':str(p),'expected':expected,'actual':actual})
        checked.append({**item,'sha256':actual,'inode':st.st_ino,'device':st.st_dev,'links':st.st_nlink})
    if all(x['sha256']==expected for x in checked):
        distinct=len(set((x['device'],x['inode']) for x in checked))
        result['groups'].append({'sha256':expected,'bytes':size,'files':checked,'distinctFileIds':distinct})
        result['logicalRedundancy']+=size*(len(items)-1)
        result['distinctFileRedundancy']+=size*(distinct-1)
    if n%100==0:
        print(json.dumps({'checkedGroups':n+1,'distinctDuplicateGiB':round(result['distinctFileRedundancy']/2**30,3)}),flush=True)
        (root/'duplicate-assets-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
result['finished']=time.time()
(root/'duplicate-assets-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'verifiedGroups':len(result['groups']),'mismatches':len(result['mismatches']),'distinctDuplicateGiB':round(result['distinctFileRedundancy']/2**30,3)}),flush=True)
