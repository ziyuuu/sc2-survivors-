import collections, json, os, time
from pathlib import Path

root = Path('reports/local/disk-cleanup-20261021/artifact-pass')
audit = json.loads((root / 'duplicate-assets-audit.json').read_text(encoding='utf-8'))
assert audit.get('finished'), 'Audit must finish before planning'
assert not audit['mismatches'], audit['mismatches']
groups = []
external = []
for group in audit['groups']:
    by_id = collections.defaultdict(list)
    for row in group['files']:
        st = os.stat(row['path'])
        assert st.st_ino == row['inode'] and st.st_size == group['bytes'], row['path']
        by_id[(st.st_dev, st.st_ino)].append(row)
    if len(by_id) < 2:
        continue
    ordered = sorted(by_id.values(), key=lambda rows: (
        max(row['links'] for row in rows) - len(rows),
        len(rows), max(row['mtime'] for row in rows)), reverse=True)
    canonical = max(ordered[0], key=lambda row: row['mtime'])
    targets = [row for rows in ordered[1:] for row in rows]
    for rows in ordered[1:]:
        if rows[0]['links'] > len(rows):
            external.append({'path': rows[0]['path'], 'outsideScopeLinks': rows[0]['links']-len(rows)})
    groups.append({'sha256': group['sha256'], 'bytes': group['bytes'],
                   'canonical': canonical['path'], 'canonicalFileId': canonical['inode'],
                   'targets': [row['path'] for row in targets],
                   'priorDistinctFiles': len(by_id)})
plan = {'created': time.time(), 'boundary': str(Path.cwd()),
        'scope': ['reports/local', 'dist', 'preview'],
        'method': 'Same-volume hard links for verified SHA-256-named generated binary assets only; preserve paths and bytes.',
        'groups': groups, 'targets': sum(len(g['targets']) for g in groups),
        'externalLinksOnOtherCopies': external}
(root/'link-plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'groups': len(groups), 'targets': plan['targets'], 'externalCopies': len(external)}, ensure_ascii=False))
