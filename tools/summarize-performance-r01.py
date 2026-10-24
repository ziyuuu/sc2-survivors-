import json, pathlib, statistics
import numpy as np
from PIL import Image,ImageDraw
root=pathlib.Path('reports/local/performance-r01-20261020')
report=json.loads((root/'paired-r2/report.json').read_text(encoding='utf-8'))
result={'gpu':[],'pixels':[]}
median=statistics.median
for case in report['scenarios']:
 for stage in ['ground','total']:
  samples=[x for x in report['samples'] if x['key']==case['key'] and x['stage']==stage]
  values={v:[median(x['gpuMs']) for x in samples if x['variant']==v] for v in ['baseline','candidate']}
  a,b=values['baseline'],values['candidate']
  result['gpu'].append({'key':case['key'],'stage':stage,'baseline':median(a),'candidate':median(b),'reductionPercent':(1-median(b)/median(a))*100,'fasterPairs':sum(y<x for x,y in zip(a,b)),'rounds':len(a),'roundMedians':values,'allFrameRange':{v:[min(t for x in samples if x['variant']==v for t in x['gpuMs']),max(t for x in samples if x['variant']==v for t in x['gpuMs'])] for v in values}})
 pairs=[x for x in report['screens'] if x['key']==case['key']]
 images={x['variant']:Image.open(x['file']).convert('RGB') for x in pairs}
 diff=np.abs(np.array(images['baseline']).astype(int)-np.array(images['candidate']).astype(int))
 mask=(diff>0).any(axis=2);ys,xs=np.where(mask)
 result['pixels'].append({'key':case['key'],'changedPixels':int(mask.sum()),'maxChannel':int(diff.max()),'bounds':None if not mask.any() else [int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]})
 canvas=Image.new('RGB',(1440,476),'#182028');draw=ImageDraw.Draw(canvas)
 for j,v in enumerate(['baseline','candidate']):
  draw.text((j*720+8,6),case['key']+' '+v,fill='white');canvas.paste(images[v].resize((720,450)),(j*720,26))
 canvas.save(root/('paired-r2/contact-'+case['key']+'.jpg'),quality=93)
(root/'summary-r2.json').write_text(json.dumps(result,indent=2))
boundary_file=root/'boundaries-r1/report.json'
if boundary_file.exists():
 boundary=json.loads(boundary_file.read_text(encoding='utf-8'))
 out=[]
 for case in boundary['cases']:
  if len(case['variants'])!=2:continue
  images={v['variant']:Image.open(v['file']).convert('RGB') for v in case['variants']}
  a,b=[np.array(images[v]).astype(int) for v in ['baseline','candidate']]
  diff=np.abs(a-b);mask=(diff>0).any(axis=2);ys,xs=np.where(mask)
  out.append({'key':case['key'],'changedPixels':int(mask.sum()),'maxChannel':int(diff.max()),'bounds':None if not mask.any() else [int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]})
  h=round(images['baseline'].height*720/images['baseline'].width);canvas=Image.new('RGB',(1440,h+26),'#182028');draw=ImageDraw.Draw(canvas)
  for j,v in enumerate(['baseline','candidate']):
   draw.text((j*720+8,6),case['key']+' '+v,fill='white');canvas.paste(images[v].resize((720,h)),(j*720,26))
  canvas.save(root/('boundaries-r1/contact-'+case['key']+'.jpg'),quality=93)
 (root/'boundary-pixels-r1.json').write_text(json.dumps(out,indent=2))
 print(json.dumps({'boundaryPixels':out}))
print(json.dumps({'gpu':[{k:v for k,v in x.items() if k not in ['roundMedians','allFrameRange']} for x in result['gpu']],'pixels':result['pixels']}))
