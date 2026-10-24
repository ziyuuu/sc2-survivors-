"""Verify retained source, current builds, shared payloads and exact restore recipes."""
import gzip, hashlib, json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
base=root/'reports/local/disk-cleanup-d04-20261021'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        while b:=f.read(8*1024*1024):h.update(b)
    return h.hexdigest()
plan=load(base/'build-plan.json')
protected=load(base/'protected-before.json')
errors=[]; checked={}
def check(path, expected, size=None):
    p=root/path
    if not p.is_file():errors.append({'path':path,'error':'missing'});return
    if path not in checked:checked[path]=digest(p)
    if checked[path]!=expected or (size is not None and p.stat().st_size!=size):errors.append({'path':path,'error':'changed'})
for row in protected:check(row['path'],row['sha256'],row['bytes'])
print(json.dumps({'protectedChecked':len(protected),'errors':len(errors)}),flush=True)
for row in plan['targets']:
    if (root/row['path']).exists():errors.append({'path':row['path'],'error':'old build still present'})
    for key in ('compressed','prefix','suffix'):
        if key in row:
            p=root/row[key]
            if not p.exists():errors.append({'path':row[key],'error':'archive missing'});continue
            if hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest()!=p.stem:errors.append({'path':row[key],'error':'compressed content changed'})
    if row['kind']=='shared-payload':check(row['donor']['path'],row['donor']['sha256'])
assetmap=load(root/'reports/local/performance-a03-20261021/asset-files-r2.json')
for item in assetmap.values():check(item['source'],item['sha256'],item['bytes'])
print(json.dumps({'assetSourcesChecked':len(assetmap),'errors':len(errors)}),flush=True)
evidence=load(root/'reports/qa/performance-d04-20261021.json')['evidence']
archived={r['path']:r for r in plan['targets']}
retained_evidence=0;archived_evidence=0
for item in evidence:
    name=item.get('file',item.get('path'))
    if not name or 'sha256' not in item:continue
    if name in archived:
        archived_evidence+=1
        if item['sha256']!=archived[name]['sha256']:errors.append({'path':name,'error':'archived evidence hash mismatch'})
    else:
        retained_evidence+=1;check(name,item['sha256'],item.get('bytes'))
result={'pass':not errors,'protectedFiles':len(protected),'assetSources':len(assetmap),'d04EvidenceRetained':retained_evidence,'d04EvidenceArchivedReconstructable':archived_evidence,'archivedBuilds':len(plan['targets']),'compressedArchiveFiles':len(list((base/'reconstruction').glob('*.gz'))),'uniqueFilesHashed':len(checked),'errors':errors,'verificationMethod':'Every reconstructed stream was SHA-256 and length matched before deletion. After deletion, all donor files and decompressed wrapper/code blobs are checked again, so the same exact reconstruction remains available without writing large temporary copies.'}
(base/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=True),flush=True)
assert result['pass'],errors
