"""Read-only probe of exact-pixel WebP for runtime standalone PNG textures."""
import io
import json
import sys
import zlib
from PIL import Image

limit = int(sys.argv[1]) if len(sys.argv) > 1 else 30
runtime = json.load(open('reports/local/runtime-assets.json', encoding='utf8'))
textures = sorted((item for item in runtime if item['kind'] in ('texture', 'effect-texture', 'icon')
                   and item['status'] == 'available' and item['packedFile'].endswith('.png')),
                  key=lambda item: -item['bytes'])[:limit]
rows = []
for item in textures:
    png = open(item['packedFile'], 'rb').read()
    original = Image.open(io.BytesIO(png)).convert('RGBA')
    out = io.BytesIO()
    original.save(out, format='WEBP', lossless=True, method=4, exact=True)
    webp = out.getvalue()
    if Image.open(io.BytesIO(webp)).convert('RGBA').tobytes() != original.tobytes():
        raise ValueError('Pixel mismatch: ' + item['id'])
    rows.append({'id': item['id'], 'png': len(png), 'webp': len(webp),
                 'gzipPng': len(zlib.compress(png, 9)), 'gzipWebp': len(zlib.compress(webp, 9))})
totals = {key: sum(row[key] for row in rows) for key in ('png', 'webp', 'gzipPng', 'gzipWebp')}
print(json.dumps({'tested': len(rows), 'totals': totals,
                  'gzipRatio': round(totals['gzipWebp'] / totals['gzipPng'], 3) if totals['gzipPng'] else 0,
                  'best': sorted(rows, key=lambda row: row['gzipPng'] - row['gzipWebp'], reverse=True)[:15]}, indent=2))
