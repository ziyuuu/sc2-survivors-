"""Readable contact sheets of unmodified QA screenshots; originals stay intact."""
import argparse, json, math, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

p=argparse.ArgumentParser()
p.add_argument('label')
p.add_argument('runs',nargs='+')
p.add_argument('--all',action='store_true')
p.add_argument('--regex',help='Select screenshot names by this regular expression instead of the default keyframes')
a=p.parse_args()
root=Path('reports/local/combat-effects-20261012')
out=root/'review-sheets'/a.label
out.mkdir(parents=True,exist_ok=False)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
rows=[]
for run in a.runs:
    data=json.loads((root/run/'result.json').read_text(encoding='utf-8'))
    assert data.get('passed'),run
    records=data.get('records',[])
    if 'screens' in data:
        records=[{'name':s} for s in data['screens']]
    elif 'frames' in data:
        records=[dict(r,name=Path(r['file']).stem) for r in data['frames']]
    for row in records:
        name=row['name']
        selected=a.all or (bool(re.search(a.regex,name)) if a.regex else name.endswith(('-tick-10','-tick-480','-death','-cast-30','-cast-90','-cast-600','-resolved','-destroyed')))
        if selected:
            file=root/run/(name+'.png')
            assert file.is_file(),file
            build=data.get('build',{})
            rows.append({'run':run,'file':str(file).replace('\\','/'),'name':name,'build':build.get('jsSha256',build.get('appBuildId')),'time':row.get('time'),'tick':row.get('tick'),'subjects':row.get('subjects',[])})
sheets=[]
for page in range(math.ceil(len(rows)/4)):
    chosen=rows[page*4:page*4+4]
    sheet=Image.new('RGB',(1280,768),'#12181e')
    draw=ImageDraw.Draw(sheet)
    for i,row in enumerate(chosen):
        x=(i%2)*640;y=(i//2)*384
        im=Image.open(row['file']).convert('RGB')
        im.thumbnail((640,360),Image.Resampling.LANCZOS)
        sheet.paste(im,(x+(640-im.width)//2,y+24+(360-im.height)//2))
        draw.text((x+8,y+4),row['name']+' | t='+str(round(row['time'] or 0,3)),font=font,fill='white')
    file=out/('%03d.jpg'%(page+1))
    sheet.save(file,quality=94,subsampling=0)
    sheets.append({'file':str(file).replace('\\','/'),'originals':[r['file'] for r in chosen]})
(out/'index.json').write_text(json.dumps({'method':'Contact sheets resize actual screenshots only; every original path and actual build is retained. Generation is not visual review.','records':rows,'sheets':sheets},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'records':len(rows),'sheets':len(sheets),'out':str(out)},ensure_ascii=False))
