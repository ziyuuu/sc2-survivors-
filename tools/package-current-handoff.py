"""Package the verified current application and the recorded live resource delta."""
import argparse, hashlib, json, zipfile
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--app',required=True)
parser.add_argument('--delta',required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
app=(root/args.app).resolve()
if not app.is_relative_to(root/'dist'):
    raise RuntimeError('Application must be inside dist')
delivery=json.loads((app/'delivery.json').read_text(encoding='utf-8'))
web=root/'dist/web'
release=json.loads((web/'web-release.json').read_text(encoding='utf-8'))
if delivery['appBuildId']!=release['appBuildId'] or delivery['release']!=release['release']:
    raise RuntimeError('Application differs from current Web build')
delta=json.loads((root/args.delta).read_text(encoding='utf-8'))
if delta['to']!=release['release']:
    raise RuntimeError('Recorded resource delta differs from target release')

def checked(base, name, size, digest):
    file=(base/name).resolve()
    if not file.is_relative_to(base) or file.stat().st_size!=size or hashlib.sha256(file.read_bytes()).hexdigest()!=digest:
        raise RuntimeError('Package file missing or changed: '+name)
    return file

def add(z, file, name):
    info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0))
    info.compress_type=zipfile.ZIP_DEFLATED
    info.external_attr=0o644<<16
    z.writestr(info,file.read_bytes(),compresslevel=6)

with zipfile.ZipFile(app.with_suffix('.zip'),'w') as z:
    for row in delivery['appFiles']:
        add(z,checked(app,row['path'],row['bytes'],row['sha256']),row['path'])
    add(z,app/'delivery.json','delivery.json')

output=root/'dist/Current-Coze-Resources-From-Live-20261006.zip'
with zipfile.ZipFile(output,'w') as z:
    for row in delta['files']:
        add(z,checked(web,row['url'],row['bytes'],row['sha256']),row['url'])
    add(z,web/release['manifest'],release['manifest'])
    add(z,root/args.delta,'resource-delta.json')
print(json.dumps({'application':str(app.with_suffix('.zip')),'resourceDelta':str(output),'files':len(delta['files']),'resourceBytes':sum(row['bytes'] for row in delta['files']),'deployed':False}))
