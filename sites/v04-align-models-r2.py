import pathlib,struct,json,hashlib
p=pathlib.Path('sites/v04-compact-r2/dist');mfile=next(p.glob('asset-manifest*.json'));m=json.loads(mfile.read_text('utf8'));fix={};count=0
for f in (p/'assets').glob('*.glb'):
 b=f.read_bytes();jl=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+jl]);views=j.get('bufferViews',[])
 if not any(v.get('byteOffset',0)%4 for v in views):continue
 pos=20+jl;bl=struct.unpack_from('<I',b,pos)[0];binary=b[pos+8:pos+8+bl]; chunks=[];cursor=out=0
 for i,v in sorted(enumerate(views),key=lambda x:x[1].get('byteOffset',0)):
  start=v.get('byteOffset',0);n=v['byteLength'];assert start>=cursor
  gap=binary[cursor:start];chunks.append(gap);out+=len(gap);pad=(-out)%4;chunks.append(b'\0'*pad);out+=pad
  v['byteOffset']=out;data=binary[start:start+n];chunks.append(data);out+=len(data);cursor=start+n
 chunks.append(binary[cursor:]);binary=b''.join(chunks);j['buffers'][0]['byteLength']=len(binary);binary+=b'\0'*((-len(binary))%4);jb=json.dumps(j,ensure_ascii=False,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4)
 data=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(binary))+struct.pack('<I4s',len(jb),b'JSON')+jb+struct.pack('<I4s',len(binary),b'BIN\0')+binary
 h=hashlib.sha256(data).hexdigest();new=f.with_name(h+'.glb');new.write_bytes(data);fix['assets/'+f.name]={'url':'assets/'+new.name,'bytes':len(data),'sha256':h,'mime':'model/gltf-binary'};f.unlink();count+=1
for k,v in list(m['assets'].items()):
 if v['url'] in fix:m['assets'][k]=fix[v['url']]
m['release']=hashlib.sha256(json.dumps(m['assets'],sort_keys=True,separators=(',',':')).encode()).hexdigest();mfile.write_text(json.dumps(m,separators=(',',':')),encoding='utf8');wfile=p/'web-release.json';w=json.loads(wfile.read_text('utf8'));w['release']=m['release'];wfile.write_text(json.dumps(w,indent=2),encoding='utf8');print('repaired models',count,'new release',m['release'])
