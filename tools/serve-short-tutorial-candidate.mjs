import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBackend} from './backend/service.mjs';
import {tutorialWorkRoot,tutorialDistRoot} from './tutorial-candidate-paths.mjs';
export async function serveTutorial({port=18913,diagnostic=false}={}){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),candidate=path.join(root,tutorialDistRoot,'candidate'),qa=path.join(root,tutorialWorkRoot,'browser'),backend=createBackend({config:{enabled:false},maintenance:false});
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.wasm':'application/wasm','.mp4':'video/mp4','.webm':'video/webm'};
 const server=createServer(async(req,res)=>{try{
  if(backend.handle(req,res))return;const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
  if(name.split('/').some(s=>s==='..'||s.startsWith('.')||s.includes('\\')))throw Error('Invalid path');
  const qaFile=name==='qa.html'?'index.html':name==='tutorial-qa.css'?name:name==='assets/launcher.js'||name.startsWith('assets/tutorial-qa.')?name:null;
  const file=name.startsWith('review/')?path.join(root,tutorialWorkRoot,'review',name.slice(7)):name.startsWith('audition/')?path.join(root,'dist/tutorial-1.1-20261105/audition',name.slice(9)):diagnostic&&qaFile?path.join(qa,qaFile):path.join(candidate,name),bytes=await fs.readFile(file);
  res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.setHeader('Cache-Control',/\.(bin|png|webp|wav|mp3|gz)$/.test(name)&&!name.startsWith('review/')?'public,max-age=31536000,immutable':'no-cache');
  if(/\.(mp4|webm)$/.test(name)){
   res.setHeader('Accept-Ranges','bytes');const range=req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
   if(range){const suffix=!range[1],start=suffix?Math.max(0,bytes.length-Number(range[2])):Number(range[1]),end=suffix?bytes.length-1:range[2]?Math.min(bytes.length-1,Number(range[2])):bytes.length-1;
    if(start> end||start>=bytes.length){res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`}).end();return;}
    res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${bytes.length}`);res.setHeader('Content-Length',end-start+1);res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1));return;
   }
  }
  res.setHeader('Content-Length',bytes.length);res.end(req.method==='HEAD'?undefined:bytes);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const s=await serveTutorial();console.log('1.1 local candidate: http://127.0.0.1:'+s.address().port+'/');}
