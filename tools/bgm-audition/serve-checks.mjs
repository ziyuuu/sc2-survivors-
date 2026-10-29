import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('reports/local/bgm-integration-20261029/site'),fallback=path.resolve('sites/size-optimized-site/public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try{
 const parts=decodeURIComponent(new URL(req.url,'http://localhost').pathname).split('/').filter(Boolean);
 if(parts.some(p=>p==='..'||p.startsWith('.')||p.includes('\\')))throw Error('Invalid path');
 const production=parts[0]==='production';if(production)parts.shift();
 if(!parts.length)parts.push('index.html');let file=path.join(production?path.resolve('dist/bgm-integration-20261029/web'):root,...parts);
 try{await fs.access(file);}catch{if(production)throw Error('Missing production file');file=path.join(fallback,...parts);}
 const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end('not found');}}).listen(18892,'127.0.0.1',()=>console.log('BGM check http://127.0.0.1:18892'));
