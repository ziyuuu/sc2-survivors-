"""Prepare a bounded review of the actual final UI and named game captures."""
import json,hashlib
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
root=Path(__file__).resolve().parent.parent
evidence=root/'reports/local/mvp5-delivery-20261014'
out=evidence/'visual-review'
out.mkdir(exist_ok=False)
rows=[]
for name in ['viewer-web-r2','viewer-offline-r2','formal-offline-r1']:
    report=json.loads((evidence/name/'result.json').read_text(encoding='utf-8'))
    assert report['passed']
    for row in report.get('records',report.get('screens',[])):
        file=evidence/name/(row['name']+'.png')
        rows.append({'file':str(file.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'label':name+'/'+row['name']})
file=evidence/'formal-mounted-menu-r1/menu.png'
rows.append({'file':str(file.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'label':'formal-mounted-menu-r1/menu'})
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
sheets=[]
for index in range(0,len(rows),6):
    group=rows[index:index+6]
    sheet=Image.new('RGB',(1440,3*485),(20,32,37));draw=ImageDraw.Draw(sheet)
    for j,row in enumerate(group):
        image=Image.open(root/row['file']).convert('RGB')
        image=ImageOps.contain(image,(716,450));x=(j%2)*720;y=(j//2)*485
        sheet.paste(image,(x+(720-image.width)//2,y+26));draw.text((x+6,y+3),row['label'],font=font,fill='white')
    file=out/f'sheet-{index//6+1:02d}.jpg';sheet.save(file,quality=94)
    sheets.append({'file':str(file.relative_to(root)).replace('\\','/'),'images':[r['file'] for r in group],'reviewed':False})
with (evidence/'visual-review-index.json').open('x',encoding='utf-8') as f:json.dump({'images':rows,'sheets':sheets,'passed':False},f,indent=2)
print(json.dumps({'images':len(rows),'sheets':len(sheets)}))
