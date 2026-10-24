import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import http from 'node:http';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export async function browserRun(run,scope,options={}){
 const baseRoot=path.resolve('reports/local/v01-20261024'),root=baseRoot+'/'+run,web=baseRoot+'/web-game-'+(options.variant??'r3'),build=JSON.parse(await fs.readFile(web+'-build.json'));
 await fs.mkdir(root,{recursive:false});const assets=new Map(build.resources.map(r=>['/'+r.url,r]));
 for(const r of build.artifacts)if(r.file!=='index.html')assert.equal(hash(await fs.readFile(web+'/'+r.file)),r.sha256,r.file);assert.equal(hash(await fs.readFile(web+'/index.html')),build.htmlSha256);
 const report={run,scope,build,checks:[],screens:[],errors:[],failedRequests:[],served:[],requests:[],progress:[],machine:{cpu:os.cpus()[0]?.model,totalBytes:os.totalmem(),freeBytes:os.freemem()}},pending=[];let phase='boot',timer;
 const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
 const server=http.createServer(async(req,res)=>{try{
  const name=new URL(req.url,'http://localhost').pathname;if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(name==='/api/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({enabled:false,version:'2026-10-06.1',operator:'',contact:'',backupDays:null,retention:{events:90,runs:180,visitors:365,daily:730,feedback:180,audit:90}}));return;}
  const asset=assets.get(name);if(asset){report.requests.push({phase,hash:asset.sha256,bytes:asset.bytes});res.writeHead(200,{'Content-Type':name.endsWith('.glb')?'model/gltf-binary':name.endsWith('.png')?'image/png':'application/octet-stream','Content-Length':asset.bytes,'Cache-Control':'no-store'});createReadStream(asset.source).pipe(res);return;}
  const file=name==='/'?'index.html':name.slice(1);if(!['index.html',build.manifest,'runtime-config.json',...build.artifacts.map(r=>r.file)].includes(file)){res.writeHead(404);res.end();return;}
  const bytes=await fs.readFile(web+'/'+file);res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/json','Cache-Control':'no-store'});res.end(bytes);
 }catch(e){report.errors.push({phase,server:String(e)});res.writeHead(500);res.end();}});
 await new Promise((r,j)=>{server.once('error',j);server.listen(options.port??4495,'127.0.0.1',r);});const base='http://127.0.0.1:'+server.address().port+'/';report.base=base;
 const profile=options.profile??baseRoot+'/lifecycle-profile';report.profile=profile;
 let context,nativeBrowser,child;
 if(options.native){
  await fs.mkdir(profile,{recursive:true});child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
  let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(port,'Native Chrome debugging endpoint');nativeBrowser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});context=nativeBrowser.contexts()[0];report.nativeChrome=true;
 }else context=await chromium.launchPersistentContext(profile,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=context.pages()[0]??await context.newPage();page.setDefaultTimeout(60000);
 const cdp=await context.newCDPSession(page),bc=await context.browser().newBrowserCDPSession();report.browser=await bc.send('Browser.getVersion');report.system=await bc.send('SystemInfo.getInfo');
 page.on('pageerror',e=>report.errors.push({phase,message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({phase,message:m.text()});});page.on('requestfailed',r=>report.failedRequests.push({phase,url:r.url(),message:r.failure()?.errorText}));page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('.js'))pending.push(r.body().then(b=>report.served.push({url:r.url(),sha256:hash(b)})).catch(()=>{}));});
 await context.addInitScript(()=>{for(const [k,v]of Object.entries({'sc2.renderQuality':'native','sc2.ordinaryEffects':'full','sc2.heroEffects':'full','sc2.animationMode':'complete','sc2.combatDetail':'full','sc2.newGameDifficulty':'easy'}))localStorage.setItem(k,v);});
 timer=setInterval(async()=>{try{const p=await page.evaluate(()=>{const a=globalThis.A03?.app,s=a?null:globalThis.__SC2_REPORT__?.();return {ready:a?.readiness.state??s?.readiness,phase:a?.world.phase??s?.phase,time:a?.world.time??s?.time,stage:a?.world.stage??s?.stage,complete:a?.view.completePreloadStatus(),save:s?.save};});report.progress.push({step:phase,at:Date.now(),freeBytes:os.freemem(),...p});console.log(JSON.stringify({step:phase,...p}));await save();}catch{}},20000);
 return {root,report,page,context,cdp,bc,base,save,setPhase:value=>{phase=value;},async shot(name){const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();},async close(){clearInterval(timer);await Promise.all(pending);if(nativeBrowser){await bc.send('Browser.close').catch(()=>{});await nativeBrowser.close();if(child.exitCode===null)child.kill();}else await context.close();report.profileClosed=true;server.closeAllConnections();await new Promise(r=>server.close(r));await save();console.log(JSON.stringify({run,pass:report.pass,checks:report.checks.length,errors:report.errors.length,failure:report.failure}));}};
}
