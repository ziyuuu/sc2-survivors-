"""Read-only, local M3/M3A cross-check with the separately authored M3Studio reader.
No Blender rendering or human visual approval is implied. Source bytes are hash-pinned.
"""
import argparse, hashlib, importlib.util, json, pathlib, struct, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/m3studio'
PINS = {'io_m3.py':'9bd7b3f8632f9ba5e614d19d847ab1ca34bee448f4d1687a0a817e05e7ec901e', 'structures.xml':'d50574e91b5c885698c04f7c010ad2461a1de233873b118070da71e7e559df32', 'LICENSE':'b90ed8150a6d371c84b7dbaa680cd0e9893ef7c2558765e1e00930513efcfe3b'}
args=argparse.ArgumentParser();args.add_argument('--download-reader',action='store_true');opt=args.parse_args()
for name, digest in PINS.items():
    target=CACHE/name
    if not target.exists() and opt.download_reader:
        payload=urllib.request.urlopen('https://cdn.jsdelivr.net/gh/Solstice245/m3studio@main/'+name,timeout=30).read()
        assert hashlib.sha256(payload).hexdigest()==digest, 'Changed upstream source; review before updating pin'
        CACHE.mkdir(parents=True,exist_ok=True);target.write_bytes(payload)
    assert target.exists(), f'Missing {target}; use --download-reader (requires network)'
    assert hashlib.sha256(target.read_bytes()).hexdigest()==digest, f'Unverified reader: {name}'
spec=importlib.util.spec_from_file_location('independent_m3studio',CACHE/'io_m3.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
pack=json.loads((ROOT/'assets/private/m3-pack.json').read_text(encoding='utf8'))
def text(s,ref): return s[ref].content_to_string().rstrip('\0')
def load(url): return reader.M3SectionList.load(str(ROOT/'assets/private/m3'/url.replace('\\','/').rsplit('/',1)[-1].lower()))
def sequences(s): return {text(s,q.name):(q.anim_ms_end-q.anim_ms_start)/1000 for q in s[s.model.sequences]}
def ids(s): return {(getattr(b,k).header.id,k):text(s,b.name) for b in s[s.model.bones] for k in ['location','rotation','scale']}
report={'method':'Independent M3Studio binary reader vs shipped GLB source names, bone IDs and clip durations. Local only; not a Blender-render or human visual acceptance.', 'readerSources':PINS,'models':[], 'external':[], 'mismatches':[]}
for a in pack['manifest']:
    if a['kind']!='model': continue
    s=load(a.get('sourcePath',a['source']));seq=sequences(s);bones=[text(s,b.name) for b in s[s.model.bones]]
    raw=(ROOT/a['packedFile']).read_bytes();assert raw[:4]==b'glTF';gltf=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
    names={n.get('name') for n in gltf.get('nodes',[])};missing=[n for n in bones if n not in names]
    checked=0
    for c in a['clipSources']:
        if c['source']!=a['source']: continue
        if c['name'] not in seq or abs(seq[c['name']]-c['duration'])>.0011:
            report['mismatches'].append({'id':a['id'],'clip':c['name'],'sourceDuration':seq.get(c['name']),'exportDuration':c['duration']})
        checked+=1
    static_projection=not gltf.get('skins') and not gltf.get('animations') and any(g.get('role')=='original-ground-projection' for g in a.get('geometry',[]))
    if missing and not static_projection: report['mismatches'].append({'id':a['id'],'missingBones':missing})
    report['models'].append({'id':a['id'],'source':a['source'],'bones':len(bones),'bonesPresentInGlb':len(bones)-len(missing),'staticProjectionTransformBaked':static_projection,'originalSequences':len(seq),'checkedExportedClips':checked,'glbClips':len(gltf.get('animations',[]))})
    original=ids(s)
    for extra in a.get('additionalAnimations',[]):
        if extra.get('status')=='missing': continue
        e=load(extra['source']);mapping=ids(e);matched=sum(key in original for key in mapping)
        report['external'].append({'id':a['id'],'source':extra['source'],'originalSequences':sequences(e),'transformIds':len(mapping),'matchedIds':matched,'imported':extra['clips'],'usedForCombat':False,'binding':'accepted clips match base transform IDs' if extra['clips'] else 'rejected: not all track IDs bind to current base skeleton'})
report['totals']={'models':len(report['models']),'bones':sum(m['bones'] for m in report['models']),'clips':sum(m['checkedExportedClips'] for m in report['models']),'mismatches':len(report['mismatches'])}
out=ROOT/'reports/local/m3-independent.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report['totals']));print(json.dumps(report['external'],ensure_ascii=False))
if report['mismatches']: print(json.dumps(report['mismatches'],ensure_ascii=False));raise SystemExit(1)
