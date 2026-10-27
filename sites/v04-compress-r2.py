import concurrent.futures,hashlib,io,json,os,pathlib,struct,subprocess,sys,shutil,threading,time
from PIL import Image
sys.path.insert(0,'sites/v04-compression-tools');import imageio_ffmpeg
SRC=pathlib.Path('sites/v04-original-staging'); OUT=pathlib.Path('sites/v04-compact-r2/dist'); OUT.mkdir(parents=True,exist_ok=True);(OUT/'assets').mkdir(exist_ok=True)
FF=imageio_ffmpeg.get_ffmpeg_exe(); lock=threading.Lock(); stats={'done':0,'before':0,'after':0,'changed':0}; quality=70
manifest_path=next(SRC.glob('asset-manifest*.json')); original=json.loads(manifest_path.read_text(encoding='utf8')); records=original['assets']; unique={v['url']:v for v in records.values()}

def webp(raw):
 im=Image.open(io.BytesIO(raw)); im.load()
 if im.mode not in ('RGB','RGBA'): im=im.convert('RGBA' if 'transparency' in im.info or 'A' in im.getbands() else 'RGB')
 out=io.BytesIO();im.save(out,format='WEBP',quality=quality,method=4,lossless=False,exact=True);return out.getvalue()

def glb(raw):
 magic,version,total=struct.unpack_from('<4sII',raw,0)
 if magic!=b'glTF' or version!=2 or total!=len(raw): raise ValueError('invalid glb')
 jl,jt=struct.unpack_from('<I4s',raw,12); assert jt==b'JSON'; j=json.loads(raw[20:20+jl]); pos=20+jl; bl,bt=struct.unpack_from('<I4s',raw,pos);assert bt==b'BIN\0';binary=raw[pos+8:pos+8+bl]; assert pos+8+bl==len(raw)
 views=j.get('bufferViews',[]); images=j.get('images',[]); replacement={}; changed_idx=set()
 for i,img in enumerate(images):
  if img.get('mimeType') not in ('image/png','image/webp') or 'bufferView' not in img:continue
  vi=img['bufferView'];v=views[vi];a=v.get('byteOffset',0);data=binary[a:a+v['byteLength']];opt=webp(data)
  if len(opt)<len(data):replacement[vi]=opt;img['mimeType']='image/webp';changed_idx.add(i)
 if not replacement:return raw
 for tex in j.get('textures',[]):
  if tex.get('source') in changed_idx:
   source=tex.pop('source');tex.setdefault('extensions',{})['EXT_texture_webp']={'source':source}
 used=j.setdefault('extensionsUsed',[]);req=j.setdefault('extensionsRequired',[])
 if 'EXT_texture_webp' not in used:used.append('EXT_texture_webp')
 if 'EXT_texture_webp' not in req:req.append('EXT_texture_webp')
 order=sorted(enumerate(views),key=lambda x:x[1].get('byteOffset',0));chunks=[];cursor=0;outpos=0
 for vi,v in order:
  if v.get('buffer',0)!=0:raise ValueError('external glb buffer')
  start=v.get('byteOffset',0);length=v['byteLength']
  if start<cursor:raise ValueError('overlapping views')
  gap=binary[cursor:start];chunks.append(gap);outpos+=len(gap)
  if vi in replacement:
   padding=(-outpos)%4;chunks.append(b'\0'*padding);outpos+=padding
  data=replacement.get(vi,binary[start:start+length]);v['byteOffset']=outpos;v['byteLength']=len(data);chunks.append(data);outpos+=len(data);cursor=start+length
 chunks.append(binary[cursor:]);binary=b''.join(chunks);j['buffers'][0]['byteLength']=len(binary);binary+=b'\0'*((-len(binary))%4)
 jb=json.dumps(j,ensure_ascii=False,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4)
 return struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(binary))+struct.pack('<I4s',len(jb),b'JSON')+jb+struct.pack('<I4s',len(binary),b'BIN\0')+binary

def convert(item):
 url,row=item;source=SRC/url; raw=source.read_bytes();ext=source.suffix.lower();mime=row['mime'];result=raw;out_ext=ext
 if ext=='.wav':
  p=subprocess.run([FF,'-loglevel','error','-i',str(source),'-c:a','libopus','-b:a','48k','-vbr','on','-f','ogg','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  if p.returncode:raise RuntimeError('audio conversion failed '+url+' '+p.stderr.decode('utf8','replace')[-400:])
  if len(p.stdout)<len(raw):result=p.stdout;out_ext='.ogg';mime='audio/ogg'
 elif ext in ('.png','.webp'):
  opt=webp(raw)
  if len(opt)<len(raw):result=opt;out_ext='.webp';mime='image/webp'
 elif ext=='.glb':result=glb(raw)
 h=hashlib.sha256(result).hexdigest();dest=OUT/'assets'/(h+out_ext);dest.write_bytes(result)
 with lock:
  stats['done']+=1;stats['before']+=len(raw);stats['after']+=len(result);stats['changed']+=result!=raw
  if stats['done']%200==0:print('resources',stats['done'],'/',len(unique),'MB',round(stats['after']/1e6),flush=True)
 return url,{'url':'assets/'+dest.name,'bytes':len(result),'sha256':h,'mime':mime}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex: mapping=dict(ex.map(convert,unique.items()))
new={k:mapping[v['url']] for k,v in records.items()}; release=hashlib.sha256(json.dumps(new,sort_keys=True,separators=(',',':')).encode()).hexdigest();newmanifest={'version':1,'release':release,'assets':new};(OUT/manifest_path.name).write_text(json.dumps(newmanifest,separators=(',',':')),encoding='utf8')
for f in SRC.iterdir():
 if f.is_file() and f!=manifest_path:shutil.copy2(f,OUT/f.name)
for f in (SRC/'assets').iterdir():
 if f.is_file() and f.name not in {pathlib.PurePosixPath(u).name for u in unique}:shutil.copy2(f,OUT/'assets'/f.name)
web=OUT/'web-release.json'
if web.exists():
 w=json.loads(web.read_text(encoding='utf8'));w['release']=release;w['assetBytes']=sum(x['bytes'] for x in mapping.values());web.write_text(json.dumps(w,indent=2),encoding='utf8')
print(json.dumps({'status':'complete','stats':stats,'release':release,'assets':len(new)},ensure_ascii=False),flush=True)
