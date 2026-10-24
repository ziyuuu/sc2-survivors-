import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
const port=Number(process.argv[2]??4465),web=path.resolve('preview/performance-d02-low-20261021-candidate-r3'),assets=JSON.parse(fs.readFileSync('reports/local/performance-a03-20261021/asset-files-r2.json','utf8'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),sha=url.pathname.match(/^\/assets\/([a-f0-9]{64})\.[a-z0-9]+$/)?.[1];
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1),asset=sha&&assets[sha];
 const file=asset?.source??(['index.html','main.js','main.css','current.json','runtime-config.json'].includes(name)?path.join(web,name):null);
 if(!file){res.writeHead(404);res.end();return;}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':asset?.mime??types[path.extname(name)],'Content-Length':stat.size,'Cache-Control':asset?'public,max-age=31536000,immutable':'no-store'});fs.createReadStream(file).pipe(res);});
}).listen(port,'127.0.0.1',()=>console.log(`D02 low/medium/high preview http://127.0.0.1:${port}/`));

