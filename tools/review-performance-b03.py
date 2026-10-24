"""Review-only representative contact sheets; keep every original screenshot."""
import json,re,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('reports/local/performance-b03-20261019').resolve()
out=root/'visual-review';out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',15)
names=['drops-1','drops-live-1','ui-2','history-1','input-1','followups-1','supplement-3','visibility-2','browser-natural-2','browser-natural-3']
for kind in ['web','offline','failure']:
    complete=[]
    for f in root.glob(f'loading-{kind}-*/report.json'):
        r=json.loads(f.read_text(encoding='utf-8'))
        if r.get('flowComplete'): complete.append((r['rep'],f.parent.name))
    if complete: names.append(sorted(complete)[-1][1])
selected=[];omitted=[]
for name in names:
    seen=set()
    for p in sorted((root/name).glob('*.png')):
        key=re.sub(r'-[123]$','',p.stem)
        if p.stem in ['home','native-first-battle'] and name!='drops-1':
            omitted.append(str(p));continue
        if key in seen and not key.startswith('context-restored'):
            omitted.append(str(p));continue
        seen.add(key);selected.append(p)
sheets=[]
for start in range(0,len(selected),4):
    group=selected[start:start+4];sheet=Image.new('RGB',(1440,968),'#18202c');draw=ImageDraw.Draw(sheet)
    for n,p in enumerate(group):
        img=Image.open(p).convert('RGB');img.thumbnail((708,442),Image.Resampling.LANCZOS)
        x,y=(n%2)*720,(n//2)*484;sheet.paste(img,(x+(720-img.width)//2,y+4));draw.text((x+8,y+452),p.parent.name+'/'+p.stem,font=font,fill='#e5e8ed')
    dest=out/f'sheet-{start//4+1:02d}.jpg';sheet.save(dest,quality=94);sheets.append({'file':str(dest),'screens':[str(p) for p in group]})
(out/'manifest.json').write_text(json.dumps({'scope':'Representative selection, not all captured images or human acceptance','selected':[{'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in selected],'omitted':omitted,'sheets':sheets},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'selected':len(selected),'omitted':len(omitted),'sheets':len(sheets)}))
