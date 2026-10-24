import fs from 'node:fs/promises';
const old='D:/星际/reports/local/g03-content-20261022',base='D:/星际/reports/local/d05-checkpoint-20261023';
for(const name of ['build-web.mjs','assemble-offline.mjs','verify-offline.mts']){
 let s=await fs.readFile(old+'/'+name,'utf8');s=s.replaceAll('g03-content-20261022','d05-checkpoint-20261023').replaceAll('G03','D05').replaceAll('difficulty content and entry gates','equipment checkpoint persistence');
 await fs.writeFile(base+'/'+name,s);
}
await fs.writeFile(base+'/serve.mjs',`import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const base=import.meta.dirname,version=process.env.D05_VERSION??'r1',root=base+'/web-game-'+version,rows=JSON.parse(fs.readFileSync(base+'/web-game-'+version+'-build.json','utf8')).resources,assets=new Map(rows.map(r=>[r.url,r.source]));
const mime={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.ogg':'audio/ogg','.webp':'image/webp','.svg':'image/svg+xml'};
http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/')name='/index.html';const local=path.resolve(root,'.'+name);if(!local.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end();return;}const file=fs.existsSync(local)?local:assets.get(name.slice(1));try{if(!file)throw Error('missing');const stat=fs.statSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':stat.size});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}}).listen(4489,'127.0.0.1',()=>console.log('D05 preview http://127.0.0.1:4489/'));
`);
console.log({base});
