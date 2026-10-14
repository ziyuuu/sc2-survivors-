"""Build bounded review sheets; the output is not an automatic visual verdict."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

root = Path('reports/local/mvp5-full-map-20261014')
output = root / 'review-sheets'
output.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 17)
pages = []
for theme in ['industrial', 'ice', 'mar-sara', 'char', 'frontier']:
    for part, revision, sites in [('interior', 'viewer-r1', range(4)), ('boundary', 'viewer-r2', range(4, 8))]:
        rows = [root / revision / (theme + '-full-' + str(site) + '.png') for site in sites]
        sheet = Image.new('RGB', (1440, 950), '#101820')
        draw = ImageDraw.Draw(sheet)
        for i, file in enumerate(rows):
            x, y = i % 2 * 720, i // 2 * 475
            image = Image.open(file).convert('RGB')
            image.thumbnail((720, 450))
            sheet.paste(image, (x, y + 25))
            draw.text((x + 8, y + 4), revision + ' / ' + file.stem, fill='#e5ebef', font=font)
        destination = output / (theme + '-' + part + '.jpg')
        sheet.save(destination, quality=94)
        pages.append({'file':destination.as_posix(), 'images':[f.as_posix() for f in rows]})
(root / 'visual-selection.json').write_text(json.dumps({'status':'REVIEW_PENDING','pages':pages},indent=2),encoding='utf8')
print('40 selected images in 10 sheets; review pending.')
