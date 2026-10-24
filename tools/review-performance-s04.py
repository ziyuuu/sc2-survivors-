from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib,sys
root=Path('reports/local/performance-s04-20261020');args=sys.argv[1:];a,b=args[:2] or ['baseline-1','candidate-1'];cases=args[2].split(',') if len(args)>2 else ['carrier-attributes','carrier-equipment','acid','hero'];prefix=args[3] if len(args)>3 else '';out={'pairs':[],'contacts':[]}
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',18)
for index,names in enumerate([group for group in [cases[:3],cases[3:]] if group]):
 sheet=Image.new('RGB',(1440,480*len(names)),(22,25,31));draw=ImageDraw.Draw(sheet)
 for row,name in enumerate(names):
  arrays=[];files=[]
  for col,run in enumerate([a,b]):
   file=root/run/(name+'-fixed.png');im=Image.open(file).convert('RGB');arrays.append(np.array(im,dtype=np.int16));files.append({'file':str(file),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()});sheet.paste(im.resize((720,450)),(720*col,480*row+30));draw.text((720*col+8,480*row+6),run+' / '+name,font=font,fill='white')
  d=np.abs(arrays[0]-arrays[1]);mask=np.any(d,axis=2);ys,xs=np.where(mask);out['pairs'].append({'name':name,'files':files,'changedPixels':int(mask.sum()),'maxChannelDifference':int(d.max()),'battleRows30to620':int(mask[30:620,:].sum()),'differenceBounds':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]})
 file=root/('contact-'+prefix+'scenes-'+str(index+1)+'.jpg');sheet.save(file,quality=94);out['contacts'].append(str(file))
(root/(prefix+'pixels.json')).write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps(out,indent=2))
