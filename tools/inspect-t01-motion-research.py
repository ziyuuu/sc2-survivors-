"""Decode the source shortlist for integrity and signal checks, without editing audio."""
from pathlib import Path
import sys,json,hashlib
root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root/'.cache/t01-all-motion/python'))
import soundfile as sf
import numpy as np
target=root/'.cache/t01-all-motion/downloads.json'
rows=json.loads(target.read_text(encoding='utf-8-sig'))
for row in rows:
    source=Path(row['file'])
    if hashlib.sha256(source.read_bytes()).hexdigest()!=row['sha256']:
        raise ValueError('Original source hash changed: '+str(source))
    samples,rate=sf.read(source,dtype='float32',always_2d=True)
    peak=float(np.abs(samples).max())
    if not np.isfinite(samples).all() or not peak:
        raise ValueError('Invalid or silent original: '+str(source))
    row['audio']={'sourceEncoding':sf.info(source).subtype,'channels':samples.shape[1],
                  'sampleRate':rate,'frames':samples.shape[0],'duration':samples.shape[0]/rate,
                  'peak':peak,'rms':float(np.sqrt(np.mean(samples**2))),
                  'decoder':'libsndfile '+sf.__libsndfile_version__}
target.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'decoded':len(rows),'seconds':sum(r['audio']['duration'] for r in rows),
                  'sourceBytes':sum(r['bytes'] for r in rows),'allNonzeroSignal':True}))
