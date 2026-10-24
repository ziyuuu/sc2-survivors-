from pathlib import Path
from PIL import Image, ImageDraw
import json
base=Path('D:/星际/reports/local/integration-i02-20261022')
out=base/'visual-review';out.mkdir(exist_ok=True)
folders=['qa-web-r5','qa-offline-r1','qa-production-r1','qa-touch-r1']
pages=[]
for folder in folders:
    files=sorted((base/folder/'screens').glob('*.png'))
    for offset in range(0,len(files),4):
        group=files[offset:offset+4]
        canvas=Image.new('RGB',(1440,960),'#202329');draw=ImageDraw.Draw(canvas)
        for i,p in enumerate(group):
            im=Image.open(p).convert('RGB');im.thumbnail((716,448))
            x=(i%2)*720;y=(i//2)*480
            draw.text((x+6,y+6),folder+'/'+p.name,fill='white')
            canvas.paste(im,(x+(720-im.width)//2,y+26))
        target=out/(folder+'-'+str(offset//4+1)+'.jpg');canvas.save(target,quality=94)
        pages.append({'file':str(target),'sources':[str(p) for p in group]})
(out/'index.json').write_text(json.dumps(pages,indent=2),encoding='utf8')
print(json.dumps([{'file':p['file'],'images':len(p['sources'])} for p in pages]))
