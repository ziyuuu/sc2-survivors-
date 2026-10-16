"""Resolve the bounded equipment presentation additions against pinned source XML."""
import hashlib, json, sys
import xml.etree.ElementTree as ET
from pathlib import Path

out=Path(sys.argv[1])
if out.exists(): raise RuntimeError('Choose a new source evidence directory')
ids=['AutoTurretAttackLaunch','AutoTurretAttackImpact','PhotonCannonWeapon','PhotonCannonAttackImpact','SpineCrawlerAttackImpactReactionFlesh','DropPodLand','BurrowFXSmall','BurrowFXLarge','WarpTrainModel','BlinkOriginModel','NeuralParasiteModel']
all_models='--all' in sys.argv[2:]
if all_models: ids=[m['modelDataId'] for m in json.loads(Path('tools/equipment-effects-models.json').read_text(encoding='utf-8-sig'))]+ids
records=[]
for name in ['closeout-actor-dependencies','combat-effects-catalog-dependencies']:
 records+=json.loads(Path('tools/'+name+'.json').read_text(encoding='utf-8-sig'))
known={r['installFile'].replace('\\','/').lower():r for r in records}
models={};sources=[]
for layer in ['core','liberty','swarm','void','libertymulti','swarmmulti','voidmulti','balancemulti']:
 path=Path('assets/private/actor-source/mods/'+layer+'.sc2mod/base.sc2data/GameData/ModelData.xml')
 if not path.exists(): continue
 data=path.read_bytes();sha=hashlib.sha256(data).hexdigest();r=known[str(path).replace('\\','/').lower()]
 assert sha==r['sha256'] and len(data)==r['bytes'],path
 sources.append(dict(file=path.as_posix(),sha256=sha,bytes=len(data)))
 for n in ET.fromstring(data):
  id=n.get('id') or ('@'+n.tag if n.get('default')=='1' else '')
  if id: models.setdefault(id,[]).append((path,n))
def chain(id,seen=()):
 assert id not in seen
 own=models.get(id,[]);parent=next((n.get('parent') for _,n in reversed(own) if n.get('parent')),None)
 return (chain(parent,seen+(id,)) if parent else chain('@CModel',seen+(id,)) if id!='@CModel' else [])+own
resolved=[]
for id in ids:
 nodes=chain(id);fields={child.tag:child.attrib for _,n in nodes for child in n}
 asset=fields['Model']['value'].replace('\\','/')
 resolved.append(dict(id='model.combat-fx.'+id,modelDataId=id,name=Path(asset).stem.lower(),assetPath=asset,scale=list(map(float,fields.get('ScaleMin',{}).get('value','1,1,1').split(','))),definitions=[dict(file=p.as_posix(),xml=ET.tostring(n,encoding='unicode')) for p,n in nodes]))
out.mkdir(parents=True)
(out/'source-map.json').write_text(json.dumps(dict(routes=[],models=resolved,sources=sources),indent=2),encoding='utf-8')
(out/'models.json' if all_models else Path('tools/equipment-effects-wave2-models.json')).write_text(json.dumps(resolved,indent=2),encoding='utf-8')
if all_models:
 catalog=json.loads(Path('src/render/effects/source/catalog.json').read_text(encoding='utf-8'))
 for m in resolved:
  assert catalog[m['modelDataId']]['scale']==m['scale'],(m['modelDataId'],catalog[m['modelDataId']]['scale'],m['scale'])
print('Resolved',len(resolved),'models against',len(sources),'verified catalogs')
