import json, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw
root = pathlib.Path('reports/local/performance-r03-20261020')
run = sys.argv[1]
report = json.loads((root / run / 'report.json').read_text(encoding='utf-8'))
screens = report['screens']
out = {'run': run, 'passedRun': report.get('pass', False), 'comparisons': [], 'contactSheets': []}
for s in screens:
    if '-baseline' not in s['name']:
        continue
    other = next((x for x in screens if x['name'] == s['name'].replace('-baseline', '-candidate')), None)
    if not other:
        continue
    a = np.array(Image.open(s['file']).convert('RGB')).astype(int)
    b = np.array(Image.open(other['file']).convert('RGB')).astype(int)
    d = np.abs(a - b)
    mask = d.any(axis=2)
    ys, xs = np.where(mask)
    out['comparisons'].append({'scene': s['name'].replace('-baseline', ''), 'changedPixels': int(mask.sum()),
                              'maxChannel': int(d.max()), 'bounds': None if not mask.any() else
                              [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]})
for i in range(0, len(screens), 4):
    part = screens[i:i+4]
    canvas = Image.new('RGB', (1440, 476*((len(part)+1)//2)), '#182028')
    draw = ImageDraw.Draw(canvas)
    for j, s in enumerate(part):
        im = Image.open(s['file']).convert('RGB')
        im.thumbnail((720, 450))
        x, y = (j % 2)*720, (j // 2)*476
        draw.text((x+8, y+6), s['name'], fill='white')
        canvas.paste(im, (x+(720-im.width)//2, y+26))
    file = root / run / f'contact-{i//4+1}.jpg'
    canvas.save(file, quality=93)
    out['contactSheets'].append(str(file))
(root / run / 'pixels.json').write_text(json.dumps(out, indent=2), encoding='utf-8')
print(json.dumps(out))
