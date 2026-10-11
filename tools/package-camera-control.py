"""Package the manifest-verified camera application without touching other deliveries."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
app = root / 'dist/Camera-Control-Final-Application-20261011'
output = app.with_suffix('.zip')
report = root / 'reports/local/camera-control-20261011/zip-release.json'
if output.exists() or report.exists():
    raise RuntimeError('Named evidence already exists')
delivery = json.loads((app / 'delivery.json').read_text(encoding='utf-8'))
rows = delivery['appFiles']
with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for row in rows:
        file = (app / row['path']).resolve()
        if not file.is_relative_to(app.resolve()):
            raise RuntimeError('Path escapes application')
        data = file.read_bytes()
        if len(data) != row['bytes'] or hashlib.sha256(data).hexdigest() != row['sha256']:
            raise RuntimeError('Manifest mismatch: ' + row['path'])
        archive.writestr(row['path'], data)
    archive.write(app / 'delivery.json', 'delivery.json')
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None or len(archive.infolist()) != len(rows) + 1:
        raise RuntimeError('ZIP verification failed')
    for row in rows:
        if hashlib.sha256(archive.read(row['path'])).hexdigest() != row['sha256']:
            raise RuntimeError('ZIP member mismatch: ' + row['path'])
result = {'passed': True, 'path': output.relative_to(root).as_posix(), 'bytes': output.stat().st_size,
          'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'members': len(rows) + 1,
          'packageBuildId': delivery['packageBuildId'], 'appBuildId': delivery['appBuildId'],
          'resourceRelease': delivery['release'], 'embeddedRuntimeResources': 0, 'verifiedRoundTrip': True}
report.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
