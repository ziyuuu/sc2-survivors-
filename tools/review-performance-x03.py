from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import json, sys, hashlib
root=Path('reports/local/performance-x03-20261020')
runs=sys.argv[1:]
cases=['ranged-300-fixed','medical-fixed','carrier-equipment-fixed','elite-flame-fixed']
cases=[c for c in cases if any((root/r/(c+'.png')).exists() for r in runs)]
sheet=Image.new('RGB',(720*len(runs),480*len(cases)),(22,25,31))
draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',18)
report={'runs':runs,'pairs':[],'images':[]}
for row,case in enumerate(cases):
    base=None
    for col,run in enumerate(runs):
        file=root/run/(case+'.png')
        if not file.exists(): continue
        im=Image.open(file).convert('RGB'); a=np.asarray(im,dtype=np.int16)
        sheet.paste(im.resize((720,450)),(col*720,row*480+30));draw.text((col*720+8,row*480+6),run+' / '+case,font=font,fill='white')
        report['images'].append({'file':str(file),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
        if base is None: base=a
        else:
            d=np.abs(a-base); mask=np.any(d!=0,axis=2)
            report['pairs'].append({'case':case,'a':runs[0],'b':run,'changedPixels':int(mask.sum()),'maxChannelDifference':int(d.max()),'battleCropChangedPixels':int(mask[30:620,300:1100].sum())})
name='contact-'+'-'.join(runs)
sheet.save(root/(name+'.jpg'),quality=94)
report['contact']=str(root/(name+'.jpg'))
report['recovery']=[]
for run in runs:
    before=root/run/'before-recovery.png';after=root/run/'after-recovery.png'
    if before.exists() and after.exists():
        a=np.asarray(Image.open(before).convert('RGB'),dtype=np.int16);b=np.asarray(Image.open(after).convert('RGB'),dtype=np.int16)
        d=np.abs(a-b);mask=np.any(d!=0,axis=2)
        report['recovery'].append({'run':run,'changedPixels':int(mask.sum()),'maxChannelDifference':int(d.max()),'battleCropChangedPixels':int(mask[30:620,300:1100].sum())})
(root/(name+'.json')).write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
