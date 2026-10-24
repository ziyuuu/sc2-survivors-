"""Read-only image verification and review contact sheets; all outputs stay on D:."""
import json, hashlib, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
preview=root/'preview/starship-ui-flow-20261015-r18'
out=root/'reports/local/starship-ui-flow-20261015-r18/art-review'
out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
data=json.loads((preview/'hero-art.json').read_text(encoding='utf-8'))
catalog=json.loads((root/'src/ui/starship/catalog-data.json').read_text(encoding='utf-8'))
records=data['records'];assert len(records)==54
assert len({(r['hero'],r['pose']) for r in records})==54
heroes=list(dict.fromkeys(r['hero'] for r in records));assert len(heroes)==18
checks=[];resources=[]
for r in records:
    for field,h in [('original','originalSha256'),('runtime','runtimeSha256'),('detail','detailSha256')]:
        p=Path(r[field]);assert p.exists() and sha(p)==r[h],str(p)
        with Image.open(p) as im: im.verify()
    assert sha(r['actualArchivePath'])==r['originalSha256']
    im=Image.open(r['original']).convert('RGBA');a=im.getchannel('A')
    assert a.getextrema()[0]==0 and a.getextrema()[1]==255
    box=a.point(lambda x:255 if x>32 else 0).getbbox()
    checks.append({'hero':r['hero'],'pose':r['pose'],'dimensions':im.size,'alphaBounds':box,'originalSha256':r['originalSha256']})
    resources.append({'key':f"hero/{r['hero']}/{r['pose']}",'file':str(Path(r['runtime']).relative_to(preview)).replace('\\','/'),'detail':str(Path(r['detail']).relative_to(preview)).replace('\\','/'),'sha256':r['runtimeSha256'],'detailSha256':r['detailSha256']})
for r in catalog['assets']:
    assert sha(preview/r['file'])==r['sha256']==sha(root/r['source']),r['key']
    record={k:r[k] for k in ['key','file','sha256']}
    if r.get('detail'): record.update(detail=r['detail'],detailSha256=sha(preview/r['detail']))
    resources.append(record)
for race in ['terran','zerg','protoss']:
    p=preview/f'assets/ship-{race}.webp'
    resources.append({'key':'ship/'+race,'file':str(p.relative_to(preview)).replace('\\','/'),'sha256':sha(p)})
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
def sheet(rows,name,columns=3,width=310,height=380):
    result=Image.new('RGB',(columns*width,math.ceil(len(rows)/columns)*height),(14,29,42));draw=ImageDraw.Draw(result)
    for n,(file,label) in enumerate(rows):
        x=n%columns*width;y=n//columns*height
        draw.rectangle((x+3,y+3,x+width-3,y+height-3),outline=(59,79,94))
        im=Image.open(file).convert('RGBA');im.thumbnail((width-24,height-50),Image.Resampling.LANCZOS)
        result.paste(im,(x+(width-im.width)//2,y+8+(height-50-im.height)//2),im)
        draw.text((x+12,y+height-34),label,font=font,fill=(221,225,230))
    file=out/(name+'.jpg');result.save(file,quality=92);return str(file)
sheets=[]
for n in range(0,18,3):
    rows=[]
    for hero in heroes[n:n+3]:
        for pose in ['attack','defense','move']:
            r=next(r for r in records if r['hero']==hero and r['pose']==pose)
            rows.append((r['detail'],hero+' / '+pose))
    sheets.append(sheet(rows,'heroes-'+str(n//3+1)))
orange=[r for r in catalog['assets'] if r['key'].startswith('orange-set/')];assert len(orange)==33
for n in range(0,33,12):
    sheets.append(sheet([(preview/r.get('detail',r['file']),r['key'].replace('orange-set/','')) for r in orange[n:n+12]],'r17-'+str(n//12+1),3,320,340))
rejected=[]
for p in preview.rglob('*initial-cropped.json'):
    r=json.loads(p.read_text(encoding='utf-8'));source=Path(r['source'])
    rejected.append({'record':str(p),'source':str(source.resolve()),'sha256':sha(source),'reason':'initial composition cropped; replaced, original retained'})
report={'heroes':18,'poses':54,'existingArt':len(catalog['assets']),'r17':33,'resources':len(resources),'checks':checks,'contactSheets':sheets,'rejected':rejected,'allHashesPass':True,'artReview':'technical checks complete; contact sheets require visual review; user acceptance is separate'}
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(preview/'resources.json').write_text(json.dumps({'version':18,'resources':resources},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['heroes','poses','existingArt','r17','resources','contactSheets']},ensure_ascii=False))
