"""Read pinned local XML and shipped-source GLBs; never infer SC catalog merging.
Layered definitions are retained separately because campaign overrides are conditional.
"""
import hashlib, json, pathlib, struct, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
records=read('tools/closeout-actor-dependencies.json')
catalog={}
for record in records:
    path=ROOT/record['installFile']; raw=path.read_bytes()
    assert len(raw)==record['bytes'] and hashlib.sha256(raw).hexdigest()==record['sha256'], path
    kind=path.stem
    for node in ET.fromstring(raw):
        if node.get('id'): catalog.setdefault((kind,node.get('id')),[]).append((record['sourcePath'],node))
def chain(kind,ident,seen=None):
    seen=set() if seen is None else seen
    if ident in seen:return []
    seen.add(ident); result=[]
    for source,node in catalog.get((kind,ident),[]):
        result.append({'source':source,'id':ident,'type':node.tag,'attributes':node.attrib,
            'fields':[{'tag':c.tag,'attributes':c.attrib,'children':[{'tag':s.tag,'attributes':s.attrib} for s in c]} for c in node
                if c.tag not in ('GroupIcon','Wireframe','WireframeShield','SoundArray','UnitIcon','HeroIcon','LifeArmorIcon','AbilSoundArray')]})
        if node.get('parent'):result.extend(chain(kind,node.get('parent'),seen))
    return result
models=[]
for filename in ('three-race-models.json','three-race-elite-models.json','expansion-models.json','m4-air-models.json','f05-rescue-models.json'):
    models.extend(read('tools/'+filename))
families={'reaper','zealot','adept','stalker','sentry','high_templar','immortal','colossus','phoenix','void_ray','carrier'}
models=[m for m in models if '.death' not in m['id'] and (m['id'].startswith('model.hero.') or m['id'].startswith('model.elite.') or m['id'].split('.')[-1] in families|{'barracks','hatchery','pylon','probe'})]
pack={m['id']:m for m in read('assets/private/m3-pack.json')['manifest']}
out=[]
for m in models:
    ident=m.get('modelDataId',m['name']); candidates=[]
    aliases={ident}
    for (kind,mid),entries in catalog.items():
        if kind=='ModelData' and any(any(c.tag=='Model' and c.get('value','').replace('\\','/').lower()==m['assetPath'].lower() for c in n) for _,n in entries):aliases.add(mid)
    for (kind,aid),entries in catalog.items():
        if kind!='ActorData':continue
        if aid in aliases or any(n.tag in ('CActorUnit','CActorMissile') and any((c.tag=='Model' and c.get('value') in aliases) or (c.tag=='On' and c.get('Send','').startswith('ModelSwap ') and c.get('Send').split(' ')[1] in aliases) for c in n) for _,n in entries): candidates.append(aid)
    row={'runtimeId':m['id'],'modelDataId':ident,'modelAliases':sorted(aliases),'originalModel':m['assetPath'],'modelDefinitions':chain('ModelData',ident),
         'actorCandidates':{aid:chain('ActorData',aid) for aid in sorted(candidates)},'status':'source candidates, not merged actor or visual acceptance'}
    p=pack.get(m['id'])
    if p:
        path=ROOT/p['packedFile']; raw=path.read_bytes(); length=struct.unpack_from('<I',raw,12)[0]; gltf=json.loads(raw[20:20+length])
        row['glb']={'path':p['packedFile'],'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'animations':p.get('animations'),
         'mountNodes':[n.get('name') for n in gltf.get('nodes',[]) if any(s in n.get('name','').lower() for s in ('ref_weapon','ref weapon','hardpoint','turret','muzzle'))]}
    out.append(row)
# Flagship intentionally shares the elite carrier model; no invented eighteenth model.
out.append({'runtimeId':'model.hero.purifier_flagship','sharedModel':'model.elite.carrier.1','status':'shares approved elite carrier body; original skill actor mapping remains adaptation'})
report={'build':'B97563','sourceFiles':len(records),'sourceBytes':sum(r['bytes'] for r in records),'modelEntries':len(out),
 'warning':'Layer definitions and parent chains are evidence, not a complete SC2 actor interpreter. Candidate absence is unresolved, never an inferred mapping.', 'models':out,
 'buildingDependencies':{k:chain('ModelData',k) for k in ('PylonBirth','PylonDeath','BarracksDeath','HatcheryDeath','BarracksBuild','HatcheryBuild')},
 'attackActorEvidence':{k:chain('ActorData',k) for k in ('Reaper','Adept','HighTemplar','Colossus','GenericUnitStandard','GenericAttackNoCreateBase','ColossusAttackLaunchSite','ColossusAttackLaunchSiteReverse')}}
dest=ROOT/'reports/local/closeout-source-audit.json'; dest.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'sourceFiles':report['sourceFiles'],'sourceBytes':report['sourceBytes'],'models':len(out),'noActorCandidate':[r['runtimeId'] for r in out if 'actorCandidates' in r and not r['actorCandidates']],'reportBytes':dest.stat().st_size,'reportSha256':hashlib.sha256(dest.read_bytes()).hexdigest()}))
