"""Keep one identical resource payload and exact compressed code for old builds.

This tool only writes archives/plans. Deletion is separately validated in PowerShell.
Restore: python tools/archive-old-builds-20261021.py restore <original-relative-path>
Verify all recipes without creating large files: ... verify
"""
import gzip, hashlib, json, os, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'reports/local/disk-cleanup-d04-20261021'
ARCHIVE = BASE / 'reconstruction'
PLAN = BASE / 'build-plan.json'
sha = lambda b: hashlib.sha256(b).hexdigest()
def load(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def chunks(p, start=0, end=None):
    with p.open('rb') as f:
        f.seek(start)
        remaining = p.stat().st_size-start if end is None else end-start
        while remaining:
            b=f.read(min(4*1024*1024, remaining))
            if not b: raise IOError('Unexpected EOF: '+str(p))
            remaining-=len(b)
            yield b
def digest(p, start=0, end=None):
    h=hashlib.sha256()
    for b in chunks(p,start,end): h.update(b)
    return h.hexdigest()
def relative(p): return p.relative_to(ROOT).as_posix()
def blob(b):
    p=ARCHIVE/(sha(b)+'.gz')
    if not p.exists(): p.write_bytes(gzip.compress(b, compresslevel=6, mtime=0))
    assert gzip.decompress(p.read_bytes())==b
    return relative(p)
def reconstructed(row):
    if row['kind']=='gzip-build':
        yield gzip.decompress((ROOT/row['compressed']).read_bytes())
    else:
        yield gzip.decompress((ROOT/row['prefix']).read_bytes())
        d=row['donor']
        yield from chunks(ROOT/d['path'],d['start'],d['end'])
        yield gzip.decompress((ROOT/row['suffix']).read_bytes())
def verify_row(row, output=None):
    h=hashlib.sha256(); size=0
    for b in reconstructed(row):
        h.update(b);size+=len(b)
        if output: output.write(b)
    assert size==row['bytes'] and h.hexdigest()==row['sha256'], row['path']

if len(sys.argv)>1 and sys.argv[1] in ('verify','restore'):
    plan=load(PLAN)
    if sys.argv[1]=='verify':
        for row in plan['targets']: verify_row(row)
        print(json.dumps({'verified':len(plan['targets']),'pass':True}))
    else:
        wanted=sys.argv[2].replace('\\','/')
        row=next(r for r in plan['targets'] if r['path']==wanted)
        out=(ROOT/row['path']).resolve()
        assert out.is_relative_to(ROOT) and not out.exists(), 'Refuse outside-root or overwrite'
        # Validate first, then create with exclusive open; never overwrite a new build.
        verify_row(row)
        out.parent.mkdir(parents=True,exist_ok=True)
        with out.open('xb') as f: verify_row(row,f)
        print(json.dumps({'restored':str(out),'sha256':row['sha256']}))
    sys.exit()

ARCHIVE.mkdir(parents=True,exist_ok=True)
assert not PLAN.exists(), 'Existing plan must not be overwritten'
protected=[]
for root in ('src','test','deploy','reports/qa'):
    for p in sorted((ROOT/root).rglob('*')):
        if p.is_file() and not p.is_symlink(): protected.append({'path':relative(p),'bytes':p.stat().st_size,'sha256':digest(p)})
# Current and all latest relevant work remain immediately usable.
keep={
 'dist/SC2-Survivors-Current-20261006.html',
 'dist/SC2-Survivors-Loot-Elites-R2-20261019.html',
 'reports/local/performance-d04-20261021/offline-candidate-r23/performance-d04.html',
 'reports/local/performance-d04-20261021/offline-baseline-r2/performance-d04.html',
}
for folder in ('preview/performance-d04-20261021-candidate-r23','preview/performance-d04-20261021-baseline-r2','preview/performance-d03-20261021-candidate-r1','preview/performance-d02-low-20261021-candidate-r3','preview/fun-visuals-20261021-r2'):
    for p in sorted((ROOT/folder).rglob('*')):
        if p.is_file(): protected.append({'path':relative(p),'bytes':p.stat().st_size,'sha256':digest(p)})
save(BASE/'protected-before.json',protected)
records=[];skipped=[]
for base in ('dist','reports/local'):
    for current,dirs,files in os.walk(ROOT/base):
        dirs[:]=[d for d in dirs if d not in ('node_modules','runtime','.git','reconstruction') and not d.startswith('profile')]
        for name in files:
            p=Path(current)/name
            if p.suffix.lower()!='.html' or p.stat().st_size<300*1024*1024: continue
            rel=relative(p)
            # Current parallel gameplay-line releases stay outside the prune scope.
            if any(s in rel for s in ('fun-','mission-','special-','shop-items-')): continue
            size=p.stat().st_size
            with p.open('rb') as f:
                head=f.read(min(size,20*1024*1024));f.seek(max(0,size-64*1024*1024));tail=f.read()
            start=head.find(b'<script id="sc2-resource-pack"')
            end=size-len(tail)+tail.rfind(b'<script>')
            if start<0 or end<=start:
                skipped.append(rel);continue
            row={'path':rel,'bytes':size,'sha256':digest(p),'start':start,'end':end,'payloadSha256':digest(p,start,end)}
            records.append(row)
            print(json.dumps({'scanned':rel,'payload':row['payloadSha256'][:12]}),flush=True)
groups={}
for r in records: groups.setdefault((r['payloadSha256'],r['end']-r['start']),[]).append(r)
targets=[];donors=[]
for rows in groups.values():
    donor=sorted(rows,key=lambda r:(r['path'] not in keep,not r['path'].startswith('dist/'),r['path']))[0]
    donors.append(donor)
    for row in rows:
        if row['path']==donor['path'] or row['path'] in keep: continue
        p=ROOT/row['path']
        with p.open('rb') as f: prefix=f.read(row['start']);f.seek(row['end']);suffix=f.read()
        r={**row,'kind':'shared-payload','prefix':blob(prefix),'suffix':blob(suffix),'donor':{'path':donor['path'],'start':donor['start'],'end':donor['end'],'sha256':donor['sha256'],'payloadSha256':donor['payloadSha256']}}
        verify_row(r); targets.append(r)
        print(json.dumps({'archived':row['path'],'restorationVerified':True}),flush=True)
for p in sorted((ROOT/'preview').glob('performance-d04-20261021-*/main.js')):
    if p.parent.name in ('performance-d04-20261021-candidate-r23','performance-d04-20261021-baseline-r2'):continue
    data=p.read_bytes();r={'path':relative(p),'bytes':len(data),'sha256':sha(data),'kind':'gzip-build','compressed':blob(data)}
    verify_row(r);targets.append(r)
for r in records:
    if r['path'] in keep: protected.append({'path':r['path'],'bytes':r['bytes'],'sha256':r['sha256']})
for d in donors:
    protected.append({'path':d['path'],'bytes':d['bytes'],'sha256':d['sha256']})
save(BASE/'protected-before.json',protected)
plan={'created':time.time(),'scope':'Exact compressed code/HTML wrappers plus unchanged shared payload references. Old full build artifacts may be restored byte-for-byte. Frozen source, build records and raw evidence retained.','targets':targets,'donors':donors,'skipped':skipped,'allScanned':records,'protectedFiles':len(protected),'archiveBytes':sum(p.stat().st_size for p in ARCHIVE.glob('*'))}
save(PLAN,plan)
print(json.dumps({'targets':len(targets),'oldBytes':sum(r['bytes'] for r in targets),'archiveBytes':plan['archiveBytes'],'donors':len(donors),'skipped':skipped,'protected':len(protected)}),flush=True)
