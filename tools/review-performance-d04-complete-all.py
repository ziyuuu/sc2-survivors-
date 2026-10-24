from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json

root = Path('reports/local/performance-d04-complete-20261021')
previous = {'pilot-r2', 'pilot-r2-retry', 'profile-r3', 'functional-r4', 'functional-r7'}
screens = []
for report in sorted(root.glob('*/report.json')):
    data = json.loads(report.read_text(encoding='utf-8'))
    for screen in data.get('screens', []):
        file = Path(screen['file'])
        assert hashlib.sha256(file.read_bytes()).hexdigest() == screen['sha256']
        screens.append({'run': report.parent.name, **screen})
remaining = [s for s in screens if s['run'] not in previous]
contacts = []
for start in range(0, len(remaining), 8):
    group = remaining[start:start+8]
    width, height = 480, 330
    sheet = Image.new('RGB', (width*4, height*2), (24, 24, 24))
    draw = ImageDraw.Draw(sheet)
    for i, screen in enumerate(group):
        image = Image.open(screen['file']).convert('RGB')
        image.thumbnail((width, height-32))
        x, y = i % 4*width, i // 4*height
        sheet.paste(image, (x, y+32))
        draw.text((x+4, y+3), screen['run']+' / '+screen['name'], fill='white')
    name = root/f'final-contact-{start//8+1}.jpg'
    sheet.save(name)
    contacts.append({'file': str(name), 'screens': group})
result = {'totalScreens': len(screens), 'previouslyReviewedRuns': sorted(previous), 'previouslyReviewedScreens': len(screens)-len(remaining), 'remainingScreens': len(remaining), 'contacts': contacts, 'screens': screens}
(root/'visual-review-pending.json').write_text(json.dumps(result, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
print(json.dumps({'total':len(screens), 'previouslyReviewed':len(screens)-len(remaining), 'remaining':len(remaining), 'contacts':[c['file'] for c in contacts]}))
