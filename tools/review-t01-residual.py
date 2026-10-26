import json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('reports/local/t01-20261024/residual-probe-r1')
rows=json.loads((root/'report.json').read_text(encoding='utf-8'))['fort']
sheet=Image.new('RGB',(1920,40+math.ceil(len(rows)/4)*445),'#12171e');draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',17)
draw.text((10,10),'Bunker landing / muzzle / expiration probe',font=font,fill='white')
for i,row in enumerate(rows):
    with Image.open(root/row['file']) as im:
        tile=im.crop((350,40,1090,690)).resize((480,422));x=(i%4)*480;y=40+(i//4)*445;sheet.paste(tile,(x,y));draw.text((x+8,y+422),str(row['t'])+'s',font=font,fill='white')
sheet.save(root/'fort-review.jpg',quality=94)
