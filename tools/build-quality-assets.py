"""Generate world variants from original runtime sources, preserving current high bytes.
Run inventory with node --import tsx tools/build-quality-assets.mjs first.
"""
import concurrent.futures,copy,gzip,hashlib,io,json,pathlib,struct,sys,shutil
from PIL import Image
cfg=json.loads(pathlib.Path(sys.argv[1]).read_text('utf8'));src=pathlib.Path(cfg['packed']);out=pathlib.Path(cfg['output']);public=out/'public';(public/'assets').mkdir(parents=True,exist_ok=True)
release=json.loads((src/'web-release.json').read_text('utf8'));manifest=json.loads((src/release['manifest']).read_text('utf8'));records={r['id']:r for r in cfg['records']};protected=set(cfg['protectedIds']);menu=set(cfg['menuIds'])
index=json.loads((src/'sites-pack-index.js').read_text('utf8').removeprefix('self.SC2_PACK_INDEX=').rstrip(';\n'))
sha=lambda b:hashlib.sha256(b).hexdigest()
def high_bytes(row):
 name,offset,length,_,compressed=index[row['url']]
 with (src/'assets'/name).open('rb') as f:f.seek(offset);raw=f.read(length)
 if compressed and raw[:2]==b'\x1f\x8b':raw=gzip.decompress(raw)
 assert sha(raw)==row['sha256'] and len(raw)==row['bytes']
 return raw
def scaled(raw,tier):
 im=Image.open(io.BytesIO(raw));im.load();w,h=im.size
 if max(w,h)<=128:return None
 factor=min(.5 if tier=='medium' else .25,(1024 if tier=='medium' else 512)/max(w,h));factor=max(factor,32/min(w,h));size=(max(1,round(w*factor)),max(1,round(h*factor)))
 if factor>=1:return None # Preserve thin strips/line assets.
 im=im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB').resize(size,Image.Resampling.LANCZOS)
 b=io.BytesIO();im.save(b,'WEBP',quality=82,method=4,exact=True)
 return b.getvalue(),size
def parts(raw):
 magic,version,total=struct.unpack_from('<4sII',raw);assert magic==b'glTF' and version==2 and total==len(raw)
 jl,jt=struct.unpack_from('<I4s',raw,12);assert jt==b'JSON';j=json.loads(raw[20:20+jl]);bl,bt=struct.unpack_from('<I4s',raw,20+jl);assert bt==b'BIN\0'
 return j,raw[28+jl:28+jl+bl]
def model(raw,tier,high):
 j,binary=parts(high);source,sourcebin=parts(raw);assert len(j.get('images',[]))==len(source.get('images',[]));original=copy.deepcopy(j);views=j.get('bufferViews',[]);eligible=set();blocked=set()
 def image(t):
  tex=j.get('textures',[])[t['index']];return tex.get('source',tex.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))
 for m in j.get('materials',[]):
  for t in [m.get('pbrMetallicRoughness',{}).get('baseColorTexture'),m.get('emissiveTexture')]:
   if t:eligible.add(image(t))
  for t in [m.get('normalTexture'),m.get('occlusionTexture')]:
   if t:blocked.add(image(t))
  for layer in m.get('extras',{}).get('sc2',{}).get('layers',[]):
   if 'index' in layer and layer.get('role') not in ('diffuse','emissive','emissive2'):blocked.add(image(layer))
 changes={};dimensions=[]
 for i,img in enumerate(j.get('images',[])):
  if i not in eligible or i in blocked or 'bufferView' not in img:continue
  vi=img['bufferView'];v=source['bufferViews'][source['images'][i]['bufferView']];start=v.get('byteOffset',0);result=scaled(sourcebin[start:start+v['byteLength']],tier)
  if result:changes[vi]=result[0];img['mimeType']='image/webp';dimensions.append(result[1])
 if not changes:return None
 for tex in j.get('textures',[]):
  i=tex.get('source',tex.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))
  if i is not None and j['images'][i].get('bufferView') in changes:
   tex.pop('source',None);tex.setdefault('extensions',{})['EXT_texture_webp']={'source':i}
 for key in ('extensionsUsed','extensionsRequired'):
  if 'EXT_texture_webp' not in j.setdefault(key,[]):j[key].append('EXT_texture_webp')
 chunks=[];position=0;cursor=0
 for vi,v in sorted(enumerate(views),key=lambda x:x[1].get('byteOffset',0)):
  start=v.get('byteOffset',0);length=v['byteLength'];assert start>=cursor and v.get('buffer',0)==0
  gap=binary[cursor:start];chunks.append(gap);position+=len(gap);padding=(-position)%4;chunks.append(b'\0'*padding);position+=padding
  data=changes.get(vi,binary[start:start+length]);v['byteOffset']=position;v['byteLength']=len(data);chunks.append(data);position+=len(data);cursor=start+length
 chunks.append(binary[cursor:]);newbin=b''.join(chunks);j['buffers'][0]['byteLength']=len(newbin);newbin+=b'\0'*((-len(newbin))%4)
 jb=json.dumps(j,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4)
 result=struct.pack('<4sII',b'glTF',2,28+len(jb)+len(newbin))+struct.pack('<I4s',len(jb),b'JSON')+jb+struct.pack('<I4s',len(newbin),b'BIN\0')+newbin
 # Every non-image buffer view, including animation and geometry, is byte identical.
 for i,v in enumerate(original.get('bufferViews',[])):
  if i not in changes:assert binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]==newbin[views[i]['byteOffset']:views[i]['byteOffset']+views[i]['byteLength']]
 return result,dimensions
