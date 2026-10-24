from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import json, hashlib, sys

root=Path('reports/local/performance-d04-complete-20261021')
candidate=sys.argv[1] if len(sys.argv)>1 else 'functional-r7'
base=root/'functional-r4'
target=root/candidate
pairs=[]
for a in sorted(base.glob('*.png')):
    b=target/a.name
    if not b.exists(): continue
    aa=Image.open(a).convert('RGB');bb=Image.open(b).convert('RGB')
    row={'baseline':str(a),'candidate':str(b),'sizeEqual':aa.size==bb.size}
    if aa.size==bb.size:
        diff=ImageChops.difference(aa,bb)
        channels=diff.split();maximum=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2])
        row.update({'differentPixels':aa.width*aa.height-maximum.histogram()[0],'maxChannelDifference':maximum.getextrema()[1],'bbox':diff.getbbox()})
        if aa.size==(1440,900):
            region=(0,30,1440,680);band=maximum.crop(region)
            row['centralBattleBand']={'region':region,'differentPixels':band.width*band.height-band.histogram()[0],'maxChannelDifference':band.getextrema()[1]}
    row['baselineSha256']=hashlib.sha256(a.read_bytes()).hexdigest();row['candidateSha256']=hashlib.sha256(b.read_bytes()).hexdigest()
    pairs.append(row)
screens=sorted(p for p in target.glob('*.png') if not p.stem.startswith('contact'))
contacts=[]
for start in range(0,len(screens),8):
    group=screens[start:start+8];w,h=480,330
    sheet=Image.new('RGB',(w*4,h*2),(24,24,24));draw=ImageDraw.Draw(sheet)
    for i,file in enumerate(group):
        im=Image.open(file).convert('RGB');im.thumbnail((w,h-24));x=i%4*w;y=i//4*h;sheet.paste(im,(x,y+24));draw.text((x+4,y+4),file.stem,fill='white')
    output=target/('contact-'+str(start//8+1)+'.jpg');sheet.save(output);contacts.append(str(output))
result={'scope':'Exact RGB comparisons of matching controlled functional screenshots; asynchronous HTML effects and any differing pixels remain explicit. Contact sheets require visual review.','pairs':pairs,'screens':len(screens),'contacts':contacts}
(target/'visual-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pairs':len(pairs),'exact':sum(p.get('differentPixels')==0 for p in pairs),'differences':[p for p in pairs if p.get('differentPixels')!=0],'contacts':contacts},ensure_ascii=False))
