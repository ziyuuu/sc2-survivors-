import hashlib, json, os, time
from pathlib import Path

root = Path('reports/local/disk-cleanup-20261021/artifact-pass')
load = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
audit = load(root/'duplicate-assets-audit.json')
plan = load(root/'link-plan.json')
canonical = {g['sha256']: g['canonical'] for g in plan['groups']}
result = {'started': time.time(), 'groups': len(audit['groups']), 'pathsChecked': 0,
          'hashMismatch': [], 'identityMismatch': [], 'missing': [],
          'protectedFiles': 0, 'protectedMismatch': [], 'temporaryFiles': []}

def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(4*1024*1024), b''):
            h.update(block)
    return h.hexdigest()

dirs = set()
for group in audit['groups']:
    keep = canonical.get(group['sha256'], group['files'][0]['path'])
    st = os.stat(keep)
    if sha(keep) != group['sha256']:
        result['hashMismatch'].append(keep)
    for row in group['files']:
        path = Path(row['path'])
        dirs.add(path.parent)
        try:
            linked = os.stat(path)
            if (linked.st_dev, linked.st_ino, linked.st_size) != (st.st_dev, st.st_ino, group['bytes']):
                result['identityMismatch'].append(str(path))
            result['pathsChecked'] += 1
        except FileNotFoundError:
            result['missing'].append(str(path))

for directory in dirs:
    for item in directory.iterdir():
        if '.dedup-' in item.name or '.backup-' in item.name:
            result['temporaryFiles'].append(str(item))

for row in load(root.parent/'protected-before.json'):
    if sha(row['path']) != row['sha256']:
        result['protectedMismatch'].append(row['path'])
    result['protectedFiles'] += 1

before = load(root/'files-before.json')
result['inventoriedPaths'] = len(before['files'])
result['missingInventoriedPaths'] = [r['path'] for r in before['files'] if not os.path.isfile(r['path'])]
result['finished'] = time.time()
result['passed'] = not any(result[k] for k in ('hashMismatch','identityMismatch','missing','protectedMismatch','temporaryFiles','missingInventoriedPaths'))
result['method'] = 'SHA-256 canonical bytes plus device/inode/size equality for every asset path; SHA-256 all 812 prior protected files; prior output path existence. Shared file metadata (including modification time) can differ.'
(root/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
assert result['passed'], result
