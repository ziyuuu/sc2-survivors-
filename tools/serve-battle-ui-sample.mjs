import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const file=fileURLToPath(new URL('../dist/Battle-UI-Feedback-Sample-20261008.html',import.meta.url));
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(!['GET','HEAD'].includes(req.method)||!['/','/sample.html'].includes(url.pathname)){res.writeHead(404);res.end();return;}
 const bytes=fs.statSync(file).size;
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':bytes,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
});
server.on('error',e=>{if(e.code==='EADDRINUSE')server.listen(0,'127.0.0.1');else throw e;});
server.on('listening',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port+'/',file:path.resolve(file)})));
server.listen(Number(process.env.SC2_SAMPLE_PORT??4195),'127.0.0.1');
