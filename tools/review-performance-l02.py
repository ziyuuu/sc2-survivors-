import json, pathlib, sys
from PIL import Image, ImageDraw
root = pathlib.Path('reports/local/performance-l02-20261020')
for folder in sys.argv[1:]:
    directory = root / folder
    report = json.loads((directory / 'report.json').read_text(encoding='utf-8'))
    files = []
    for i in range(0, len(report['screens']), 4):
        rows = report['screens'][i:i+4]
        sheet = Image.new('RGB', (1440, 476*((len(rows)+1)//2)), '#182028')
        draw = ImageDraw.Draw(sheet)
        for j, row in enumerate(rows):
            im = Image.open(row['file']).convert('RGB')
            im.thumbnail((720, 450))
            x, y = (j % 2)*720, (j // 2)*476
            draw.text((x+8, y+5), row['name'], fill='white')
            sheet.paste(im, (x+(720-im.width)//2, y+26))
        dest = directory / f'contact-{i//4+1}.png'
        sheet.save(dest)
        files.append(str(dest))
    print(json.dumps({'folder':folder,'files':files}))
