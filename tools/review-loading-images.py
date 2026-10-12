"""Measure local paired screenshots and make a review index; never accepts visuals automatically."""
import html
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw

root = Path('reports/local/loading-20261012')
identity_only = '--identities-only' in sys.argv
sequence_only = '--sequence-only' in sys.argv
assert not (identity_only and sequence_only)
pairs = json.loads((root / ('identity-paired-states.json' if identity_only else 'paired-states.json')).read_text(encoding='utf-8'))
if sequence_only:
    pairs['rows'] = [row for row in pairs['rows'] if row['suite'] == 'sequence']
rows = []
for row in pairs['rows']:
    before = Image.open(root / row['before']).convert('RGB')
    after = Image.open(root / row['after']).convert('RGB')
    assert before.size == after.size
    diff = ImageChops.difference(before, after)
    maximum = max(channel[1] for channel in diff.getextrema())
    mean = sum(ImageStat.Stat(diff).mean) / 3
    channels = diff.split()
    maximum_channel = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
    changed = before.width * before.height - maximum_channel.histogram()[0]
    rows.append({**row, 'maxChannelDelta': maximum, 'meanChannelDelta': mean,
                 'changedPixels': changed, 'totalPixels': before.width * before.height,
                 'differenceBounds': diff.getbbox()})

prefix = 'identity-' if identity_only else 'sequence-' if sequence_only else ''
folder = prefix + 'image-review'
review_dir = root / folder
review_dir.mkdir(exist_ok=True)
ordered = sorted(rows, key=lambda row: (row['meanChannelDelta'], row['maxChannelDelta']), reverse=True)
sheets = []
for start in range(0, len(ordered), 12):
    items = ordered[start:start + 12]
    sheet = Image.new('RGB', (1536, 6 * 188), '#182026')
    draw = ImageDraw.Draw(sheet)
    for i, row in enumerate(items):
        x, y = (i % 2) * 768, (i // 2) * 188
        draw.text((x + 5, y + 5), row['name'] + ' | max ' + str(row['maxChannelDelta']), fill='white')
        for col, key in enumerate(['before', 'after']):
            image = Image.open(root / row[key]).convert('RGB')
            image.thumbnail((380, 158))
            sheet.paste(image, (x + col * 384, y + 26))
    name = f'{folder}/pairs-{start // 12 + 1:02}.jpg'
    sheet.save(root / name, quality=92)
    sheets.append(name)

parts = ['<!doctype html><meta charset="utf-8"><title>加载优化 · 原版 / 新版</title>',
         '<style>body{background:#151d22;color:#e9eff3;font:16px system-ui;margin:24px}section{margin:28px 0}img{width:49%;vertical-align:top}a{color:#91caff}summary{cursor:pointer}</style>',
         '<h1>加载优化 · 原版 / 新版</h1><p>左侧为冻结原版，右侧为受测新版；相同原生状态、时间和镜头。点击图片查看原尺寸。像素差异单独量化，不自动等同于画面缺陷或验收通过。</p>']
for row in ordered:
    title = html.escape(row['suite'] + ' / ' + row['name'])
    parts.append(f'<section><details><summary>{title} · 最大通道差 {row["maxChannelDelta"]} · 变化像素 {row["changedPixels"]}</summary>')
    for key in ['before', 'after']:
        url = html.escape(row[key], quote=True)
        parts.append(f'<a href="{url}"><img loading="lazy" src="{url}"></a>')
    parts.append('</details></section>')
(root / (prefix + 'comparison.html')).write_text('\n'.join(parts), encoding='utf-8')
result = {'method': 'Exact RGB decoded screenshot comparison; all differences retained, no acceptance threshold.',
          'pairs': len(rows), 'pixelExact': sum(row['maxChannelDelta'] == 0 for row in rows),
          'sheets': sheets, 'rows': ordered}
(root / (prefix + 'pixel-comparison.json')).write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({'pairs': result['pairs'], 'pixelExact': result['pixelExact'], 'largest': ordered[:5]}))
