from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math
root=Path(r'C:/Users/zyuu/.codex/visualizations/2026/10/03/01a0ff75-6cfc-7be0-b2f6-92489157b232/sc2-ui-r5')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
routes=['home','race','difficulty','confirm','loading','battle','development','shop','heroes','talents','saves','pause','settings','production','family','victory','endless']
for size in ['1280x900','844x390','667x375','390x844','360x640']:
 cols=3 if size in ['1280x900','844x390','667x375'] else 5
 width=420 if cols==3 else 245
 files=[root/'pages'/f'{size}-{page}.png' for page in routes]
 first=Image.open(files[0]); h=round(first.height*width/first.width)
 sheet=Image.new('RGB',(cols*(width+12)+12,math.ceil(len(files)/cols)*(h+34)+12),'#07121d')
 draw=ImageDraw.Draw(sheet)
 for i,path in enumerate(files):
  im=Image.open(path).convert('RGB');im.thumbnail((width,h))
  x=12+(i%cols)*(width+12);y=12+(i//cols)*(h+34)
  draw.text((x,y),path.stem,font=font,fill='#cbdbe7');sheet.paste(im,(x,y+24))
 sheet.save(root/f'review-{size}.jpg',quality=93)
before=Image.open(root/'before-talents-desktop.png').convert('RGB')
after=Image.open(root/'talents-tree-desktop.png').convert('RGB')
comparison=Image.new('RGB',(before.width+after.width,before.height),'#07121d');comparison.paste(before,(0,0));comparison.paste(after,(before.width,0));comparison.save(root/'comparison-talents.jpg',quality=95)
for size in ['390x844','360x640','667x375']:
 files=[root/'targets'/f'{size}-{race}-{line}.png' for race in ['terran','zerg','protoss'] for line in ['resources','soldiers','army','micro']]
 cols=4; width=260 if size!='667x375' else 500
 first=Image.open(files[0]);h=round(first.height*width/first.width)
 sheet=Image.new('RGB',(cols*(width+12)+12,3*(h+34)+12),'#07121d');draw=ImageDraw.Draw(sheet)
 for i,path in enumerate(files):
  im=Image.open(path).convert('RGB');im.thumbnail((width,h))
  x=12+(i%cols)*(width+12);y=12+(i//cols)*(h+34)
  draw.text((x,y),path.stem,font=font,fill='#cbdbe7');sheet.paste(im,(x,y+24))
 sheet.save(root/f'review-talents-{size}.jpg',quality=95)
finals=['final-talents-tree-desktop.png','final-battle-portrait.png','final-battle-folded-portrait.png']
views=[]
for name in finals:
 im=Image.open(root/name).convert('RGB');im=im.resize((round(im.width*675/im.height),675),Image.Resampling.LANCZOS);views.append(im)
overview=Image.new('RGB',(sum(im.width for im in views)+48,711),'#07121d');x=12
for im in views:
 overview.paste(im,(x,24));x+=im.width+12
overview.save(root/'final-r5-overview.png')
records=json.loads((root/'layout-records.json').read_text(encoding='utf-8'))
latest={(r['viewport']['width'],r['viewport']['height'],r['requested']):r for r in records}
print(json.dumps({'attempted':len(records),'latestStates':len(latest),'issues':[{'size':k[:2],'page':k[2],'issues':r['issues'],'covered':r['covered'],'missing':r['missing'],'forbidden':r['forbidden'],'textOverflow':r['textOverflow']} for k,r in latest.items() if r['issues'] or r['covered'] or r['missing'] or r['forbidden'] or r['textOverflow']]},ensure_ascii=False))
