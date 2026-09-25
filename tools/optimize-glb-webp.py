"""Create exact-pixel WebP GLB derivatives without modifying original SC conversions.

The M3 conversion appends all embedded PNG images after mesh and animation data.
This optimizer verifies that layout and every decoded RGBA pixel before replacing
images. Files with a different layout are left on their original path.
"""
import glob
import hashlib
import io
import json
import os
import sys
import struct
import time
from PIL import Image

SOURCE = 'public/assets/animated'
OUTPUT = 'public/assets/optimized'
MANIFEST = 'assets/private/m6-webp-manifest.json'
CACHE = '.cache/m6-webp'
RUNTIME = 'reports/local/runtime-assets.json'
os.makedirs(OUTPUT, exist_ok=True)
os.makedirs(CACHE, exist_ok=True)
if not os.path.isfile(RUNTIME):
    raise RuntimeError('Run npm run assets:prepare before optimizing runtime GLBs')
runtime_ids = {item['id'] for item in json.load(open(RUNTIME, encoding='utf8')) if item['kind'] == 'model'}
old_records = json.load(open(MANIFEST, encoding='utf8')).get('records', []) if os.path.isfile(MANIFEST) else []
old_by_source = {record['sourceFile']: record for record in old_records}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def chunks(data):
    if data[:4] != b'glTF' or struct.unpack_from('<II', data, 4) != (2, len(data)):
        raise ValueError('Invalid GLB')
    offset = 12
    json_doc = None
    binary = None
    while offset < len(data):
        length, kind = struct.unpack_from('<II', data, offset)
        payload = data[offset + 8:offset + 8 + length]
        if kind == 0x4e4f534a:
            json_doc = json.loads(payload)
        elif kind == 0x004e4942:
            binary = payload
        offset += 8 + length
    if json_doc is None or binary is None or offset != len(data):
        raise ValueError('GLB chunks missing or truncated')
    return json_doc, binary

def make_glb(doc, binary):
    encoded = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode('utf8')
    encoded += b' ' * (-len(encoded) % 4)
    binary += b'\0' * (-len(binary) % 4)
    size = 12 + 8 + len(encoded) + 8 + len(binary)
    return b'glTF' + struct.pack('<II', 2, size) + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + struct.pack('<II', len(binary), 0x004e4942) + binary

def exact_webp(png):
    digest = sha(png)
    path = os.path.join(CACHE, digest + '.webp')
    original = Image.open(io.BytesIO(png)).convert('RGBA')
    if os.path.exists(path):
        webp = open(path, 'rb').read()
    else:
        out = io.BytesIO()
        original.save(out, format='WEBP', lossless=True, method=4, exact=True)
        webp = out.getvalue()
        with open(path, 'wb') as writer:
            writer.write(webp)
    if Image.open(io.BytesIO(webp)).convert('RGBA').tobytes() != original.tobytes():
        raise ValueError('WebP pixel mismatch: ' + digest)
    return webp

