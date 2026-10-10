"""Zip a checksummed application without replacing any resource-delta archive."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--app', required=True)
parser.add_argument('--report', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
app = (root / args.app).resolve()
if not app.is_relative_to(root / 'dist'):
    raise RuntimeError('Application must be inside dist')
output = app.with_suffix('.zip')
if output.exists():
    raise RuntimeError('Archive already exists; use a new application destination')
delivery = json.loads((app / 'delivery.json').read_text(encoding='utf-8'))
checked = []
for row in delivery['appFiles']:
    file = (app / row['path']).resolve()
    if not file.is_relative_to(app):
        raise RuntimeError('Invalid application path')
    data = file.read_bytes()
    if len(data) != row['bytes'] or hashlib.sha256(data).hexdigest() != row['sha256']:
        raise RuntimeError('Application checksum mismatch: ' + row['path'])
    checked.append((row['path'], data))
checked.append(('delivery.json', (app / 'delivery.json').read_bytes()))
with zipfile.ZipFile(output, 'x') as archive:
    for name, data in checked:
        info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, data, compresslevel=6)
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('ZIP CRC verification failed')
    for name, data in checked:
        if archive.read(name) != data:
            raise RuntimeError('ZIP round trip mismatch: ' + name)
result = {'path': str(output.relative_to(root)).replace('\\', '/'),
          'bytes': output.stat().st_size,
          'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
          'files': len(checked), 'packageBuildId': delivery['packageBuildId'],
          'verifiedRoundTrip': True, 'deployed': False}
report = (root / args.report).resolve()
if not report.is_relative_to(root / 'reports'):
    raise RuntimeError('Report must be inside reports')
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
