"""Immutable local final ZIPs, verified entry by entry after writing."""
import hashlib,json,zipfile
from pathlib import Path

root=Path(__file__).resolve().parent.parent
app=root/'dist/MVP5-Final-Application-20261014'
evidence=root/'reports/local/mvp5-delivery-20261014'
delivery=json.loads((app/'delivery.json').read_text(encoding='utf-8'))
release=json.loads((app/'public/web-release.json').read_text(encoding='utf-8'))
groups=json.loads((app/'resource-groups.json').read_text(encoding='utf-8'))
prior=json.loads((evidence/'baseline/resource-groups.json').read_text(encoding='utf-8'))
assert delivery['release']==release['release']==groups['release']
old={r['url']:r for r in prior['files']}
added=[r for r in groups['files'] if r['url'] not in old]
assert len(added)==39

def sha(file):
    h=hashlib.sha256()
    with file.open('rb') as f:
        for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
    return h.hexdigest()

def checked(base,name,expected=None):
    file=(base/name).resolve()
    assert file.is_relative_to(base),name
    actual={'bytes':file.stat().st_size,'sha256':sha(file)}
    if expected:
        assert actual['bytes']==expected['bytes'] and actual['sha256']==expected['sha256'],name
    return file,actual

def pack(name,entries):
    output=root/'dist'/name
    rows=[]
    with zipfile.ZipFile(output,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for base,source,target,expected in entries:
            file,record=checked(base,source,expected)
            info=zipfile.ZipInfo(target,date_time=(1980,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
            with file.open('rb') as src,z.open(info,'w',force_zip64=True) as dst:
                for b in iter(lambda:src.read(4*1024*1024),b''):dst.write(b)
            rows.append({'path':target,**record})
    with zipfile.ZipFile(output) as z:
        assert z.namelist()==[r['path'] for r in rows]
        for r in rows:
            h=hashlib.sha256();size=0
            with z.open(r['path']) as f:
                for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b);size+=len(b)
            assert size==r['bytes'] and h.hexdigest()==r['sha256'],r['path']
    result={'path':str(output.relative_to(root)).replace('\\','/'),'bytes':output.stat().st_size,'sha256':sha(output),'entries':rows}
    print(json.dumps({k:v for k,v in result.items() if k!='entries'}),flush=True)
    return result

application=pack('MVP5-Final-Application-20261014.zip',[(app,r['path'],r['path'],r) for r in delivery['appFiles']]+[(app,'delivery.json','delivery.json',None)])
common=[(app,'public/'+release['manifest'],'public/'+release['manifest'],None),(app,'resource-groups.json','resource-groups.json',None)]
resources=pack('MVP5-Final-Resources-20261014.zip',[(root/'deploy/runtime',r['url'],'public/'+r['url'],r) for r in groups['files']]+common)
delta={'from':prior['release'],'to':release['release'],'files':added,'method':'Exact old-release resources required; otherwise use full resource ZIP.'}
(evidence/'resource-delta.json').write_text(json.dumps(delta,indent=2),encoding='utf-8')
increment=pack('MVP5-Final-Resources-From-0.6.26-20261014.zip',[(root/'deploy/runtime',r['url'],'public/'+r['url'],r) for r in added]+common+[(evidence,'resource-delta.json','resource-delta.json',None)])
report={'passed':True,'appBuildId':delivery['appBuildId'],'packageBuildId':delivery['packageBuildId'],'release':release['release'],'application':application,'resources':resources,'increment':increment,'addedFiles':len(added),'resourcesIncludedInApplication':0,'onlineOperations':False}
with (evidence/'packages.json').open('x',encoding='utf-8') as f:json.dump(report,f,indent=2)
