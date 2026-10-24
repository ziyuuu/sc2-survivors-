from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
import hashlib

root = Path('reports/local/performance-d03-20261021')
out = root / 'visual-review'
out.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
pictures, contacts = [], []
for run in ['functional-r1', 'visual-r1']:
    report = json.loads((root / run / 'report.json').read_text(encoding='utf-8'))
    assert report['pass'], run
    screens = report['screens']
    for start in range(0, len(screens), 6):
        batch = screens[start:start + 6]
        sheet = Image.new('RGB', (1200, ((len(batch) + 1) // 2) * 403), '#202020')
        draw = ImageDraw.Draw(sheet)
        for i, entry in enumerate(batch):
            file = Path(entry['file'])
            assert hashlib.sha256(file.read_bytes()).hexdigest() == entry['sha256']
            im = Image.open(file).convert('RGB')
            pictures.append({'run': run, 'name': entry['name'], 'file': str(file), 'size': list(im.size), 'sha256': entry['sha256'], 'clearPlayfield': entry.get('temporarilyUnpausedForVisibleHud', False)})
            im.thumbnail((600, 375))
            x, y = i % 2 * 600, i // 2 * 403
            draw.text((x + 6, y + 4), run + '/' + entry['name'], font=font, fill='white')
            sheet.paste(im, (x, y + 28))
        target = out / f'{run}-{start // 6 + 1}.jpg'
        sheet.save(target, quality=94)
        contacts.append(str(target))
result = {'status': 'prepared-not-yet-reviewed', 'images': len(pictures), 'pictures': pictures, 'contacts': contacts, 'scope': 'All functional screenshots retained. Functional-r1 battle screenshots include the real pause overlay; visual-r1 repeats visible-playfield checks with simulation driver frozen and the pause menu temporarily closed. No image retouching or screenshot pixel-equality claim.'}
(out / 'analysis.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'images': len(pictures), 'contacts': contacts}, ensure_ascii=False))
