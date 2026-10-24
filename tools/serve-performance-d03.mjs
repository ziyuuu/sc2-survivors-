import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const port=Number(process.argv[2]??4467),web=path.resolve('preview/performance-d03-20261021-candidate-r1'),assets=JSON.parse(fs.readFileSync('reports/local/performance-a03-20261021/asset-files-r2.json','utf8')),build=JSON.parse(fs.readFileSync(web+'/build-inputs.json','utf8'));
for(const f of build.outputs)assert.equal(createHash('sha256').update(fs.readFileSync(f.file)).digest('hex'),f.sha256);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),sha=url.pathname.match(/^\/assets\/([a-f0-9]{64})\.[a-z0-9]+$/)?.[1],name=url.pathname==='/'?'index.html':url.pathname.slice(1),asset=sha&&assets[sha];
 const file=asset?.source??(['index.html','main.js','main.css','current.json','runtime-config.json'].includes(name)?path.join(web,name):null);
 if(!file){res.writeHead(404);res.end();return;}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':asset?.mime??types[path.extname(name)],'Content-Length':stat.size,'Cache-Control':asset?'public,max-age=31536000,immutable':'no-store'});fs.createReadStream(file).pipe(res);});
}).listen(port,'127.0.0.1',()=>console.log(`D03 stage loot preview http://127.0.0.1:${port}/`));
