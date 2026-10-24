from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
import numpy as np

root=Path('reports/local/performance-d02-low-20261021')
out=root/'visual-review'
out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
pictures=[]; pairs=[]; contacts=[]
for source in sorted(root.glob('*/report.json')):
    report=json.loads(source.read_text(encoding='utf-8')); run=source.parent.name
    screens=report.get('screens',[])
    for start in range(0,len(screens),6):
        batch=screens[start:start+6]; sheet=Image.new('RGB',(1080,((len(batch)+1)//2)*365),'#202020'); draw=ImageDraw.Draw(sheet)
        for i,entry in enumerate(batch):
            im=Image.open(entry['file']).convert('RGB'); pictures.append({'run':run,'name':entry['name'],'file':entry['file'],'size':list(im.size)})
            im.thumbnail((540,337)); x=i%2*540; y=i//2*365
            draw.text((x+6,y+4),run+'/'+entry['name'],font=font,fill='white'); sheet.paste(im,(x,y+28))
        target=out/f'{run}-{start//6+1}.jpg'; sheet.save(target,quality=94); contacts.append(str(target))
    for entry in screens:
        if entry['name'].endswith('-full'):
            prefix=entry['name'][:-5]; full=np.array(Image.open(entry['file']).convert('RGB')).astype(np.int16)
            for mode in ['low','full-restored']:
                target=source.parent/(prefix+'-'+mode+'.png')
                if not target.exists(): continue
                other=np.array(Image.open(target).convert('RGB')).astype(np.int16); delta=np.abs(full-other); mask=np.any(delta!=0,axis=2); yy,xx=np.where(mask)
                pairs.append({'run':run,'scene':prefix,'other':mode,'changedPixels':int(mask.sum()),'maxChannel':int(delta.max()),'bounds':None if not len(xx) else [int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())]})
known={str(Path(p['file']).resolve()) for p in pictures}
extras=[p for p in sorted(root.glob('*/*.png')) if str(p.resolve()) not in known]
for start in range(0,len(extras),6):
    batch=extras[start:start+6]; sheet=Image.new('RGB',(1080,((len(batch)+1)//2)*365),'#202020'); draw=ImageDraw.Draw(sheet)
    for i,file in enumerate(batch):
        im=Image.open(file).convert('RGB'); pictures.append({'run':file.parent.name,'name':file.stem,'file':str(file),'size':list(im.size),'supplemental':True})
        im.thumbnail((540,337));x=i%2*540;y=i//2*365;draw.text((x+6,y+4),file.parent.name+'/'+file.stem,font=font,fill='white');sheet.paste(im,(x,y+28))
    target=out/f'supplemental-{start//6+1}.jpg';sheet.save(target,quality=94);contacts.append(str(target))
result={'status':'prepared-not-yet-reviewed','images':len(pictures),'pictures':pictures,'contacts':contacts,'pixelPairs':pairs}
(out/'analysis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'images':len(pictures),'contacts':contacts,'pixelPairs':pairs},ensure_ascii=False))
