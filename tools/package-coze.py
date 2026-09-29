"""Ship the already built Web release, without source art or local QA data."""
import hashlib, json, zipfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
web=root/'dist/web'
release=json.loads((web/'web-release.json').read_text(encoding='utf-8'))
manifest=json.loads((web/release['manifest']).read_text(encoding='utf-8'))
resources={a['url']:a for a in manifest['assets'].values()}
out=root/'dist/coze-deployment'
out.mkdir(exist_ok=True)
def add(z,source,name):
    info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
    z.writestr(info,source.read_bytes(),compresslevel=6)
with zipfile.ZipFile(out/'SC2-Coze-App.zip','w') as z:
    app=root/'deploy/coze'
    delivery=json.loads((app/'delivery.json').read_text(encoding='utf-8'))
    if delivery['release']!=release['release'] or delivery['appBuildId']!=release['appBuildId']:
        raise RuntimeError('Run publish-coze-tree.mts for this Web release first')
    for relative in delivery['app']:
        add(z,app/'public'/relative,'SC2-Coze-App/public/'+relative)
    for name in ['coze-web-server.mjs','fetch-resources.mjs','apply-update.mjs','start-coze.mjs','package.json','delivery.json','resource-groups.json','resource-delta.json','DEPLOY.md']:
        add(z,app/name,'SC2-Coze-App/'+name)
with zipfile.ZipFile(out/'SC2-Web-Resources.zip','w') as z:
    for url,a in sorted(resources.items()):
        source=web/url
        if source.stat().st_size!=a['bytes'] or hashlib.sha256(source.read_bytes()).hexdigest()!=a['sha256']:
            raise RuntimeError('Resource integrity mismatch: '+url)
        add(z,source,url)
    add(z,web/release['manifest'],release['manifest'])
    add(z,web/'web-release.json','web-release.json')
    add(z,root/'docs/project/COZE_GITHUB_DEPLOY.md','DEPLOY.md')
delta=json.loads((root/'deploy/coze/resource-delta.json').read_text(encoding='utf-8'))
with zipfile.ZipFile(out/'SC2-Web-Resources-Update.zip','w') as z:
    for a in delta['files']:
        source=web/a['url']
        if source.stat().st_size!=a['bytes'] or hashlib.sha256(source.read_bytes()).hexdigest()!=a['sha256']:
            raise RuntimeError('Delta resource integrity mismatch')
        add(z,source,a['url'])
    add(z,root/'deploy/coze/resource-delta.json','resource-delta.json')
    add(z,web/release['manifest'],release['manifest'])
result={'release':release,'packages':[]}
for name in ['SC2-Coze-App.zip','SC2-Web-Resources.zip','SC2-Web-Resources-Update.zip']:
    file=out/name
    result['packages'].append({'file':name,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(out/'CHECKSUMS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
