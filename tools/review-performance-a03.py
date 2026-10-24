import json, pathlib, hashlib
from PIL import Image, ImageDraw, ImageChops
root=pathlib.Path('reports/local/performance-a03-20261021')
all_files=[]
contacts=[]
for name in ['game-persistent-1','game-incognito-1']:
    folder=root/name
    report=json.loads((folder/'report.json').read_text(encoding='utf-8'))
    assert report.get('pass'), name
    all_files.extend(row['file'] for row in report['screens'])
    for i in range(0,len(report['screens']),4):
        rows=report['screens'][i:i+4]
        sheet=Image.new('RGB',(1440,476*((len(rows)+1)//2)),'#182028')
        draw=ImageDraw.Draw(sheet)
        for j,row in enumerate(rows):
            im=Image.open(row['file']).convert('RGB')
            assert im.size==(1440,900)
            im.thumbnail((720,450))
            x,y=(j%2)*720,(j//2)*476
            draw.text((x+8,y+5),pathlib.Path(row['file']).stem,fill='white')
            sheet.paste(im,(x+(720-im.width)//2,y+26))
        dest=folder/f'contact-{i//4+1}.png'
        sheet.save(dest);contacts.append(str(dest))
folder=root/'game-incognito-1'
pairs=[]
for left,right in [('cold-battle-canvas','same-page-battle-canvas'),('reload-battle-canvas','context-restored-offline-canvas')]:
    a=Image.open(folder/(left+'.png')).convert('RGB');b=Image.open(folder/(right+'.png')).convert('RGB')
    diff=ImageChops.difference(a,b)
    pixels=list(diff.getdata())
    pairs.append({'left':left,'right':right,'changedPixels':sum(any(c) for c in pixels),'maxChannelDelta':max(max(c) for c in pixels),'bbox':diff.getbbox(),'scope':'Full actual WebGL canvas; independent run identity may differ. No tolerance used to alter images.'})
review={'status':'pending-visual-inspection','images':len(all_files),'files':all_files+contacts,'contacts':contacts,'canvasPairs':pairs,'notes':[]}
(root/'visual-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'images':len(all_files),'contacts':contacts,'canvasPairs':pairs}))
