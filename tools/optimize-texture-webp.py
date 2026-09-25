"""Create exact-RGBA WebP derivatives for runtime standalone map/terrain PNGs."""
import hashlib
import io
import json
import os
import time
from PIL import Image

RUNTIME = 'reports/local/runtime-assets.json'
OUTPUT = 'public/assets/optimized-textures'
MANIFEST = 'assets/private/m6-texture-webp-manifest.json'
os.makedirs(OUTPUT, exist_ok=True)
runtime = json.load(open(RUNTIME, encoding='utf8'))
old = json.load(open(MANIFEST, encoding='utf8')).get('records', []) if os.path.isfile(MANIFEST) else []
old_by_id = {item['id']: item for item in old}

def sha(data):
    return hashlib.sha256(data).hexdigest()

started = time.monotonic()
records = []
skipped = []
for item in runtime:
    if item['kind'] != 'texture' or item['status'] != 'available':
        continue
    source_path = item.get('sourceFile', item['packedFile'])
    # A previous manifest may already have replaced packedFile in runtime-assets.
    if source_path.endswith('.webp'):
        previous = old_by_id.get(item['id'])
        source_path = previous['sourceFile'] if previous else source_path
    if not source_path.endswith('.png') or os.path.commonpath((os.path.abspath(source_path), os.path.abspath('public/assets'))) != os.path.abspath('public/assets'):
        continue
    original_bytes = open(source_path, 'rb').read()
    previous = old_by_id.get(item['id'])
    if previous and previous['sourceFile'] == source_path and previous['sourceSha256'] == sha(original_bytes) and os.path.isfile(previous['packedFile']):
        if sha(open(previous['packedFile'], 'rb').read()) == previous['sha256']:
            records.append(previous)
            continue
    original = Image.open(io.BytesIO(original_bytes)).convert('RGBA')
    encoded = io.BytesIO()
    original.save(encoded, format='WEBP', lossless=True, method=4, exact=True)
    webp = encoded.getvalue()
    if Image.open(io.BytesIO(webp)).convert('RGBA').tobytes() != original.tobytes():
        raise ValueError('RGBA mismatch: ' + item['id'])
    if len(webp) >= len(original_bytes):
        skipped.append(item['id'])
        continue
    target = os.path.join(OUTPUT, 'texture-' + sha(item['id'].encode('utf8'))[:32] + '.webp').replace('\\', '/')
    temporary = target + '.tmp'
    with open(temporary, 'wb') as writer:
        writer.write(webp)
    os.replace(temporary, target)
    records.append({'id': item['id'], 'sourceFile': source_path, 'packedFile': target,
                    'sourceSha256': sha(original_bytes), 'sha256': sha(webp),
                    'sourceBytes': len(original_bytes), 'bytes': len(webp)})
with open(MANIFEST + '.tmp', 'w', encoding='utf8') as writer:
    json.dump({'version': 1, 'method': 'Pillow lossless WebP exact RGBA pixels; original PNGs unchanged',
               'records': records, 'skipped': skipped}, writer, ensure_ascii=False, indent=2)
os.replace(MANIFEST + '.tmp', MANIFEST)
print(json.dumps({'candidates': len(records) + len(skipped), 'optimized': len(records),
                  'sourceBytes': sum(item['sourceBytes'] for item in records),
                  'bytes': sum(item['bytes'] for item in records),
                  'elapsedSeconds': round(time.monotonic() - started, 1)}))
