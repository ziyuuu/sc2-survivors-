import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const workspace=fileURLToPath(new URL('../../',import.meta.url));
const port=Number(process.argv[2]||4180);
const allowed=['/preview/ui-20261003/','/public/assets/','/reports/local/ui-redesign-20261003/'];
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!['GET','HEAD'].includes(req.method)||!allowed.some(prefix=>pathname.startsWith(prefix)))throw new Error('Not found');
  const file=path.resolve(workspace,'.'+pathname),relative=path.relative(workspace,file);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Not found');
  const bytes=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Static preview: http://127.0.0.1:${port}/preview/ui-20261003/index.html`));
