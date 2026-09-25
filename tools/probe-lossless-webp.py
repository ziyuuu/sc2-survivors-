"""Read-only M6 probe of exact-pixel WebP savings in original converted GLBs."""
import glob
import hashlib
import io
import json
import struct
import sys
import zlib
from PIL import Image

paths = sorted(glob.glob('public/assets/animated/*.glb'), key=lambda p: -__import__('os').path.getsize(p))[:int(sys.argv[1]) if len(sys.argv)>1 else 20]
seen = set()
rows = []
for path in paths:
    data = open(path, 'rb').read()
    if data[:4] != b'glTF':
        continue
    json_length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + json_length])
    binary_start = 20 + json_length + 8
    for image in doc.get('images', []):
        if image.get('mimeType') != 'image/png':
            continue
        view = doc['bufferViews'][image['bufferView']]
        offset = binary_start + view.get('byteOffset', 0)
        png = data[offset:offset + view['byteLength']]
        digest = hashlib.sha256(png).hexdigest()
        if digest in seen:
            continue
        seen.add(digest)
        original = Image.open(io.BytesIO(png)).convert('RGBA')
        out = io.BytesIO()
        original.save(out, format='WEBP', lossless=True, method=4, exact=True)
        webp = out.getvalue()
        if Image.open(io.BytesIO(webp)).convert('RGBA').tobytes() != original.tobytes():
            raise ValueError('Pixel mismatch in ' + path)
        rows.append({'png': len(png), 'webp': len(webp), 'gzipPng': len(zlib.compress(png, 9)), 'gzipWebp': len(zlib.compress(webp, 9)), 'path': path})
totals = {key: sum(row[key] for row in rows) for key in ('png', 'webp', 'gzipPng', 'gzipWebp')}
print(json.dumps({'models': len(paths), 'uniqueImages': len(rows), 'totals': totals, 'ratio': round(totals['gzipWebp'] / totals['gzipPng'], 3) if totals['gzipPng'] else 0, 'topSavings': sorted(rows, key=lambda row: row['gzipPng'] - row['gzipWebp'], reverse=True)[:8]}, indent=2))
