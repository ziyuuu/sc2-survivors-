from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math

root=Path(r'C:/Users/zyuu/.codex/visualizations/2026/10/03/01a0ff75-6cfc-7be0-b2f6-92489157b232/sc2-ui-r6')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
for size in ['1280x900','844x390','667x375','390x844','360x640']:
 files=[root/f'{race}-{size}-{state}.png' for state in ['open','folded'] for race in ['terran','zerg','protoss']]
 width=420 if size in ['1280x900','844x390','667x375'] else 270
 first=Image.open(files[0]);h=round(first.height*width/first.width)
 sheet=Image.new('RGB',(3*(width+12)+12,2*(h+34)+12),'#07121d');draw=ImageDraw.Draw(sheet)
 for i,path in enumerate(files):
  im=Image.open(path).convert('RGB');im=im.resize((width,h),Image.Resampling.LANCZOS)
  x=12+(i%3)*(width+12);y=12+(i//3)*(h+34)
  draw.text((x,y),path.stem,font=font,fill='#cbdbe7');sheet.paste(im,(x,y+24))
 sheet.save(root/f'review-{size}.jpg',quality=95)
before=Image.open(root/'before-390x844.png').convert('RGB')
after=Image.open(root/'final-battle-portrait.png').convert('RGB')
comparison=Image.new('RGB',(before.width+after.width+36,max(before.height,after.height)+48),'#07121d');draw=ImageDraw.Draw(comparison)
draw.text((12,10),'R5',font=font,fill='#cbdbe7');draw.text((before.width+24,10),'R6',font=font,fill='#cbdbe7')
comparison.paste(before,(12,36));comparison.paste(after,(before.width+24,36));comparison.save(root/'comparison-portrait-r6.png')
files=['final-battle-desktop.png','final-battle-portrait.png'];views=[]
for name in files:
 im=Image.open(root/name).convert('RGB');views.append(im.resize((round(im.width*675/im.height),675),Image.Resampling.LANCZOS))
overview=Image.new('RGB',(sum(im.width for im in views)+36,699),'#07121d');x=12
for im in views:
 overview.paste(im,(x,12));x+=im.width+12
overview.save(root/'final-r6-overview.png')
records=json.loads((root/'layout-r6.json').read_text(encoding='utf-8'))
latest={r['tag']:r for r in records}
issues=[r['tag'] for r in latest.values() if any(r[k] for k in ['issues','covered','missing','small']) or r['rowCount']!=(0 if r['folded'] else 2)]
print(json.dumps({'recorded':len(records),'states':len(latest),'issues':issues},ensure_ascii=False))
