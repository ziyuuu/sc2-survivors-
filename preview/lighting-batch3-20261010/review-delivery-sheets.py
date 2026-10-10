"""Indexes of unretouched evidence; original captures remain authoritative."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('reports/local/lighting-batch3-20261010')
out = root / 'visual-delivery-final'
out.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 16)
small = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 12)
pages = []


def read(name):
    return json.loads((root / name).read_text(encoding='utf-8'))


def sheet(name, entries, columns=3, cell=(600, 280)):
    rows = (len(entries) + columns - 1) // columns
    image = Image.new('RGB', (columns * cell[0], rows * cell[1]), '#101820')
    draw = ImageDraw.Draw(image)
    for i, entry in enumerate(entries):
        x, y = (i % columns) * cell[0], (i // columns) * cell[1]
        draw.text((x + 6, y + 6), entry['label'], font=font, fill='#d8e5ee')
        width = cell[0] // len(entry['files'])
        for side, file in enumerate(entry['files']):
            draw.text((x + side * width + 6, y + 29), entry['sides'][side], font=small, fill='#9db1bd')
            with Image.open(root / file) as source:
                source.thumbnail((width - 8, cell[1] - 50))
                image.paste(source.convert('RGB'), (x + side * width + 4, y + 47))
    file = out / (name + '.jpg')
    image.save(file, quality=95)
    pages.append({'file': file.relative_to(root).as_posix(), 'entries': entries})


gallery = read('gallery-review.json')
assert gallery['passed'] is True and len(gallery['frames']) == 18
for index in range(3):
    frames = gallery['frames'][index * 6:(index + 1) * 6]
    sheet('video-' + str(index), [
        {'label': f"recording {index} / actual {f['time']:.2f}s", 'files': [f['file']], 'sides': [f['source']]}
        for f in frames
    ], cell=(600, 420))

if '--videos-only' in sys.argv:
    (out / 'videos-index.json').write_text(json.dumps({'method': 'Actual decoded WebM frames, downscaled full images only.', 'pages': pages}, indent=2), encoding='utf-8')
    print(json.dumps({'pages': len(pages), 'videoFrames': 18}))
    raise SystemExit(0)

edge = read('edge-comparison.json')
assert edge['passed'] is True and len(edge['pairs']) == 6
for offset in (0, 3):
    sheet('edge-' + str(offset // 3), [
        {'label': p['name'], 'files': [p['before'], p['after']], 'sides': ['BEFORE', 'AFTER']}
        for p in edge['pairs'][offset:offset + 3]
    ], columns=1, cell=(1200, 450))

stages = read('stage-comparison.json')
assert stages['passed'] is True and stages['pairedStates'] == 75
# Each report row retains its actual stage build. Read the same raw capture
# labels used by the stage gallery instead of inferring images from a hash.
labels = ['stage-markers-maps-r1', 'stage-light-maps-r1', 'stage-shadow-maps-r2',
          'stage-contact-maps-r1', 'stage-final-maps-r1']
baseline = read('before-stage-maps-r1/results.json')
old = {r['name']: r for r in baseline['records']}
for label in labels:
    report = read(label + '/results.json')
    assert report['passed'] is True
    entries = []
    for row in report['records']:
        assert row['state'] == old[row['name']]['state']
        entries.append({'label': row['name'],
                        'files': ['before-stage-maps-r1/' + row['name'] + '.png', label + '/' + row['name'] + '.png'],
                        'sides': ['BASELINE', label]})
    sheet(label, entries)

(out / 'index.json').write_text(json.dumps({
    'method': 'Full original screenshots downscaled only, with no crop, retouching or fabricated intermediate frames. Stage pairing uses native state checksums. Original PNGs and WebM remain authoritative.',
    'pages': pages,
}, indent=2), encoding='utf-8')
print(json.dumps({'pages': len(pages), 'entries': sum(len(p['entries']) for p in pages)}))
