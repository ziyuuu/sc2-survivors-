"""Index immutable QA screenshots. Full, uncropped source images remain the evidence."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('reports/local/material-batch2-20261010')
rows = json.loads((root / 'identity-repairs.json').read_text(encoding='utf-8'))['identities']
out = root / 'visual-index-settled'
out.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 18)
small = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 13)
pages = []
for start in range(0, len(rows), 15):
    page = Image.new('RGB', (1800, 1215), '#101820')
    draw = ImageDraw.Draw(page)
    selected = rows[start:start + 15]
    for index, row in enumerate(selected):
        x, y = (index % 3) * 600, (index // 3) * 243
        draw.text((x + 8, y + 4), row['id'], font=font, fill='#d8e5ee')
        for side, key in enumerate(['beforeNear', 'afterNear']):
            file = root / row['evidence'][key]
            with Image.open(file) as source:
                source.thumbnail((296, 175))
                page.paste(source.convert('RGB'), (x + side * 300 + 2, y + 52))
            revision = 'R11 settled' if 'settled' in row['evidence'][key] else 'R9'
            draw.text((x + side * 300 + 8, y + 30), ('BEFORE ' if side == 0 else 'AFTER ') + revision, font=small, fill='#9db1bd')
        draw.line((x, y + 240, x + 599, y + 240), fill='#334552')
    file = out / f'near-{start // 15 + 1:02}.jpg'
    page.save(file, quality=93)
    pages.append({'file': file.as_posix(), 'identities': [r['id'] for r in selected], 'method': 'Full screenshots resized, no cropping or retouching'})
(out / 'index.json').write_text(json.dumps({'pages': pages, 'identities': len(rows)}, indent=2), encoding='utf-8')
print(json.dumps({'pages': len(pages), 'identities': len(rows), 'path': out.as_posix()}))
