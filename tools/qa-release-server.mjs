/** Local QA entry for original files and the real compressed service-worker delivery. */
import {existsSync} from 'node:fs';
import path from 'node:path';
import {preview} from 'vite';
import {createBackend} from './backend/service.mjs';
import {createGameServer} from './coze-web-server.mjs';

export async function startQaReleaseServer(webRoot){
 const root=path.resolve(webRoot);
 if(existsSync(path.join(root,'sites-pack-index.js'))){
  const backend=createBackend({config:{enabled:false},maintenance:false});
  const server=await preview({configFile:false,publicDir:false,logLevel:'error',appType:'mpa',
   build:{outDir:root},preview:{host:'127.0.0.1',port:0,strictPort:true},
   plugins:[{name:'local-qa-game-api',configurePreviewServer(s){
    s.middlewares.use((req,res,next)=>{if(!backend.handle(req,res))next();});
   }}]});
  return {url:'http://127.0.0.1:'+server.httpServer.address().port,
   close:async()=>{await server.close();await backend.close();}};
 }
 const server=createGameServer({webRoot:root,backendOptions:{config:{enabled:false},maintenance:false}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:'http://127.0.0.1:'+server.address().port,
  close:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
