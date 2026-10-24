"""Read-only inventory and exact binary-asset dedup plan for this cleanup."""
import os, json, hashlib, re, time, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports/local/disk-cleanup-20261023'
OUT.mkdir(parents=True, exist_ok=True)
def save(name, data):
    (OUT/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def sha(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for b in iter(lambda:f.read(4*1024*1024),b''): h.update(b)
    return h.hexdigest()
def walk(base):
    for parent, dirs, files in os.walk(base, followlinks=False):
        dirs[:] = [d for d in dirs if d not in ('p5-tests','disk-cleanup-20261023') and not (Path(parent)/d).lstat().st_file_attributes & 1024]
        for n in files:
            p=Path(parent)/n; st=p.lstat()
            if not st.st_file_attributes & 1024: yield p,st

protected=[]
for base in ('src','test','docs/project','reports/qa','deploy'):
    for p,st in walk(ROOT/base):
        protected.append({'path':str(p),'bytes':st.st_size,'sha256':sha(p)})
for n in ('AGENTS.md','package.json','package-lock.json','tsconfig.json','dist/SC2-Survivors-Current-20261006.html'):
    p=ROOT/n
    if p.is_file(): protected.append({'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)})
if (OUT/'protected-before.json').exists():
    assert protected == json.loads((OUT/'protected-before.json').read_text(encoding='utf-8')), 'Protected bytes changed during inventory restart'
else:
    save('protected-before.json',protected)

groups=collections.defaultdict(list); big=[]; unique={}; totals=collections.defaultdict(int)
for base in ('reports/local','dist','preview'):
    for p,st in walk(ROOT/base):
        rel=p.relative_to(ROOT).as_posix()
        if rel.startswith('reports/local/disk-cleanup-20261023/'): continue
        ident=(st.st_dev,st.st_ino)
        unique[ident]=st.st_size; totals[base]+=st.st_size
        row={'path':str(p),'bytes':st.st_size,'inode':st.st_ino,'device':st.st_dev,'links':st.st_nlink,'mtime':st.st_mtime}
        m=re.fullmatch(r'([0-9a-f]{64})\.(glb|png|webp|ogg|mp3|wav|bin)',p.name)
        if m and st.st_size>0: groups[(m[1],st.st_size)].append(row)
        if st.st_size>100*1024**2: big.append(row)
save('large-files.json',sorted(big,key=lambda x:x['bytes'],reverse=True))
save('space-summary.json',{'scopeLogicalBytes':dict(totals),'uniqueFileBytes':sum(unique.values()),'largeFiles':len(big)})
print(json.dumps({'protected':len(protected),'uniqueGiB':round(sum(unique.values())/2**30,3),'largeFiles':len(big)}),flush=True)
plans=[]; errors=[]; duplicates=0; checked=0
for (expected,size), rows in groups.items():
    ids=collections.defaultdict(list)
    for row in rows: ids[(row['device'],row['inode'])].append(row)
    if len(ids)<2: continue
    for same in ids.values():
        actual=sha(same[0]['path']);checked+=1
        if actual!=expected: errors.append({'path':same[0]['path'],'expected':expected,'actual':actual})
    if errors: continue
    ordered=sorted(ids.values(),key=lambda a:(a[0]['links']-len(a),len(a)),reverse=True)
    donor=ordered[0][0]
    targets=[]
    for same in ordered[1:]:
        # Keep external hardlink identities intact if any unseen paths use them.
        if same[0]['links']!=len(same): continue
        duplicates+=size; targets.extend(r['path'] for r in same)
    if targets: plans.append({'sha256':expected,'bytes':size,'canonical':donor['path'],'targets':targets})
    if len(plans)%100==0: print(json.dumps({'groups':len(plans),'duplicateGiB':round(duplicates/2**30,3)}),flush=True)
save('link-plan.json',{'created':time.time(),'groups':plans,'mismatches':errors,'distinctDuplicateBytes':duplicates,'checkedDistinctFiles':checked,'targets':sum(len(g['targets']) for g in plans)})
assert not errors, errors
print(json.dumps({'groups':len(plans),'targets':sum(len(g['targets']) for g in plans),'distinctDuplicateGiB':round(duplicates/2**30,3)}),flush=True)
