import http from 'node:http';
import fs from 'node:fs/promises';
const file='preview/starship-ui-settings-20261016-r20/Starship-UI-Flow-R20-20261016.html',body=await fs.readFile(file);
const server=http.createServer((request,response)=>{
 if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end();return;}
 const pathname=new URL(request.url,'http://127.0.0.1').pathname;
 if(pathname!=='/'&&pathname!=='/Starship-UI-Flow-R20-20261016.html'){response.writeHead(404);response.end();return;}
 response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Length':body.length});response.end(request.method==='HEAD'?undefined:body);
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(4419,'127.0.0.1',()=>console.log('Starship R20 preview: http://127.0.0.1:4419/'));
