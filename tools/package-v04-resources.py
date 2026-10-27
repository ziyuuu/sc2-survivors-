"""Create and round-trip check the local Web, full-resource and delta packages."""
import hashlib, json, zipfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
destination=root/'dist/V04-20261027'
web=root/'dist/web'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
release=read(web/'web-release.json')
manifest=read(web/release['manifest'])
groups=read(destination/'Application/resource-groups.json')
delta=read(destination/'Application/resource-delta.json')
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
    return h.hexdigest()
def package(name, rows):
    output=destination/name
    with zipfile.ZipFile(output,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
        for source,entry,expected in rows:
            assert source.is_file() and source.is_relative_to(web)
            assert digest(source)==expected
            z.write(source,entry)
    with zipfile.ZipFile(output) as z:
        assert set(z.namelist())=={entry for _,entry,_ in rows}
        for source,entry,expected in rows:
            h=hashlib.sha256()
            with z.open(entry) as f:
                for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
            assert h.hexdigest()==expected,entry
    result={'path':output.relative_to(root).as_posix(),'bytes':output.stat().st_size,'sha256':digest(output),'files':len(rows),'roundTripVerified':True}
    print(json.dumps(result),flush=True)
    return result
resource_rows=lambda rows:[(web/r['url'],'public/'+r['url'],r['sha256']) for r in rows]
results=[]
results.append(package('Resources.zip',resource_rows(groups['files'])))
results.append(package('Resources-Update.zip',resource_rows(delta['files'])))
rows=[]
for p in sorted(web.rglob('*')):
    if p.is_file():rows.append((p,p.relative_to(web).as_posix(),digest(p)))
results.append(package('Web.zip',rows))
report={'release':release,'packages':results,'deltaFrom':delta['from'],'deployed':False}
(root/'.cache/v04-20261027/resource-packages.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
