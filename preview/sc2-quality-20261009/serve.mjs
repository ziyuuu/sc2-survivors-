import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const file=path.resolve(process.argv[2]??'dist/SC2-Quality-Sample-20261009.html');
const port=Number(process.argv[3]??4211);
const size=fs.statSync(file).size;
http.createServer((request,response)=>{
 const url=new URL(request.url,'http://127.0.0.1');
 if(url.pathname==='/favicon.ico'){response.writeHead(204);response.end();return;}
 if(url.pathname!=='/'&&url.pathname!=='/sample.html'){response.writeHead(404);response.end('Not found');return;}
 response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':size,'Cache-Control':'no-store'});
 if(request.method==='HEAD')response.end();else fs.createReadStream(file).pipe(response);
}).listen(port,'127.0.0.1',()=>console.log(`Independent quality sample: http://127.0.0.1:${port}/sample.html (${size} bytes)`));
