"""Compare immutable diagnostic captures and prepare bounded visual review sheets."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = Path('reports/local/7a-20261013')
paired = json.loads((root/'paired-replay.json').read_text(encoding='utf-8'))
assert paired['passed']
out = root/'review-sheets'
out.mkdir(exist_ok=False)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 15)
metrics, selected = [], []
for row in paired['records']:
    if not row['screens']:
        continue
    a, b = [np.asarray(Image.open(file).convert('RGB')).astype(np.int16) for file in row['screens']]
    assert a.shape == b.shape
    difference = np.max(np.abs(a-b), axis=2)
    metrics.append({'name': row['name'], 'screens': row['screens'], 'changedPixels': int(np.count_nonzero(difference)), 'maxChannelDifference': int(difference.max()), 'meanAbsoluteDifference': float(np.mean(np.abs(a-b)))})
    selected.extend([{'name': row['name']+' / '+side, 'file': file} for side, file in zip(['baseline', 'final'], row['screens'])])
pages = []
for start in range(0, len(selected), 6):
    records = selected[start:start+6]
    sheet = Image.new('RGB', (1440, 3*475), '#111820')
    draw = ImageDraw.Draw(sheet)
    for i, row in enumerate(records):
        x, y = (i % 2)*720, (i//2)*475
        image = Image.open(row['file']).convert('RGB')
        image.thumbnail((720, 450))
        sheet.paste(image, (x, y+25))
        draw.text((x+8, y+4), row['name'], fill='#dce8f2', font=font)
    file = out/('paired-'+str(start//6+1)+'.jpg')
    sheet.save(file, quality=94)
    pages.append({'file': str(file), 'records': records})
result = {'status': 'REVIEW_PENDING', 'pixelPairs': len(metrics), 'rgbExact': sum(m['changedPixels'] == 0 for m in metrics), 'metrics': metrics, 'selectedImages': len(selected), 'pages': pages, 'method': 'Decoded RGB comparison at full captured resolution; contact sheets are separate derivatives and do not replace original screenshots. This file alone is not a visual-review pass.'}
(root/'pixel-comparison.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({'pairs': result['pixelPairs'], 'exact': result['rgbExact'], 'sheets': len(pages)}))
