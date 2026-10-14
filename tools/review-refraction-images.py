"""Build local contact sheets from immutable screenshots; never replace evidence."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root=Path('reports/local/refraction-science-20261013')
out=root/'review-sheets'
out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',16)
paired=json.loads((root/'paired-state-comparison.json').read_text(encoding='utf-8'))
gpu=json.loads((root/'gpu-r4/result.json').read_text(encoding='utf-8'))
selected=[]
for group in dict.fromkeys(p['group'] for p in paired['pairs'] if p['category']=='native'):
    rows=[p for p in paired['pairs'] if p['category']=='native' and p['group']==group]
    wanted='--death-12' if group.startswith('science_vessel') else '--after-12'
    p=next(p for p in rows if p['name'].endswith(wanted))
    for side in ['left','right']:selected.append({'category':'native','name':p['name']+' / '+side,'file':p[side]})
metrics=[]
for p in gpu['records']:
    a=np.array(Image.open(root/'gpu-r4'/p['off']['file']).convert('RGB')).astype(np.int16)
    b=np.array(Image.open(root/'gpu-r4'/p['on']['file']).convert('RGB')).astype(np.int16)
    delta=np.max(np.abs(a-b),axis=2)
    metrics.append({'model':p['model'],'age':p['age'],'changedPixels':int(np.count_nonzero(delta)),'maxDifference':int(delta.max()),'record':p})
for model in dict.fromkeys(p['model'] for p in metrics):
    p=max((p for p in metrics if p['model']==model),key=lambda p:p['changedPixels'])
    for side in ['off','on']:selected.append({'category':'isolated','name':model+' / '+str(p['age'])+' / '+side,'file':'gpu-r4/'+p['record'][side]['file']})
life=json.loads((root/'lifecycle-r1/result.json').read_text(encoding='utf-8'))
for p in life['records']:selected.append({'category':'lifecycle','name':p['name'],'file':'lifecycle-r1/'+p['name']+'.png'})
pages=[]
for category in ['native','isolated','lifecycle']:
    rows=[p for p in selected if p['category']==category]
    for offset in range(0,len(rows),8):
        group=rows[offset:offset+8]
        sheet=Image.new('RGB',(1280,4*394),'#111820')
        draw=ImageDraw.Draw(sheet)
        for i,p in enumerate(group):
            x=(i%2)*640;y=(i//2)*394
            image=Image.open(root/p['file']).convert('RGB');image.thumbnail((640,360))
            sheet.paste(image,(x,y+30));draw.text((x+9,y+6),p['name'],fill='#dce8f2',font=font)
        name=category+'-'+str(offset//8+1)+'.jpg';sheet.save(out/name,quality=92)
        pages.append({'file':'review-sheets/'+name,'records':group})
(root/'review-selection.json').write_text(json.dumps({'status':'SHEETS_GENERATED_REVIEW_PENDING','selectedImages':len(selected),'pages':pages,'isolatedMetrics':[{k:v for k,v in p.items() if k!='record'} for p in metrics]},indent=2),encoding='utf-8')
print(json.dumps({'selected':len(selected),'sheets':len(pages)}))
