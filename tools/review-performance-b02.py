"""Review-only contact sheets; source screenshots remain unchanged."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path('reports/local/performance-b02-20261019').resolve()
out=root/'visual-review';out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
screens=sorted(root.glob('*/*.png'))
sheets=[]
for start in range(0,len(screens),4):
    selected=screens[start:start+4]
    sheet=Image.new('RGB',(1440,968),'#18202c');draw=ImageDraw.Draw(sheet)
    for n,p in enumerate(selected):
        img=Image.open(p).convert('RGB');img.thumbnail((708,442),Image.Resampling.LANCZOS)
        x,y=(n%2)*720,(n//2)*484
        sheet.paste(img,(x+(720-img.width)//2,y+4));draw.text((x+8,y+452),p.parent.name+'/'+p.stem,font=font,fill='#e5e8ed')
    dest=out/f'sheet-{start//4+1:02d}.jpg';sheet.save(dest,quality=94);sheets.append(str(dest))
(out/'manifest.json').write_text(json.dumps({'screens':[str(p) for p in screens],'sheets':sheets},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'screens':len(screens),'sheets':sheets},ensure_ascii=False))
