import json, gzip, math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base = Path('reports/local/t01-20261024').resolve()
root = (base / sys.argv[1]).resolve()
assert base in root.parents
crop = tuple(map(int, sys.argv[2].split(',')))
assert len(crop) == 4 and crop[2] > crop[0] and crop[3] > crop[1]
selected = set(map(int, sys.argv[3].split(','))) if len(sys.argv) > 3 else None
report = json.loads((root / 'report.json').read_text(encoding='utf-8'))
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 16)
out = root / 'review-pages'
out.mkdir(exist_ok=True)
width, height = crop[2] - crop[0], crop[3] - crop[1]
for number, row in enumerate(report['rows'], 1):
    if selected is not None and number not in selected:
        continue
    folder = Path(report.get('evidenceRoot', root)) / row['directory']
    source = folder / report.get('evidenceFile', 'evidence.json')
    evidence = json.loads(gzip.decompress(source.read_bytes()) if source.suffix == '.gz' else source.read_bytes())
    frames = [{'file': evidence['readyFile'], 'actual': 0}] + evidence['frames']
    sheet = Image.new('RGB', (width * 5, 40 + math.ceil(len(frames) / 5) * (height + 22)), '#12171e')
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 8), row['id'] + ' | ALL FRAMES DETAIL', font=font, fill='white')
    for i, frame in enumerate(frames):
        x, y = (i % 5) * width, 40 + (i // 5) * (height + 22)
        with Image.open(folder / frame['file']) as image:
            sheet.paste(image.crop(crop), (x, y))
        actual = frame.get('actual', frame.get('state', {}).get('elapsed', frame.get('at', 0)))
        draw.text((x + 6, y + height), str(round(actual, 3)) + ' s', font=font, fill='white')
    sheet.save(out / (row['directory'] + '-detail.jpg'), quality=96)
print('Detail sheets saved')
