import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'reports/local/mvp1-building-main-20261013/browser-r7')
out = Path(sys.argv[2] if len(sys.argv) > 2 else 'reports/local/mvp1-building-main-20261013/review-r1')
base = Path('reports/local/mvp1-building-main-20261013').resolve()
if base not in root.resolve().parents or base not in out.resolve().parents:
    raise ValueError('Review paths must stay inside the building integration evidence')
out.mkdir(exist_ok=False)
report = json.loads((root / 'result.json').read_text(encoding='utf-8'))
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 14)
groups = {'desktop': [], 'portrait': []}
for row in report['screens']:
    file = root / (row['label'] + '.png')
    with Image.open(file) as source:
        groups['portrait' if source.width < 600 else 'desktop'].append(file)
pages = []
for kind, files in groups.items():
    columns, cell_width, cell_height = (3, 390, 880) if kind == 'portrait' else (2, 720, 478)
    count = columns * 2
    for start in range(0, len(files), count):
        sheet = Image.new('RGB', (columns * cell_width, 2 * cell_height), '#111820')
        draw = ImageDraw.Draw(sheet)
        selected = files[start:start + count]
        for at, file in enumerate(selected):
            x, y = (at % columns) * cell_width, (at // columns) * cell_height
            with Image.open(file) as source:
                source.thumbnail((cell_width, cell_height - 28))
                sheet.paste(source, (x + (cell_width - source.width) // 2, y + 28))
            draw.text((x + 8, y + 6), file.stem, fill='#e5edf4', font=font)
        destination = out / f'{kind}-{start // count + 1}.png'
        sheet.save(destination)
        pages.append({'file': str(destination), 'images': [str(f) for f in selected]})
(out / 'sheets.json').write_text(json.dumps({'source': str(root), 'images': len(report['screens']), 'pages': pages}, indent=2), encoding='utf-8')
print(json.dumps({'images': len(report['screens']), 'sheets': len(pages)}))
