import json,sys,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
base=Path('reports/local/t01-20261024').resolve();run=sys.argv[1]
root=(base/run).resolve()
evidence=Path('C:/Users/zyuu/.codex/visualizations/2026/09/20/01a0bf9c-1981-7eb3-8a7e-55c9fd6884c9/t01-evidence').resolve()
assert root.parent in (base,evidence) and root.name==run
report=json.loads((root/'report.json').read_text(encoding='utf-8'))
out=root/'review';out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',17)
existing={r['id']:r for r in json.loads((out/'index.json').read_text(encoding='utf-8'))} if (out/'index.json').exists() else {}
selected=set(map(int,sys.argv[2].split(','))) if len(sys.argv)>2 else None
index=[];generated=0
for number,row in enumerate(report['rows'],1):
    if row['status']=='running':continue
    if selected is not None and number not in selected:
        index.append(existing.get(row['id'],{'id':row['id'],'steps':[],'review':'not-generated'}));continue
    prefix=str(number).zfill(3)
    sheet=Image.new('RGB',(1360,1040),'#161b21');draw=ImageDraw.Draw(sheet);draw.text((8,6),row['id'],font=font,fill='white')
    allfiles=[]
    compact=all(len(v['screens'])<=3 for v in row['viewports'])
    compact_sheet=Image.new('RGB',(1440,1140),'#161b21') if compact else None
    if compact:ImageDraw.Draw(compact_sheet).text((8,6),row['id'],font=font,fill='white')
    for viewport in row['viewports']:
        screens=viewport['screens'];initial=next((s for s in screens if '-initial.' in s),None)
        if initial:
            with Image.open(root/initial) as im:
                w=viewport['width'];size,pos=((880,550),(0,40)) if w==1440 else ((880,407),(0,610)) if w==844 else ((460,996),(900,40))
                sheet.paste(im.resize(size),pos)
        if compact:
            w=viewport['width'];basey=40 if w==1440 else 365 if w==844 else 615
            d=ImageDraw.Draw(compact_sheet)
            for k,file in enumerate(screens):
                with Image.open(root/file) as im:
                    im.thumbnail((480,460));x=k*480+(480-im.width)//2
                    compact_sheet.paste(im,(x,basey));d.text((k*480+5,basey+im.height+2),file,font=font,fill='white')
            continue
        for start in range(0,len(screens),12):
            part=screens[start:start+12]
            columns=6 if viewport['width']<viewport['height'] else 3
            cellw=1440//columns;imageh=min(460,round(cellw*viewport['height']/viewport['width']));cellh=imageh+28
            film=Image.new('RGB',(1440,40+math.ceil(len(part)/columns)*cellh),'#161b21');d=ImageDraw.Draw(film);d.text((8,6),row['id']+' '+str(viewport['width']),font=font,fill='white')
            for k,file in enumerate(part):
                with Image.open(root/file) as im:
                    im.thumbnail((cellw,460));x=(k%columns)*cellw+(cellw-im.width)//2;y=40+(k//columns)*cellh;film.paste(im,(x,y));d.text(((k%columns)*cellw+5,y+imageh+2),file,font=font,fill='white')
            name=f'{prefix}-{viewport["width"]}-steps-{start//12+1}.jpg';film.save(out/name,quality=93);allfiles.append(name)
    if compact:
        name=prefix+'-all-steps.jpg';compact_sheet.save(out/name,quality=93);allfiles.append(name)
    initialname=prefix+'-initial.jpg';sheet.save(out/initialname,quality=94)
    index.append({'id':row['id'],'status':row['status'],'initial':initialname,'steps':allfiles,'review':'pending'})
    generated+=1
(out/'index.json').write_text(json.dumps(index,indent=2),encoding='utf-8')
print(json.dumps({'rows':len(index),'generated':generated,'out':str(out)}))
