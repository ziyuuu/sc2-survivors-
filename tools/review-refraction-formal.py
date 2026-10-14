from pathlib import Path
import json, sys
from PIL import Image, ImageDraw, ImageFont
root=Path('reports/local/refraction-science-20261013')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',16)
for variant in sys.argv[1:]:
    assert variant in ['web','offline','missing-refraction','missing-science']
    source=root/'final-r2'/('formal-'+variant+'-r2')
    data=json.loads((source/'result.json').read_text(encoding='utf-8'))
    assert data['passed']
    pages=[]
    for offset in range(0,len(data['screens']),8):
        names=data['screens'][offset:offset+8]
        sheet=Image.new('RGB',(1280,4*430),'#111820');draw=ImageDraw.Draw(sheet)
        for i,name in enumerate(names):
            x=(i%2)*640;y=(i//2)*430
            picture=Image.open(source/(name+'.png')).convert('RGB');picture.thumbnail((640,400))
            sheet.paste(picture,(x,y+30));draw.text((x+8,y+6),variant+' / '+name,fill='#dce8f2',font=font)
        output=root/'review-sheets'/('formal-'+variant+'-'+str(offset//8+1)+'.jpg')
        assert not output.exists()
        sheet.save(output,quality=93);pages.append({'file':str(output.relative_to(root)).replace('\\','/'),'screens':names})
    (root/('review-formal-'+variant+'-selection.json')).write_text(json.dumps({'sheets':pages,'screens':len(data['screens'])},indent=2),encoding='utf-8')
    print(variant,len(data['screens']),len(pages))
