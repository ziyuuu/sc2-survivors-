"""Reconstruct only this task's two obsolete R1 offline builds from final R2 asset payload. Does not delete files."""
from pathlib import Path
import json,gzip,hashlib,sys
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'reports/local/feedback-r4-20261022';PLAN=BASE/'archive-r1-plan.json';OUT=BASE/'archive-r1'
def digest(parts):
 h=hashlib.sha256();n=0
 for b in parts:h.update(b);n+=len(b)
 return n,h.hexdigest()
def chunks(p,start=0,end=None):
 with p.open('rb') as f:
  f.seek(start);n=(p.stat().st_size if end is None else end)-start
  while n:
   b=f.read(min(n,4*1024*1024));assert b;n-=len(b);yield b
def restored(row):
 yield gzip.decompress((ROOT/row['prefix']).read_bytes())
 d=row['donor'];yield from chunks(ROOT/d['path'],d['start'],d['end'])
 yield gzip.decompress((ROOT/row['suffix']).read_bytes())
def verify(row):assert digest(restored(row))==(row['bytes'],row['sha256']),row['path']
if PLAN.exists():
 plan=json.loads(PLAN.read_text(encoding='utf-8'))
 for row in plan['targets']:verify(row)
 if len(sys.argv)>2 and sys.argv[1]=='restore':
  row=next(x for x in plan['targets'] if x['path']==sys.argv[2].replace('\\','/'));dest=(ROOT/row['path']).resolve();assert dest.is_relative_to(BASE.resolve()) and not dest.exists()
  with dest.open('xb') as f:
   for b in restored(row):f.write(b)
 print(json.dumps({'pass':True,'verified':len(plan['targets'])}));sys.exit()
OUT.mkdir(exist_ok=True);rows=[]
for mode in ['game','lab']:
 p=BASE/f'offline-{mode}-r1.html';donor=BASE/f'offline-{mode}-r2.html';meta=json.loads((BASE/f'offline-{mode}-r1-build.json').read_text());final=json.loads((BASE/f'offline-{mode}-r2-build.json').read_text())
 def bounds(file,meta):
  with file.open('rb') as f:head=f.read(2*1024*1024)
  start=head.index(b'<script id="sc2-resource-pack"');return start,start+meta['copiedAssetSectionBytes']
 start,end=bounds(p,meta);ds,de=bounds(donor,final);assert digest(chunks(p,start,end))==digest(chunks(donor,ds,de))
 with p.open('rb') as f:prefix=f.read(start);f.seek(end);suffix=f.read()
 pre=OUT/(mode+'-prefix.gz');suf=OUT/(mode+'-suffix.gz');pre.write_bytes(gzip.compress(prefix,mtime=0));suf.write_bytes(gzip.compress(suffix,mtime=0))
 row={'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':meta['htmlSha256'],'prefix':pre.relative_to(ROOT).as_posix(),'suffix':suf.relative_to(ROOT).as_posix(),'donor':{'path':donor.relative_to(ROOT).as_posix(),'start':ds,'end':de,'htmlSha256':final['htmlSha256']}}
 assert digest(chunks(p))==(row['bytes'],row['sha256']);verify(row);rows.append(row)
plan={'pass':True,'method':'Exact gzip prefix/suffix plus final R2 shared asset section. Restore with python tools/archive-feedback-r4.py restore <path>. Full files may be removed only after separate path validation.','targets':rows,'compressedBytes':sum(p.stat().st_size for p in OUT.glob('*.gz')),'originalBytes':sum(r['bytes'] for r in rows)}
PLAN.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'pass':True,'targets':len(rows),'originalBytes':plan['originalBytes'],'compressedBytes':plan['compressedBytes']}))
