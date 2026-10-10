"""Unretouched image indexes for bounded visual review; raw frames remain authoritative."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('reports/local/lighting-batch3-20261010')
out = root / 'visual-sequences-final'
out.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 18)
small = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 13)
report = json.loads((root / 'after-r6-sequence/results.json').read_text(encoding='utf-8'))
assert report['passed'] is True
baseline = json.loads((root / 'before-r5-sequence/results.json').read_text(encoding='utf-8'))
old = {r['name']: r for r in baseline['records']}
pages = []
for group in ['marine', 'baneling', 'immortal', 'zealot']:
    page = Image.new('RGB', (1800, 1450), '#101820')
    draw = ImageDraw.Draw(page)
    selected = []
    for phase_index, phase in enumerate(['idle', 'move', 'attack', 'hit', 'death']):
        rows = [r for r in report['records'] if r['name'].startswith(group + '-' + phase + '-')]
        for column, index in enumerate([0, len(rows) // 2, len(rows) - 1]):
            row = rows[index]
            assert row['state'] == old[row['name']]['state']
            assert row['time'] == old[row['name']]['time']
            x, y = column * 600, phase_index * 290
            draw.text((x + 8, y + 5), row['name'], font=font, fill='#d8e5ee')
            pair = []
            for side, label in enumerate(['before-r5-sequence', 'after-r6-sequence']):
                file = root / label / (row['name'] + '.png')
                with Image.open(file) as image:
                    image.thumbnail((296, 232))
                    page.paste(image.convert('RGB'), (x + side * 300 + 2, y + 50))
                draw.text((x + side * 300 + 8, y + 30), ('BEFORE' if side == 0 else 'AFTER') + f" / {row['time']:.2f}s", font=small, fill='#9db1bd')
                pair.append(file.relative_to(root).as_posix())
            selected.append({'name': row['name'], 'time': row['time'], 'state': row['state'], 'files': pair})
    file = out / (group + '.jpg')
    page.save(file, quality=95)
    pages.append({'file': file.relative_to(root).as_posix(), 'frames': selected})
(out / 'index.json').write_text(json.dumps({'method': 'First, middle and last frame of each of 20 native sequences; full screenshots downscaled without cropping or retouching. The continuous gallery retains all 336 frames per build.', 'pages': pages, 'sampledPairs': sum(len(p['frames']) for p in pages)}, indent=2), encoding='utf-8')
print(json.dumps({'pages': len(pages), 'sampledPairs': sum(len(p['frames']) for p in pages)}))
