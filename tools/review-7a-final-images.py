"""Create bounded review sheets; creation never marks the review as passed."""
from pathlib import Path
import json, sys
from PIL import Image, ImageDraw, ImageFont

root=Path('reports/local/7a-20261013')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',16)
for group in sys.argv[1:]:
    rows=[]
    if group=='resources':
        for variant in ['baseline','final']:
            source=root/('resources-'+variant+'-r3')
            report=json.loads((source/'result.json').read_text(encoding='utf-8'))
            assert report['passed']
            for row in report['records']:
                rows.append({'name':variant+' / '+row['name'],'file':str(source/row['file']).replace('\\','/')})
    elif group in ['web','offline','missing','background']:
        source=root/'final-r1'/('background-r2' if group=='background' else 'formal-'+group+'-r1')
        report=json.loads((source/'result.json').read_text(encoding='utf-8'))
        assert report['passed']
        for name in report['screens']:
            rows.append({'name':group+' / '+name,'file':str(source/(name if name.endswith('.png') else name+'.png')).replace('\\','/')})
    else:
        raise ValueError(group)
    pages=[]
    for offset in range(0,len(rows),6):
        selected=rows[offset:offset+6]
        sheet=Image.new('RGB',(1440,3*475),'#111820')
        draw=ImageDraw.Draw(sheet)
        for i,row in enumerate(selected):
            x,y=(i%2)*720,(i//2)*475
            picture=Image.open(row['file']).convert('RGB')
            picture.thumbnail((720,450))
            sheet.paste(picture,(x,y+25))
            draw.text((x+8,y+4),row['name'],fill='#dce8f2',font=font)
        output=root/'review-sheets'/(group+'-'+str(offset//6+1)+'.jpg')
        assert not output.exists()
        sheet.save(output,quality=94)
        pages.append({'file':str(output).replace('\\','/'),'records':selected})
    result={'status':'REVIEW_PENDING','images':len(rows),'pages':pages}
    (root/('review-'+group+'-selection.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(group,len(rows),len(pages))
