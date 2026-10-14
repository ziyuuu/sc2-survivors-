import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createGameServer} from './coze-web-server.mjs';

const root=process.cwd(),preview=path.resolve('preview/environment-delivery-20261014'),resources=path.resolve('deploy/runtime'),web=path.resolve('dist/MVP5-Final-Web-20261014');
const downloads={'/downloads/game.html':'dist/SC2-Survivors-MVP5-Final-20261014.html','/downloads/viewer.html':'dist/SC2-Survivors-MVP5-Five-Map-Viewer-R2-20261014.html'};
export function createEnvironmentDeliveryServer(){
 const game=createGameServer({webRoot:web,assetRoot:resources,backendOptions:{config:{enabled:false}}});
 return http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);res.end();return}
  if(url.pathname==='/play'){res.writeHead(302,{Location:'/play/'+url.search});res.end();return}
  if(url.pathname.startsWith('/play/')){req.url=url.pathname.slice(5)+url.search;game.emit('request',req,res);return}
  if(url.pathname.startsWith('/api/')||url.pathname==='/health'){game.emit('request',req,res);return}
  let file,base;if(downloads[url.pathname]){file=path.resolve(downloads[url.pathname]);base=path.resolve(root,'dist')}
  else {base=url.pathname.startsWith('/resources/')?resources:preview;let route;try{route=decodeURIComponent(url.pathname.startsWith('/resources/')?url.pathname.slice(11):url.pathname.slice(1))}catch{res.writeHead(400);res.end();return}file=path.resolve(base,route||'index.html')}
  if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return}
  fs.stat(file,(error,s)=>{if(error||!s.isFile()){res.writeHead(404);res.end();return}const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.gltf':'model/gltf+json'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':s.size,'Cache-Control':'no-store',...(downloads[url.pathname]?{'Content-Disposition':'attachment; filename="'+path.basename(file)+'"'}:{})});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res)});
 });
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))createEnvironmentDeliveryServer().listen(4375,'127.0.0.1',()=>console.log('Five-map final review: http://127.0.0.1:4375'));
