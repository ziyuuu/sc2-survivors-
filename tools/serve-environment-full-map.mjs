import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
export function createEnvironmentReviewServer(){
 const root=process.cwd(),entry='/preview/environment-full-map-20261014/',mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.gltf':'model/gltf+json','.glb':'model/gltf-binary','.webp':'image/webp'};
 return http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let parsed,url;try{parsed=new URL(req.url,'http://localhost');url=decodeURIComponent(parsed.pathname)}catch{res.writeHead(400);res.end();return;}
  if(url==='/'){res.writeHead(302,{Location:entry+parsed.search});res.end();return}if(url.endsWith('/'))url+='index.html';
  const file=path.resolve(root,'.'+url),allowed=['preview/environment-full-map-20261014','public'].some(p=>file.startsWith(path.resolve(root,p)+path.sep));
  if(!allowed||!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  fs.stat(file,(e,s)=>{if(e||!s.isFile()){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':s.size,'Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res)});
 });
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/serve-environment-full-map.mjs'))createEnvironmentReviewServer().listen(4372,'127.0.0.1',()=>console.log('Full environment: http://127.0.0.1:4372'));
