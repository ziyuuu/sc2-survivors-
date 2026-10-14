"""Build contact sheets of actual QA screenshots; no automatic visual verdict."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('reports/local/mvp5-lifecycle-20261014')
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 16)
for run in sys.argv[1:]:
    assert '/' not in run and '\\' not in run and '..' not in run
    report = json.loads((root / run / 'result.json').read_text(encoding='utf8'))
    names = [row['name'] for row in report['screens']]
    output = root / 'review-sheets' / run
    output.mkdir(parents=True, exist_ok=False)
    pages = []
    for at in range(0, len(names), 4):
        selected = names[at:at+4]
        sheet = Image.new('RGB', (1440, 958), '#101820')
        draw = ImageDraw.Draw(sheet)
        for i, name in enumerate(selected):
            x, y = i % 2 * 720, i // 2 * 479
            with Image.open(root / run / (name+'.png')) as source:
                image = source.convert('RGB')
                image.thumbnail((720, 450))
                sheet.paste(image, (x, y+29))
            draw.text((x+8,y+7), run+' / '+name, fill='#e5ebef', font=font)
        destination = output / ('sheet-'+str(at//4+1)+'.jpg')
        sheet.save(destination, quality=94)
        pages.append({'file':destination.as_posix(),'images':[(root/run/(name+'.png')).as_posix() for name in selected]})
    (output/'selection.json').write_text(json.dumps({'status':'REVIEW_PENDING','run':run,'pages':pages},indent=2),encoding='utf8')
    print(run+': '+str(len(names))+' images in '+str(len(pages))+' sheets; review pending')
