from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib,sys
root=Path('reports/local/performance-s06-20261020');a,b=sys.argv[1:3];names=[f'{case}-{phase}' for case in ['spawn','carrier','baneling-approach','baneling-mixed'] for phase in ['initial','end']];out={'pairs':[],'contacts':[]}
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',18)
for index in range(0,len(names),3):
 group=names[index:index+3];sheet=Image.new('RGB',(1440,480*len(group)),(22,25,31));draw=ImageDraw.Draw(sheet)
 for row,name in enumerate(group):
  arrays=[]
  for col,run in enumerate([a,b]):
   file=root/run/(name+'.png');im=Image.open(file).convert('RGB');arrays.append(np.array(im,dtype=np.int16));sheet.paste(im.resize((720,450)),(720*col,480*row+30));draw.text((720*col+8,480*row+6),run+' / '+name,font=font,fill='white')
  delta=np.abs(arrays[0]-arrays[1]);mask=np.any(delta,axis=2);ys,xs=np.where(mask);out['pairs'].append({'name':name,'changedPixels':int(mask.sum()),'battleRows30to620':int(mask[30:620].sum()),'maxChannelDifference':int(delta.max()),'bounds':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]})
 file=root/f'contact-{index//3+1}.jpg';sheet.save(file,quality=94);out['contacts'].append(str(file))
(root/'pixels.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps(out,indent=2))
