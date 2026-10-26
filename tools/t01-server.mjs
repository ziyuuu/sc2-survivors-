import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
export async function serveT01(options={}){
 const build=JSON.parse(await fs.readFile(options.buildPath??'reports/local/t01-20261024/build.json','utf8')),root=path.resolve(build.out),assets=new Map(build.resources.map(r=>['/'+r.url,r]));
 const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const asset=assets.get(pathname);if(asset){res.writeHead(200,{'Content-Length':asset.bytes,'Content-Type':pathname.endsWith('.glb')?'model/gltf-binary':pathname.endsWith('.png')?'image/png':'application/octet-stream'});createReadStream(asset.source).pipe(res);return;}
  const file=pathname==='/'?'dynamic.html':pathname.slice(1);
  if(![...build.artifacts.map(a=>a.file),'asset-manifest.json','runtime-config.json'].includes(file)){res.writeHead(404);res.end();return;}
  const bytes=await fs.readFile(path.join(root,file));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html; charset=utf-8':'application/json'});res.end(bytes);
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:'http://127.0.0.1:'+server.address().port,build,close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};
}
