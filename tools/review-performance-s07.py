from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,sys
suffix=sys.argv[1] if len(sys.argv)>1 else '1'
output='' if suffix=='1' else '-r'+suffix
root=Path('reports/local/performance-s07-20261020')
out={'pairs':[],'contacts':[]}
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',18)
for case in ['dense','elites','traversal','baneling','temporary']:
 sheet=Image.new('RGB',(1440,960),(22,25,31));draw=ImageDraw.Draw(sheet)
 for row,phase in enumerate(['initial','end']):
  name=f'{case}-{phase}';arrays=[]
  for col,run in enumerate(['baseline-'+suffix,'candidate-'+suffix]):
   file=root/run/(name+'.png');im=Image.open(file).convert('RGB');arrays.append(np.array(im,dtype=np.int16))
   sheet.paste(im.resize((720,450)),(720*col,480*row+30));draw.text((720*col+8,480*row+6),run+' / '+name,font=font,fill='white')
  delta=np.abs(arrays[0]-arrays[1]);mask=np.any(delta,axis=2);ys,xs=np.where(mask)
  outside=mask.copy();outside[670:886,20:246]=False;outside[694:730,650:766]=False
  out['pairs'].append({'name':name,'changedPixels':int(mask.sum()),'battleRows30to620':int(mask[30:620].sum()),'outsideMinimapAndCollapseButton':int(outside.sum()),'maxChannelDifference':int(delta.max()),'bounds':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]})
 file=root/f'contact-{case}{output}.jpg';sheet.save(file,quality=94);out['contacts'].append(str(file))
(root/('pixels'+output+'.json')).write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps(out,indent=2))
