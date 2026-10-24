from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import json, math
base=Path('D:/星际/reports/local/g03-content-20261022')
out=base/'screen-review';out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',20)
records=[]
for folder in ['qa-production-r1','qa-content-r1','qa-content-r2','qa-production-r2']:
    paths=sorted((base/folder/'screens').glob('*.png'))
    for batch in range(math.ceil(len(paths)/4)):
        group=paths[batch*4:batch*4+4]
        canvas=Image.new('RGB',(1920,1280),'#1a2026');draw=ImageDraw.Draw(canvas)
        for i,p in enumerate(group):
            img=Image.open(p).convert('RGB');thumb=ImageOps.contain(img,(950,590));x=(i%2)*960+(950-thumb.width)//2;y=(i//2)*640+40
            canvas.paste(thumb,(x,y));draw.text(((i%2)*960+8,(i//2)*640+8),p.name,font=font,fill='white');records.append({'file':str(p),'size':img.size,'sheet':f'{folder}-{batch+1}.jpg'})
        canvas.save(out/f'{folder}-{batch+1}.jpg',quality=92)
(out/'index.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'screens':len(records),'sheets':len(list(out.glob('*.jpg')))}))
