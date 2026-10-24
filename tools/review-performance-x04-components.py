from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np, json, sys
root=Path('reports/local/performance-x04-20261020')/sys.argv[1]
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',18)
report={'run':sys.argv[1],'pairs':[],'contacts':[]}
for race in ['terran','protoss','zerg']:
    phases=[p for p in ['falling','active','opening','destroyed'] if (root/f'pod-{race}-{p}-old.png').exists()]
    if not phases: continue
    sheet=Image.new('RGB',(1200,570*len(phases)),(22,25,31));draw=ImageDraw.Draw(sheet)
    for row,phase in enumerate(phases):
        images=[Image.open(root/f'pod-{race}-{phase}-{mode}.png').convert('RGB') for mode in ['old','new']]
        a,b=[np.asarray(i,dtype=np.int16) for i in images];d=np.abs(a-b);mask=np.any(d!=0,axis=2)
        report['pairs'].append({'race':race,'phase':phase,'changedPixels':int(mask.sum()),'battleRows30to620':int(mask[30:620,:].sum()),'maxChannelDifference':int(d.max())})
        for col,im in enumerate(images):
            crop=im.crop((420,100,1020,640));sheet.paste(crop,(col*600,row*570+30));draw.text((col*600+5,row*570+6),race+' '+phase+' '+['old','new'][col],font=font,fill='white')
    file=root/f'contact-pods-{race}.jpg';sheet.save(file,quality=95);report['contacts'].append(str(file))
(root/'component-pixels.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
