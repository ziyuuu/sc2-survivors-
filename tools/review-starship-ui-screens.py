"""Compose review-only contact sheets from a completed browser QA run."""
import json, sys, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

directory = Path(sys.argv[1]).resolve()
report = json.loads((directory / 'report.json').read_text(encoding='utf-8'))
out = directory / 'contact-sheets'
out.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 17)
paths = []
for first in range(0, len(report['screens']), 6):
    selected = report['screens'][first:first+6]
    sheet = Image.new('RGB', (1440, 920), '#18202c')
    draw = ImageDraw.Draw(sheet)
    for index, value in enumerate(selected):
        source = Path(value)
        picture = Image.open(source).convert('RGB')
        picture.thumbnail((468, 420), Image.Resampling.LANCZOS)
        x, y = (index % 3) * 480, (index // 3) * 460
        sheet.paste(picture, (x + (480-picture.width)//2, y + 5))
        draw.text((x + 8, y + 431), source.stem, font=font, fill='#e5e8ed')
    path = out / f'screens-{first//6+1:02d}.jpg'
    sheet.save(path, quality=94)
    paths.append(str(path))
(out / 'manifest.json').write_text(json.dumps({'source':str(directory/'report.json'), 'screens':report['screens'], 'sheets':paths}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'screens':len(report['screens']), 'sheets':paths}, ensure_ascii=False))
