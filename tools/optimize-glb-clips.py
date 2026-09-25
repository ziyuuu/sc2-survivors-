"""Losslessly discard unreachable Nova animation clips from a derived GLB.

Mesh, material, image, skin and retained animation accessor bytes stay identical.
Original animated and WebP-derived models are not modified or removed.
"""
import copy
import hashlib
import json
import os
import struct

SOURCE = 'public/assets/optimized/model.hero.nova.glb'
OUTPUT = 'public/assets/optimized-clips/model.hero.nova.glb'
MANIFEST = 'assets/private/m6-clip-manifest.json'
KEEP = {'Stand A', 'Walk A', 'Attack A', 'Death A', 'Spell E A', 'Spell A'}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def parse_glb(data):
    if data[:4] != b'glTF' or struct.unpack_from('<II', data, 4) != (2, len(data)):
        raise ValueError('Invalid source GLB')
    offset = 12
    chunks = {}
    while offset < len(data):
        size, kind = struct.unpack_from('<II', data, offset)
        if offset + 8 + size > len(data):
            raise ValueError('Truncated GLB chunk')
        chunks[kind] = data[offset + 8:offset + 8 + size]
        offset += 8 + size
    if offset != len(data) or 0x4e4f534a not in chunks or 0x004e4942 not in chunks:
        raise ValueError('Missing GLB JSON or BIN')
    return json.loads(chunks[0x4e4f534a]), chunks[0x004e4942]

def encode_glb(doc, binary):
    body = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode('utf8')
    body += b' ' * (-len(body) % 4)
    binary += b'\0' * (-len(binary) % 4)
    size = 28 + len(body) + len(binary)
    return (b'glTF' + struct.pack('<II', 2, size)
            + struct.pack('<II', len(body), 0x4e4f534a) + body
            + struct.pack('<II', len(binary), 0x004e4942) + binary)

def animation_accessors(animation):
    return {index for sampler in animation['samplers'] for index in (sampler['input'], sampler['output'])}

def protected_accessors(doc, kept_animations):
    used = set()
    for mesh in doc.get('meshes', []):
        for primitive in mesh['primitives']:
            used.update(primitive.get('attributes', {}).values())
            if 'indices' in primitive:
                used.add(primitive['indices'])
            for target in primitive.get('targets', []):
                used.update(target.values())
    for skin in doc.get('skins', []):
        if 'inverseBindMatrices' in skin:
            used.add(skin['inverseBindMatrices'])
    for animation in kept_animations:
        used.update(animation_accessors(animation))
    return used

def optimize(source):
    doc, binary = parse_glb(source)
    if set(doc.get('extensionsRequired', [])) - {'EXT_texture_webp'}:
        raise ValueError('Unknown required extension; refuse to rewrite buffer views')
    original = copy.deepcopy(doc)
    kept = [a for a in doc['animations'] if a['name'] in KEEP]
    if {a['name'] for a in kept} != KEEP:
        raise ValueError('Nova gameplay clip whitelist no longer matches source')
    removed = [a for a in doc['animations'] if a['name'] not in KEEP]
    drop_accessors = set().union(*(animation_accessors(a) for a in removed)) - protected_accessors(doc, kept)
    accessors = [index for index in range(len(doc['accessors'])) if index not in drop_accessors]
    accessor_map = {old: new for new, old in enumerate(accessors)}
    doc['accessors'] = [doc['accessors'][index] for index in accessors]
    doc['animations'] = kept
    for animation in kept:
        for sampler in animation['samplers']:
            sampler['input'] = accessor_map[sampler['input']]
            sampler['output'] = accessor_map[sampler['output']]
    for mesh in doc.get('meshes', []):
        for primitive in mesh['primitives']:
            primitive['attributes'] = {key: accessor_map[index] for key, index in primitive.get('attributes', {}).items()}
            if 'indices' in primitive:
                primitive['indices'] = accessor_map[primitive['indices']]
            for target in primitive.get('targets', []):
                for key, index in target.items():
                    target[key] = accessor_map[index]
    for skin in doc.get('skins', []):
        if 'inverseBindMatrices' in skin:
            skin['inverseBindMatrices'] = accessor_map[skin['inverseBindMatrices']]
    live_views = {a['bufferView'] for a in doc['accessors'] if 'bufferView' in a}
    for accessor in doc['accessors']:
        sparse = accessor.get('sparse')
        if sparse:
            live_views.update((sparse['indices']['bufferView'], sparse['values']['bufferView']))
    live_views.update(image['bufferView'] for image in doc.get('images', []) if 'bufferView' in image)
    view_order = sorted(live_views)
    view_map = {old: new for new, old in enumerate(view_order)}
    new_binary = bytearray()
    new_views = []
    for index in view_order:
        view = doc['bufferViews'][index]
        if view['buffer'] != 0:
            raise ValueError('External buffer in candidate')
        start = view.get('byteOffset', 0)
        end = start + view['byteLength']
        if end > len(binary):
            raise ValueError('Buffer view exceeds source BIN')
        new_binary.extend(b'\0' * (-len(new_binary) % 4))
        new_views.append({**view, 'byteOffset': len(new_binary)})
        new_binary.extend(binary[start:end])
    doc['bufferViews'] = new_views
    for accessor in doc['accessors']:
        if 'bufferView' in accessor:
            accessor['bufferView'] = view_map[accessor['bufferView']]
        sparse = accessor.get('sparse')
        if sparse:
            sparse['indices']['bufferView'] = view_map[sparse['indices']['bufferView']]
            sparse['values']['bufferView'] = view_map[sparse['values']['bufferView']]
    for image in doc.get('images', []):
        if 'bufferView' in image:
            image['bufferView'] = view_map[image['bufferView']]
    doc['buffers'][0]['byteLength'] = len(new_binary)
    result = encode_glb(doc, bytes(new_binary))
    checked, candidate_bin = parse_glb(result)
    for old, new in view_map.items():
        before = original['bufferViews'][old]
        after = checked['bufferViews'][new]
        first = binary[before.get('byteOffset', 0):before.get('byteOffset', 0) + before['byteLength']]
        second = candidate_bin[after.get('byteOffset', 0):after.get('byteOffset', 0) + after['byteLength']]
        if first != second:
            raise ValueError('Retained mesh, image or animation bytes changed')
    if [a['name'] for a in checked['animations']] != [a['name'] for a in kept]:
        raise ValueError('Retained animation names changed')
    return result, [a['name'] for a in kept], [a['name'] for a in removed], len(drop_accessors)

if __name__ == '__main__':
    with open(SOURCE, 'rb') as reader:
        source = reader.read()
    output, kept, removed, dropped_accessors = optimize(source)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'wb') as writer:
        writer.write(output)
    manifest = {'records': [{'id': 'model.hero.nova', 'sourceFile': SOURCE,
                             'sourceSha256': sha(source), 'packedFile': OUTPUT,
                             'sha256': sha(output), 'sourceBytes': len(source),
                             'bytes': len(output), 'retainedClips': kept,
                             'removedClips': removed, 'droppedAccessors': dropped_accessors,
                             'proof': 'Every retained bufferView byte equals the source view'}]}
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    with open(MANIFEST, 'w', encoding='utf8') as writer:
        json.dump(manifest, writer, ensure_ascii=False, indent=2)
    print(f'Nova clip derivative: {len(source)} -> {len(output)} bytes; {len(kept)} kept, {len(removed)} removed; original unchanged')
