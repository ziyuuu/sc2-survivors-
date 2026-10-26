import json,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
base=Path('reports/local/t01-20261024').resolve();run=sys.argv[1] if len(sys.argv)>1 else None;out=base/(run+'-review' if run else 'static-review');out.mkdir(exist_ok=True)
rows={}
for run in ([run] if run else ['static-r1','static-r2','static-r3']):
    report=json.loads((base/run/'report.json').read_text(encoding='utf-8'))
    for row in report['rows']:
        if row['status']=='captured':rows[row['id']]={'run':run,**row}
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',17);index=[]
for n,(key,row) in enumerate(rows.items(),1):
    sheet=Image.new('RGB',(1360,1040),'#161b21');draw=ImageDraw.Draw(sheet);draw.text((8,6),key,font=font,fill='white')
    for s in row['screens']:
        with Image.open(base/row['run']/s['file']) as image:
            if s['width']==1440:tile=image.resize((880,550));pos=(0,40)
            elif s['width']==844:tile=image.resize((880,407));pos=(0,610)
            else:tile=image.resize((460,996));pos=(900,40)
            sheet.paste(tile,pos)
    name=str(n).zfill(3)+'.jpg';sheet.save(out/name,quality=94);index.append({'id':key,'file':name,'source':row['run'],'review':'pending'})
(out/'index.json').write_text(json.dumps(index,indent=2),encoding='utf-8');print(json.dumps({'rows':len(index),'out':str(out)}))
