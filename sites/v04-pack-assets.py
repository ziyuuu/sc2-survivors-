import pathlib,json,shutil,gzip,collections
src=pathlib.Path('sites/v04-private-test/dist');out=pathlib.Path('sites/v04-packed/dist');(out/'assets').mkdir(parents=True,exist_ok=True)
manifest=next(src.glob('asset-manifest*.json'));m=json.loads(manifest.read_text('utf8'));unique={v['url']:v for v in m['assets'].values()};
for f in src.iterdir():
 if f.is_file() and f.name!='sites-sw.js':shutil.copy2(f,out/f.name)
for name in ['index-BdrSfdwC.css','index-Bhiz1hwz.js','sc2-entry.js.gz']:
 f=src/'assets'/name;shutil.copy2(f,out/'assets'/name)
p=out/'assets/sc2-entry.js.gz';s=gzip.decompress(p.read_bytes());old=b'length:Math.min(4,n.length)';assert s.count(old)==1;s=s.replace(old,b'length:Math.min(12,n.length)');p.write_bytes(gzip.compress(s,9,mtime=0))
index={};limit=4*1024*1024;group=[];size=0;bundles=[]
def flush():
 global group,size
 if not group:return
 name='bundle-%03d.bin'%len(bundles);f=out/'assets'/name;offset=0
 with f.open('wb') as dst:
  for url,row,data in group:
   dst.write(data);index[url]=[name,offset,len(data),row['mime'],url.endswith('.glb')];offset+=len(data)
 bundles.append((name,offset));group=[];size=0
for url,row in unique.items():
 f=src/url
 if url.endswith('.glb'):f=f.with_name(f.name+'.gz')
 data=f.read_bytes()
 if group and size+len(data)>limit:flush()
 group.append((url,row,data));size+=len(data)
flush()
(out/'sites-pack-index.js').write_text('self.SC2_PACK_INDEX='+json.dumps(index,separators=(',',':'))+';',encoding='utf8')
(out/'sites-sw.js').write_text('''importScripts('./sites-pack-index.js');
const bundles=new Map();
async function getBundle(name){let p=bundles.get(name);if(p){bundles.delete(name);bundles.set(name,p);return p}p=(async()=>{const r=await fetch(new URL('./assets/'+name,self.registration.scope));if(!r.ok)throw new Error('Bundle '+name+' HTTP '+r.status);return r.arrayBuffer()})();bundles.set(name,p);p.catch(()=>bundles.delete(name));while(bundles.size>16)bundles.delete(bundles.keys().next().value);return p}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==self.location.origin)return;const prefix=new URL(self.registration.scope).pathname;if(!u.pathname.startsWith(prefix))return;const key=decodeURIComponent(u.pathname.slice(prefix.length));const row=self.SC2_PACK_INDEX[key];if(!row)return;
event.respondWith((async()=>{try{const [name,offset,length,mime,isGlb]=row;const bundle=await getBundle(name);let bytes=bundle.slice(offset,offset+length);if(isGlb){let h=new Uint8Array(bytes);if(h[0]===31&&h[1]===139)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}return new Response(bytes,{headers:{'Content-Type':mime,'Cache-Control':'no-store'}})}catch(e){return new Response('Resource bundle unavailable',{status:502})}})());});
''',encoding='utf8')
print('resources',len(index),'bundles',len(bundles),'total bytes',sum(f.stat().st_size for f in out.rglob('*') if f.is_file()))
