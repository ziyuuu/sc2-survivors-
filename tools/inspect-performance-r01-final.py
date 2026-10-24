import json,pathlib,numpy as np
from PIL import Image,ImageDraw
root=pathlib.Path('reports/local/performance-r01-20261020')
report=json.loads((root/'candidate-r2-final-1/report.json').read_text(encoding='utf-8'))
assert report.get('pass')
screens=report['screens'];out={'comparisons':[],'contactSheets':[]}
for i in range(0,len(screens),4):
 chunk=screens[i:i+4];canvas=Image.new('RGB',(1440,476*((len(chunk)+1)//2)),'#182028');draw=ImageDraw.Draw(canvas)
 for j,entry in enumerate(chunk):
  image=Image.open(entry['file']).convert('RGB');draw.text(((j%2)*720+8,(j//2)*476+6),entry['name'],fill='white');canvas.paste(image.resize((720,450)),((j%2)*720,(j//2)*476+26))
 file=root/f'candidate-r2-final-1/contact-{i//4+1}.jpg';canvas.save(file,quality=93);out['contactSheets'].append(str(file))
def compare(label,a,b):
 aa=np.array(Image.open(a).convert('RGB')).astype(int);bb=np.array(Image.open(b).convert('RGB')).astype(int)
 diff=np.abs(aa-bb);mask=(diff>0).any(axis=2);ys,xs=np.where(mask)
 out['comparisons'].append({'label':label,'before':str(a),'after':str(b),'changedPixels':int(mask.sum()),'maxChannel':int(diff.max()),'bounds':None if not mask.any() else [int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]})
for key in ['quiet-industrial','quiet-mar-sara','quiet-char','quiet-ice','quiet-frontier','ranged-300-char','psionic-char']:
 name=key if key.startswith('quiet-') else key.removesuffix('-char')
 compare('actual-candidate-vs-injected-'+key,root/f'paired-r2/{key}-candidate.png',root/f'candidate-r2-final-1/{name}.png')
compare('actual-context-recovery',root/'candidate-r2-final-1/before-recovery.png',root/'candidate-r2-final-1/after-recovery.png')
for theme in ['industrial','mar-sara','char','ice','frontier']:
 compare('map-restored-'+theme,root/f'candidate-r2-final-1/quiet-{theme}.png',root/f'candidate-r2-final-1/restored-{theme}.png')
(root/'final-pixels.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps(out))