def optimize(path):
    source = open(path, 'rb').read()
    previous = old_by_source.get(path.replace('\\', '/'))
    if previous and previous['sourceSha256'] == sha(source) and os.path.isfile(previous['packedFile']):
        if sha(open(previous['packedFile'], 'rb').read()) == previous['sha256']:
            return previous
    doc, binary = chunks(source)
    images = doc.get('images', [])
    if not images or any(image.get('mimeType') != 'image/png' or 'bufferView' not in image for image in images):
        return None
    image_views = {image['bufferView'] for image in images}
    views = doc.get('bufferViews', [])
    spans = [(views[index].get('byteOffset', 0), views[index].get('byteOffset', 0) + views[index]['byteLength']) for index in image_views]
    first = min(start for start, _ in spans)
    last = max(end for _, end in spans)
    if any(view.get('byteOffset', 0) + view['byteLength'] > first for index, view in enumerate(views) if index not in image_views):
        raise ValueError('Non-image data after first image: ' + path)
    if any(byte != 0 for byte in binary[last:]):
        raise ValueError('Non-padding bytes after images: ' + path)
    result = bytearray(binary[:first])
    converted = set()
    image_cache = {}
    original_image_bytes = 0
    optimized_image_bytes = 0
    for index, image in enumerate(images):
        view_index = image['bufferView']
        view = views[view_index]
        start = view.get('byteOffset', 0)
        png = binary[start:start + view['byteLength']]
        if png[:8] != b'\x89PNG\r\n\x1a\n':
            raise ValueError('Invalid source PNG: ' + path)
        original_image_bytes += len(png)
        if view_index in image_cache:
            replacement, use_webp = image_cache[view_index]
        else:
            webp = exact_webp(png)
            use_webp = len(webp) < len(png)
            replacement = webp if use_webp else png
            image_cache[view_index] = replacement, use_webp
        result.extend(b'\0' * (-len(result) % 4))
        view['byteOffset'] = len(result)
        view['byteLength'] = len(replacement)
        result.extend(replacement)
        optimized_image_bytes += len(replacement)
        if use_webp:
            image['mimeType'] = 'image/webp'
            converted.add(index)
    if not converted:
        return None
    for texture in doc.get('textures', []):
        image_index = texture.get('source')
        if image_index in converted:
            texture.pop('source')
            texture.setdefault('extensions', {})['EXT_texture_webp'] = {'source': image_index}
    for field in ('extensionsUsed', 'extensionsRequired'):
        values = doc.setdefault(field, [])
        if 'EXT_texture_webp' not in values:
            values.append('EXT_texture_webp')
    doc['buffers'][0]['byteLength'] = len(result)
    optimized = make_glb(doc, bytes(result))
    if len(optimized) >= len(source):
        return None
    target = os.path.join(OUTPUT, os.path.basename(path))
    temporary = target + '.tmp'
    with open(temporary, 'wb') as writer:
        writer.write(optimized)
    os.replace(temporary, target)
    return {'id': 'model.' + os.path.basename(path)[len('model.'):-len('.glb')], 'sourceFile': path.replace('\\', '/'), 'packedFile': target.replace('\\', '/'), 'sourceSha256': sha(source), 'sha256': sha(optimized), 'sourceBytes': len(source), 'bytes': len(optimized), 'sourceImageBytes': original_image_bytes, 'imageBytes': optimized_image_bytes, 'convertedImages': len(converted)}

started = time.monotonic()
records = []
skipped = []
paths = [path for path in sorted(glob.glob(SOURCE + '/*.glb'))
         if 'model.' + os.path.basename(path)[len('model.'):-len('.glb')] in runtime_ids]
for index, path in enumerate(paths):
    try:
        record = optimize(path)
        if record:
            records.append(record)
        else:
            skipped.append(os.path.basename(path))
    except Exception as error:
        raise RuntimeError(f'{path}: {error}') from error
    if (index + 1) % 20 == 0:
        print(f'Processed {index + 1} models, optimized {len(records)}', flush=True)
with open(MANIFEST, 'w', encoding='utf8') as writer:
    json.dump({'version': 1, 'method': 'Pillow lossless WebP exact RGBA pixels; original GLBs unchanged', 'records': records, 'skipped': skipped}, writer, ensure_ascii=False, indent=2)
pruned = 0
pruned_bytes = 0
if '--prune' in sys.argv:
    active = {record['packedFile'] for record in records}
    output_root = os.path.realpath(OUTPUT)
    for record in old_records:
        stale = record['packedFile']
        if stale in active:
            continue
        target = os.path.abspath(stale)
        if (os.path.dirname(os.path.realpath(target)) != output_root
                or os.path.islink(target)
                or not os.path.basename(target).startswith('model.')
                or not target.endswith('.glb')
                or not os.path.isfile(target)):
            raise RuntimeError('Unsafe derivative prune target: ' + stale)
        pruned_bytes += os.path.getsize(target)
        os.remove(target)
        pruned += 1
print(json.dumps({'processed': len(paths), 'optimized': len(records), 'sourceBytes': sum(item['sourceBytes'] for item in records), 'bytes': sum(item['bytes'] for item in records), 'prunedDerivatives': pruned, 'prunedBytes': pruned_bytes, 'elapsedSeconds': round(time.monotonic() - started, 1)}), flush=True)
