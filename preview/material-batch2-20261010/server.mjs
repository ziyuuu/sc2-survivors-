import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import path from 'node:path';
/** A candidate may use new, hash-bound material channels while old baselines keep original assets. */
export function labServer(lab){
 const roots={lab:path.resolve(lab),assets:path.resolve('deploy/runtime'),materials:path.resolve('public')};
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.webp':'image/webp','.ogg':'audio/ogg'};
 return createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}if(name==='/favicon.ico'){res.writeHead(204).end();return;}
  const base=name.startsWith('/assets/materials/')?roots.materials:name.startsWith('/assets/')?roots.assets:roots.lab,file=path.resolve(base,'.'+(name==='/'?'/index.html':name)),relative=path.relative(base,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
  res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.setHeader('Content-Length',statSync(file).size);res.setHeader('Cache-Control','no-cache');res.writeHead(200);if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 });
}
