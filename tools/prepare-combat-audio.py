"""Original audio -> sample-exact PCM16 plus reproducible runtime registry."""
from pathlib import Path
import sys, json, hashlib
root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root/'.cache/audio-python'))
import soundfile as sf
import numpy as np
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads((root/p).read_text(encoding='utf-8-sig'))
pins=read('tools/t01-audio-dependencies.json');requests=read('.cache/t01-audio/requests.json');plan=read('.cache/t01-audio/source-plan.json')
records=[];converted={}
for request in requests:
 matches=[p for p in pins if p['sourcePath'].lower().endswith('/'+request['path'].lower())]
 if len(matches)!=1:raise ValueError('Missing/ambiguous original: '+request['path'])
 pin=matches[0];source=root/pin['installFile'];original=source.read_bytes()
 if sha(original)!=pin['sha256']:raise ValueError('Original checksum differs: '+str(source))
 data,rate=sf.read(source,dtype='int16',always_2d=True)
 if len(data)==0 or rate<8000:raise ValueError('Empty/invalid sound '+str(source))
 dest=root/'.cache/t01-audio/decoded.wav';sf.write(dest,data,rate,subtype='PCM_16',format='WAV');check,checkrate=sf.read(dest,dtype='int16',always_2d=True)
 if checkrate!=rate or not np.array_equal(data,check):raise ValueError('PCM sample mismatch')
 output=dest.read_bytes();digest=sha(output);url='assets/combat-audio/'+digest+'.wav';git='deploy/runtime/assets/'+digest+'.wav';packed='public/'+url
 for path in [git,packed]:
  target=root/path;target.parent.mkdir(parents=True,exist_ok=True)
  if target.exists():
   if sha(target.read_bytes())!=digest:raise ValueError('Preserving changed output '+path)
  else:target.write_bytes(output)
 records.append(dict(id=request['id'],kind='audio',status='available',required=True,url=url,packedFile=packed,gitPath=git,bytes=len(output),packedSha256=digest,sourceFile=pin['installFile'],sourceSha256=pin['sha256'],sourcePath=pin['sourcePath'],sampleRate=rate,channels=data.shape[1],frames=len(data),duration=len(data)/rate,sourceEncoding=sf.info(source).subtype,encoding='PCM_16',sampleExact=True,decoder='libsndfile '+sf.__libsndfile_version__))
 converted[digest]=len(output)
runtime=[{k:r[k] for k in ['id','kind','status','required','url']} for r in records]
generated='// Generated from pinned SC2 B97563 SoundData by tools/prepare-combat-audio.py.\nexport const COMBAT_AUDIO_ASSETS = '+json.dumps(runtime,separators=(',',':'))+';\n'
(root/'src/assets/combat-audio.ts').write_text(generated,encoding='utf8',newline='\n')
duration_by_asset={r['id'].replace('audio.',''):r['duration'] for r in records}
for bank in plan['banks'].values():
 bank.pop('chain',None)
 bank['maxDuration']=max(duration_by_asset[s['asset']] for s in bank['samples'])
for weapon in plan['weapons'].values():weapon.pop('source',None)
catalog=json.dumps(plan,separators=(',',':'))
(root/'src/data/combat-audio.json').write_text(catalog,encoding='utf8',newline='\n')
registry=dict(version=1,sourceBuild='B97563',generatedSha256=sha(generated.encode()),catalogSha256=sha(catalog.encode()),records=records)
(root/'deploy/runtime/combat-audio.json').write_text(json.dumps(registry,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(records=len(records),uniqueFiles=len(converted),bytes=sum(converted.values()),seconds=sum(r['duration'] for r in records),sampleExact=True)))
