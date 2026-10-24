from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
import numpy as np

root = Path('reports/local/performance-d02-20261021')
out = root / 'visual-review'
out.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
contacts, pictures, pairs = [], [], []
for run in ['ordinary-1', 'ordinary-2', 'ordinary-active-1']:
    report = json.loads((root/run/'report.json').read_text(encoding='utf-8'))
    screens = report['screens']
    for offset in range(0, len(screens), 6):
        chunk = screens[offset:offset+6]
        sheet = Image.new('RGB', (1080, ((len(chunk)+1)//2)*365), '#202020')
        draw = ImageDraw.Draw(sheet)
        for index, entry in enumerate(chunk):
            im = Image.open(entry['file']).convert('RGB')
            pictures.append({'run':run,'name':entry['name'],'file':entry['file'],'size':list(im.size)})
            thumb = im.copy(); thumb.thumbnail((540, 337))
            x, y = index%2*540, index//2*365
            draw.text((x+7,y+4),run+'/'+entry['name'],font=font,fill='white')
            sheet.paste(thumb,(x,y+28))
        target = out/f'{run}-{offset//6+1}.jpg'
        sheet.save(target, quality=93)
        contacts.append(str(target))
    if run=='ordinary-active-1':
        for checkpoint in [3,20,32]:
            full=np.array(Image.open(root/run/f't{checkpoint}-full.png').convert('RGB')).astype(np.int16)
            for mode in ['medium','full-restored']:
                other=np.array(Image.open(root/run/f't{checkpoint}-{mode}.png').convert('RGB')).astype(np.int16)
                delta=np.abs(full-other); mask=np.any(delta!=0,axis=2); yy,xx=np.where(mask)
                pairs.append({'checkpoint':checkpoint,'other':mode,'changedPixels':int(mask.sum()),'maxChannel':int(delta.max()),'bounds':None if not len(xx) else [int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())]})
result={'status':'prepared-not-yet-reviewed','images':len(pictures),'pictures':pictures,'contacts':contacts,'pixelPairs':pairs}
(out/'analysis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'images':len(pictures),'contacts':contacts,'pixelPairs':pairs},ensure_ascii=False))
