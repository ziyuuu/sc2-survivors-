import json, hashlib
from pathlib import Path
from PIL import Image, features

base=Path('reports/local/t01-20261024').resolve()
root=base/'card-cycles-r2'/'0037'
e=json.loads((root/'evidence.json').read_text(encoding='utf-8'))
files=[e.get('readyFile','000-ready.'+e['frames'][0]['file'].rsplit('.',1)[1]),*[f['file'] for f in e['frames']]]
frames=[]
for name in files:
    with Image.open(root/name) as im: frames.append(im.convert('RGB'))
out=base/'sequence-compression-probe.webp'
assert not out.exists()
frames[0].save(out,format='WEBP',save_all=True,append_images=frames[1:],lossless=True,method=4,duration=150,loop=0,minimize_size=True)
rows=[]
with Image.open(out) as result:
    assert result.n_frames==len(frames)
    for i,original in enumerate(frames):
        result.seek(i)
        decoded=result.convert('RGB')
        source_hash=hashlib.sha256(original.tobytes()).hexdigest()
        assert hashlib.sha256(decoded.tobytes()).hexdigest()==source_hash
        rows.append({'source':str(root/files[i]),'decodedPixelSHA256':source_hash})
report={'scope':'Storage probe only; all original JPEG evidence is retained. Future capture may store native screenshot pixels in a lossless animation. Not visual acceptance.','webpAvailable':features.check('webp'),'frames':len(frames),'sourceBytes':sum((root/f).stat().st_size for f in files),'packedBytes':out.stat().st_size,'file':str(out),'losslessPixelProof':rows}
(base/'sequence-compression-probe.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='losslessPixelProof'}))
