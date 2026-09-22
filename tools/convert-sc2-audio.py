"""Decode original SC2 IMA ADPCM locally to PCM16; retain rate, channels and every decoded sample."""
from pathlib import Path
import sys,json,hashlib
root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root/'.cache/audio-python'))
try:
 import soundfile as sf
 import numpy as np
except ImportError:
 raise SystemExit('Run: python -m pip install --target .cache/audio-python -r tools/audio-requirements.txt')
def sha(data):return hashlib.sha256(data).hexdigest()
records=[]
for target in json.loads((root/'tools/sc2-casc-targets.json').read_text(encoding='utf-8-sig')):
 if target['format']!='wav':continue
 source=root/target['cachedFile'];destination=root/target['installFile']
 if not source.exists():
  if not destination.exists():continue
  source=root/'assets/private/audio'/destination.name
  source.parent.mkdir(parents=True,exist_ok=True)
  if not source.exists():source.write_bytes(destination.read_bytes())
 original=source.read_bytes()
 if original[:4]!=b'RIFF' or original[8:12]!=b'WAVE':raise ValueError('Invalid original WAV: '+str(source))
 samples,rate=sf.read(source,dtype='int16',always_2d=True)
 sf.write(destination,samples,rate,subtype='PCM_16',format='WAV')
 check,newrate=sf.read(destination,dtype='int16',always_2d=True)
 if newrate!=rate or not np.array_equal(samples,check):raise ValueError('PCM round-trip mismatch')
 output=destination.read_bytes()
 records.append(dict(id=target['id'],source=str(source.relative_to(root)).replace('\\','/'),sourceSha256=sha(original),outputSha256=sha(output),sourceEncoding=sf.info(source).subtype,encoding='PCM_16',sampleRate=rate,channels=samples.shape[1],frames=samples.shape[0],duration=samples.shape[0]/rate,peak=int(np.abs(samples.astype('int32')).max()),bytes=len(output),sampleExact=True,decoder='libsndfile '+sf.__libsndfile_version__,soundfile=sf.__version__))
(root/'assets/private/audio-conversion.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf8')
print('Decoded '+str(len(records))+' original sounds to PCM16; all samples verified.')
