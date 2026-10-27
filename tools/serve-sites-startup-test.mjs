import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('reports/local/sites-startup-20261028/packed'),port=Number(process.argv[2]??4807);let permanent=process.argv.includes('--permanent');
const attempts={manifest:0,program:0,bundle:0},failures={manifest:0,program:0,bundle:0};
http.createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/__test-recover'&&req.method==='POST'){permanent=false;res.end('Recovered');return;}
 if(pathname==='/__test-status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({permanent,attempts,failures}));return;}
 const kind=pathname.includes('asset-manifest.')?'manifest':pathname.endsWith('.js.gz')?'program':pathname.includes('/bundle-')?'bundle':null;
 if(kind){attempts[kind]++;if((permanent&&kind==='manifest')||(!permanent&&attempts[kind]<=(kind==='manifest'?2:1))){failures[kind]++;console.log(JSON.stringify({fault:kind,attempt:attempts[kind],status:502}));res.writeHead(502,{'Cache-Control':'no-store'});res.end('Injected temporary resource failure');return;}}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes);}catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+port,permanent,root})));
