"""Append the armed batch's pinned sample-exact audio; retain every shipping row."""
import json,sys,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root/'.cache/audio-python'))
sys.path.insert(0,str(root/'.cache/armed-audio-python'))
import soundfile as sf
import numpy as np
def read(p):return json.loads((root/p).read_text(encoding='utf-8-sig'))
def sha(b):return hashlib.sha256(b).hexdigest()
six='--six' in sys.argv
bio='--bio' in sys.argv
out='.cache/t01-audio/' if bio or six else 'reports/local/armed-support-design-20261111/audio/'
requests=read(out+'requests.json')
if six:
 source=read(out+'source-plan.json')
 routes={'weapons':['ghost','widow_mine','widow_mine-air','cyclone','liberator','liberator-ag'],'deaths':['ghost','widow_mine','cyclone','raven','liberator','battlecruiser'],'skills':['six_weak','six_interfere','six_shredder']}
 selected={group:{k:source[group][k] for k in keys} for group,keys in routes.items()}
 keys={k for k in source['banks'] if '"'+k+'"' in json.dumps(selected)}
 banks={k:{p:v for p,v in source['banks'][k].items() if p!='chain'} for k in keys}
 wanted={'audio.'+s['asset'] for b in banks.values() for s in b['samples']}
 requests=[r for r in requests if r['id'] in wanted]
 assert {r['id'] for r in requests}==wanted
 if '--requests' in sys.argv:
  (root/out/'six-requests.json').write_text(json.dumps(requests),encoding='utf-8')
  sys.exit(0)
elif bio:
 key='melee:Overlord_Death'
 bank=read(out+'source-plan.json')['banks'][key]
 bank.pop('chain',None)
 banks={key:bank}
 wanted={'audio.'+sample['asset'] for sample in bank['samples']}
 requests=[r for r in requests if r['id'] in wanted]
 assert {r['id'] for r in requests}==wanted
else:
 banks=read(out+'banks.json')
pins=read('tools/terran-six-audio-dependencies.json' if six else 'tools/t01-audio-dependencies.json');registry=read('deploy/runtime/combat-audio.json');plan=read('src/data/combat-audio.json');records=registry['records']
for request in requests:
 if any(r['id']==request['id'] for r in records):continue
 matches=[p for p in pins if p['sourcePath'].lower().endswith('/'+request['path'].lower())]
 if len(matches)!=1:raise ValueError('Missing/ambiguous pinned audio '+request['path'])
 pin=matches[0];source=root/pin['installFile'];assert sha(source.read_bytes())==pin['sha256']
 data,rate=sf.read(source,dtype='int16',always_2d=True);temp=root/out/'decoded.wav';sf.write(temp,data,rate,subtype='PCM_16',format='WAV');check,clock=sf.read(temp,dtype='int16',always_2d=True);assert clock==rate and np.array_equal(data,check)
 b=temp.read_bytes();digest=sha(b);url='assets/combat-audio/'+digest+'.wav';git='deploy/runtime/assets/'+digest+'.wav'
 for p in [git,'public/'+url]:
  target=root/p;target.parent.mkdir(parents=True,exist_ok=True)
  if target.exists():assert sha(target.read_bytes())==digest
  else:target.write_bytes(b)
 records.append(dict(id=request['id'],kind='audio',status='available',required=True,url=url,packedFile='public/'+url,gitPath=git,bytes=len(b),packedSha256=digest,sourceFile=pin['installFile'],sourceSha256=pin['sha256'],sourcePath=pin['sourcePath'],sampleRate=rate,channels=data.shape[1],frames=len(data),duration=len(data)/rate,sourceEncoding=sf.info(source).subtype,encoding='PCM_16',sampleExact=True,decoder='libsndfile '+sf.__libsndfile_version__))
durations={r['id'].replace('audio.',''):r['duration'] for r in records}
for key,bank in banks.items():bank['maxDuration']=max(durations[s['asset']] for s in bank['samples']);plan['banks'][key]=bank
if six:
 for group,items in selected.items():plan[group].update(items)
elif bio:
 plan['deaths']['overlord']=['melee:Overlord_Death']
else:
 plan['weapons']['building:planetary']=dict(attack='melee:PlanetaryFortress_AttackLaunch',impact='melee:PlanetaryFortress_AttackImpact',surfaces={})
runtime=[{k:r[k] for k in ['id','kind','status','required','url']} for r in records]
generated='// Generated from pinned SC2 B97563 SoundData by tools/prepare-combat-audio.py.\nexport const COMBAT_AUDIO_ASSETS = '+json.dumps(runtime,separators=(',',':'))+';\n'
catalog=json.dumps(plan,separators=(',',':'));registry['generatedSha256']=sha(generated.encode());registry['catalogSha256']=sha(catalog.encode())
for p,s in [('src/assets/combat-audio.ts',generated),('src/data/combat-audio.json',catalog),('deploy/runtime/combat-audio.json',json.dumps(registry,indent=2)+'\n')]: (root/p).write_text(s,encoding='utf-8',newline='\n')
print(json.dumps(dict(records=len(records),banks=len(banks),sampleExact=True)))
