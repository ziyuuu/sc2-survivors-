import json,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
run=sys.argv[1] if len(sys.argv)>1 else 'actions-r25-r2'
assert run in ['actions-r25-r2','actions-r25-r3']
root=Path('reports/local/t01-20261024')/run
report=json.loads((root/'report.json').read_text(encoding='utf-8'))
out=root/'review';out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',17)
for row in report['rows']:
    if row['status']=='running':continue
    assert row['status']=='checks-passed' and len(row['screens'])==8
    sheet=Image.new('RGB',(1440,1950),'#12171e');draw=ImageDraw.Draw(sheet)
    draw.text((10,10),row['id']+' at '+str(row['at'])+' s',font=font,fill='white')
    for n,s in enumerate(row['screens']):
        x=(n%2)*720;y=40+(n//2)*477
        with Image.open(root/row['directory']/s['file']) as im:sheet.paste(im.resize((720,450)),(x,y))
        draw.text((x+6,y+452),s['file'],font=font,fill='white')
    sheet.save(out/(row['directory']+'.jpg'),quality=94)
print(json.dumps({'sheets':len(report['rows'])}))
