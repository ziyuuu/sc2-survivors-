"""Read existing images and record visible bounds; never modify image bytes."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / 'preview/starship-field-ui-20261016-r21'
REPORT = ROOT / 'reports/local/starship-native-ui-20261016-r22'
manifest = json.loads((PREVIEW / 'resources.json').read_text(encoding='utf-8'))
metrics = {}
sources = []
for row in manifest['resources']:
    if row['key'].startswith(('ship/', 'cover/')) or row['key'] == 'brand':
        continue
    entry = {}
    for variant, field in [('runtime', 'file'), ('detail', 'detail')]:
        if field not in row:
            continue
        file = (PREVIEW / row[field]).resolve()
        with Image.open(file) as image:
            alpha = image.convert('RGBA').getchannel('A')
            bounds = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
            if bounds is None:
                raise ValueError(f'Empty equipment art: {file}')
            entry[variant] = {'width': image.width, 'height': image.height, 'bounds': list(bounds)}
        sources.append({'key': row['key'], 'variant': variant, 'file': str(file.relative_to(ROOT)).replace('\\', '/'), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), **entry[variant]})
    metrics[row['key']] = entry
assert len(metrics) == 495, len(metrics)
(ROOT / 'src/ui/starship/art-metrics.json').write_text(json.dumps(metrics, separators=(',', ':')), encoding='utf-8')
REPORT.mkdir(parents=True, exist_ok=True)
(REPORT / 'art-metrics.json').write_text(json.dumps({'threshold': 16, 'targetLongestSideFraction': .88, 'keys': len(metrics), 'sources': sources, 'sourceImagesModified': False}, indent=2), encoding='utf-8')
print(json.dumps({'keys': len(metrics), 'imagesMeasured': len(sources), 'sourceImagesModified': False}))