payload={};groups={};newassets={};stats={'variants':{'medium':0,'low':0},'bytes':{},'protected':len(protected),'geometryChecked':0}
def convert(item):
 id,row=item;high=high_bytes(row);r=records[id];variants={};raw=None
 allowed=id not in protected and r['kind'] not in ('effect-texture','icon','portrait','audio') and not id.startswith(('ui.','unit.','building.','tech.','skill.','p4.','fx.','starship.'))
 if allowed and (row['mime']=='model/gltf-binary' or row['mime'].startswith('image/') and row['mime']!='image/svg+xml'):
  raw=pathlib.Path(r['packedFile']).read_bytes()
  for tier in ('medium','low'):
   result=model(raw,tier,high) if row['mime']=='model/gltf-binary' else scaled(raw,tier)
   if result:
    data,dimensions=result;ext='glb' if row['mime']=='model/gltf-binary' else 'webp';h=sha(data);v={'url':f'assets/{h}.{ext}','sha256':h,'bytes':len(data),'mime':'model/gltf-binary' if ext=='glb' else 'image/webp'}
    if len(data)>=len(high):continue
    if ext=='webp':v.update(width=dimensions[0],height=dimensions[1])
    variants[tier]=(v,data)
 return id,row,high,variants
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for n,(id,row,high,variants) in enumerate(pool.map(convert,manifest['assets'].items())):
  if n%300==0:print('variants',n,'/',len(manifest['assets']),flush=True)
  payload[row['url']]=high;groups.setdefault(row['url'],'menu' if id in menu else 'audio' if row['mime'].startswith('audio/') else 'high' if variants else 'common');newassets[id]=dict(row)
  if variants:
   newassets[id]['variants']={t:v for t,(v,_) in variants.items()}
   for t,(v,data) in variants.items():payload[v['url']]=data;groups[v['url']]=t;stats['variants'][t]+=1
   if row['mime']=='model/gltf-binary':stats['geometryChecked']+=1
# Any content needed without a variant belongs in the shared group.
for a in newassets.values():
 if not all(t in a.get('variants',{}) for t in ('medium','low')) and groups[a['url']]=='high':groups[a['url']]='common'
newindex={};bundles=[]
for group in ('menu','audio','common','high','medium','low'):
 batch=[];size=0
 def flush():
  global batch,size
  if not batch:return
  raw=b''.join(b for _,_,b in batch);name=f'bundle-{group}-{sha(raw)[:20]}.bin';(public/'assets'/name).write_bytes(raw);offset=0
  for url,mime,data in batch:newindex[url]=[name,offset,len(data),mime,url.endswith('.glb')];offset+=len(data)
  bundles.append({'name':name,'bytes':len(raw),'group':group});batch=[];size=0
 for url in sorted(u for u in payload if groups[u]==group):
  raw=payload[url];data=gzip.compress(raw,9,mtime=0) if url.endswith('.glb') else raw
  mime='model/gltf-binary' if url.endswith('.glb') else next((a['mime'] for a in newassets.values() if a['url']==url), 'image/webp')
  if batch and size+len(data)>(256*1024 if group=='audio' else 2*1024**2):flush()
  batch.append((url,mime,data));size+=len(data)
 flush()
for a in newassets.values():
 for v in [a,*a.get('variants',{}).values()]:v['bundle']=newindex[v['url']][0]
resourceRelease=sha(json.dumps(newassets,sort_keys=True,separators=(',',':')).encode());manifestName=f'asset-manifest.{resourceRelease}.json'
(public/manifestName).write_text(json.dumps({'version':1,'release':resourceRelease,'assets':newassets},separators=(',',':')),'utf8')
indexCode='self.SC2_PACK_INDEX='+json.dumps(newindex,separators=(',',':'))+';';indexName='sites-pack-index.'+sha(indexCode.encode())[:20]+'.js'
(public/indexName).write_text(indexCode,'utf8');(public/'sites-pack-index.js').write_text(indexCode,'utf8')
worker=pathlib.Path('tools/packed-sites-sw.js').read_text('utf8').replace("'./sites-pack-index.js'",repr('./'+indexName));(public/'sites-sw.js').write_text(worker,'utf8')
for f in src.iterdir():
 if f.is_file() and f.suffix not in ('.bin',) and f.name not in ('web-release.json','sites-sw.js','sites-pack-index.js') and not f.name.startswith('asset-manifest.'):shutil.copy2(f,public/f.name)
for f in (src/'assets').iterdir():
 if not f.name.startswith('bundle-'):shutil.copy2(f,public/'assets'/f.name)
html=(public/'index.html').read_text('utf8').replace(release['manifest'],manifestName);(public/'index.html').write_text(html,'utf8')
logicalBytes=sum(v['bytes'] for a in newassets.values() for v in [a,*a.get('variants',{}).values()]);uniqueBytes=sum(map(len,payload.values()))
release.update(release=resourceRelease,manifest=manifestName,qualityVariants=True,fileCount=len(payload),assetBytes=uniqueBytes,logicalBytes=logicalBytes,sharedBytes=logicalBytes-uniqueBytes,variantRecordCount=sum(len(a.get('variants',{})) for a in newassets.values()),packedBytes=sum(b['bytes'] for b in bundles))
(public/'web-release.json').write_text(json.dumps(release,indent=2),'utf8')
stats.update(resourceRelease=resourceRelease,bundles=bundles,uniqueFiles=len(payload),packedBytes=sum(b['bytes'] for b in bundles))
for tier in ('high','medium','low'):
 selected={a.get('variants',{}).get(tier,a)['url'] for a in newassets.values()};stats['bytes'][tier]=sum(len(payload[u]) for u in selected)
(out/'quality-build.json').write_text(json.dumps(stats,indent=2),'utf8');print(json.dumps({k:v for k,v in stats.items() if k!='bundles'}),flush=True)
