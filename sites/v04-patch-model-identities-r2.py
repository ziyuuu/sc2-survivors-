import json,pathlib,hashlib
orig=json.loads(next(pathlib.Path('sites/v04-original-staging').glob('asset-manifest*.json')).read_text('utf8'))['assets'];new=json.loads(next(pathlib.Path('sites/v04-compact-r2/dist').glob('asset-manifest*.json')).read_text('utf8'))['assets'];p=pathlib.Path('sites/v04-compact-r2/dist/assets');parts=sorted(p.glob('sc2-entry-part-*.bin'));js=b''.join(x.read_bytes() for x in parts);mapping={v['sha256']:new[k]['sha256'] for k,v in orig.items() if k in new and v['mime']=='model/gltf-binary' and v['sha256']!=new[k]['sha256']};count=0
for a,b in mapping.items():
 n=js.count(a.encode());count+=n
 if n:js=js.replace(a.encode(),b.encode())
step=8*1024*1024
for i,f in enumerate(parts):f.write_bytes(js[i*step:(i+1)*step])
print('updated embedded model identities:',count,'source bytes:',len(js))
