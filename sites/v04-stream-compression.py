import pathlib,shutil,gzip,concurrent.futures
src=pathlib.Path('sites/v04-compact-r2/dist');out=pathlib.Path('sites/v04-compact-r3/dist');shutil.copytree(src,out)
p=out/'assets';files=list(p.glob('*.glb'))
def compress(f):
 data=gzip.compress(f.read_bytes(),compresslevel=9,mtime=0);f.with_name(f.name+'.gz').write_bytes(data);f.unlink();return len(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as e: sizes=list(e.map(compress,files))
parts=sorted(p.glob('sc2-entry-part-*.bin'));data=b''.join(x.read_bytes() for x in parts);(p/'sc2-entry.js.gz').write_bytes(gzip.compress(data,9,mtime=0));[x.unlink() for x in parts]
(p/'index-Bhiz1hwz.js').write_text('''if (!('serviceWorker' in navigator) || !('DecompressionStream' in globalThis)) throw new Error('该浏览器不支持本测试版的资源解压，请使用新版 Chrome 或 Edge');
await navigator.serviceWorker.register(new URL('../sites-sw.js', import.meta.url), {scope:'../'});
await navigator.serviceWorker.ready;
if (!navigator.serviceWorker.controller) await new Promise((resolve,reject) => {const t=setTimeout(()=>reject(new Error('资源服务启动超时')),15000); navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(t);resolve()}, {once:true}); if(navigator.serviceWorker.controller){clearTimeout(t);resolve()}});
const response=await fetch(new URL('./sc2-entry.js.gz',import.meta.url)); if(!response.ok) throw new Error('游戏程序下载失败：'+response.status);
let bytes=await response.arrayBuffer(); if(new Uint8Array(bytes)[0]===31 && new Uint8Array(bytes)[1]===139) bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
const url=URL.createObjectURL(new Blob([bytes],{type:'text/javascript'})); try {await import(url)} finally {URL.revokeObjectURL(url)}
''',encoding='utf8')
(out/'sites-sw.js').write_text('''self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin || !/\\/assets\\/[a-f0-9]{64}\\.glb$/.test(url.pathname))return;
event.respondWith((async()=>{url.pathname += '.gz';const result=await fetch(url,{cache:'default'});if(!result.ok)return new Response('Compressed model unavailable',{status:result.status});let bytes=await result.arrayBuffer();let header=new Uint8Array(bytes);if(header[0]===31 && header[1]===139)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return new Response(bytes,{status:200,headers:{'Content-Type':'model/gltf-binary','Cache-Control':'no-store'}})})());});
''',encoding='utf8')
print('models:',len(files),'compressed bytes:',sum(sizes),'total bytes:',sum(x.stat().st_size for x in out.rglob('*') if x.is_file()))
