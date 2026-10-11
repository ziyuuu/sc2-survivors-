import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync,readFileSync} from 'node:fs';
import path from 'node:path';
/** A candidate may use new, hash-bound material channels while old baselines keep original assets. */
export function labServer(lab){
 const roots={lab:path.resolve(lab),assets:path.resolve('deploy/runtime'),materials:path.resolve('public')};
 const frozenManifest=path.join(roots.lab,'asset-manifest.json'),environment=existsSync(frozenManifest)?new Map(Object.values(JSON.parse(readFileSync(frozenManifest,'utf8')).assets).filter(r=>r.url?.startsWith('assets/environment/')).map(r=>['/'+r.url,r.sha256])):new Map();
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ogg':'audio/ogg','.webm':'video/webm'};
 return createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}if(name==='/favicon.ico'){res.writeHead(204).end();return;}
  const pinned=environment.get(name);if(pinned&&!/^[a-f0-9]{64}$/.test(pinned)){res.writeHead(500).end('Invalid immutable asset binding');return;}
  const base=pinned?roots.assets:(name.startsWith('/assets/materials/')||name.startsWith('/assets/environment/'))?roots.materials:name.startsWith('/assets/')?roots.assets:roots.lab,file=pinned?path.join(base,'assets',pinned+'.png'):path.resolve(base,'.'+(name==='/'?'/index.html':name)),relative=path.relative(base,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
  const size=statSync(file).size;res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.setHeader('Cache-Control','no-cache');
  const range=path.extname(file)==='.webm'&&req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=Math.min(size-1,range[2]?Number(range[2]):size-1);if(start>=size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+size}).end();return;}res.writeHead(206,{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);return;}
  res.setHeader('Content-Length',size);if(path.extname(file)==='.webm')res.setHeader('Accept-Ranges','bytes');res.writeHead(200);if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 });
}
