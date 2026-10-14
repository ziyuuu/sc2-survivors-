import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const file=path.resolve('dist/mvp1-intermission-design-20261013/index.html'),port=Number(process.env.MVP1_DESIGN_PORT??4387);
http.createServer((req,res)=>{if(!['/','/index.html'].includes(new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}).listen(port,'127.0.0.1',()=>console.log('MVP 1 UI design: http://127.0.0.1:'+port+'/'));
