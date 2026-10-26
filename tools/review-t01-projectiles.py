import json,sys,gzip,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('reports/local/t01-20261024')/sys.argv[1]
report=json.loads((root/'report.json').read_text(encoding='utf-8'))
out=root/'review-first-shot';out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',16)
for number in map(int,sys.argv[2].split(',')):
 row=report['rows'][number-1]
 if row['status']!='cycle-captured':continue
 folder=Path(report['evidenceRoot'])/row['directory']
 ev=json.loads(gzip.decompress((folder/report['evidenceFile']).read_bytes()))
 frames=[f for f in ev['frames'] if .1-1e-8<=f['at']<=.35+1e-8]
 near='close-range' in row['id'];air='attack-air' in row['id']
 crop=(610,60 if air else 260,1050 if near else 1390,500)
 width=360;height=round(width*(crop[3]-crop[1])/(crop[2]-crop[0]));stride=height+23
 sheet=Image.new('RGB',(width*5,40+math.ceil(len(frames)/5)*stride),'#12171e');draw=ImageDraw.Draw(sheet)
 draw.text((10,10),row['id']+' | FIRST SHOT, ALL 1/60 STEPS .1-.3s',font=font,fill='white')
 for i,f in enumerate(frames):
  with Image.open(folder/f['file']) as im:sheet.paste(im.crop(crop).resize((width,height)),(i%5*width,40+i//5*stride))
  draw.text((i%5*width+6,40+i//5*stride+height+2),str(round(f['at'],4))+' s',font=font,fill='white')
 sheet.save(out/(row['directory']+'.jpg'),quality=96)
print(json.dumps({'out':str(out)}))
