/** Text-only post-cleanup audit. Does not rebuild assets or invoke mutation debug APIs. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import {chromium} from '@playwright/test';

const root=process.cwd(),dist=path.join(root,'dist'),port=5178;
const output=path.join(root,'reports/local/cleanup-verification.json');
const report={at:new Date().toISOString(),method:'Read manifests and source hashes; local Chrome production web menu/start through UI only. No screenshots, no uploads, no rebuild, no mutation debug API.',checks:[],races:[],errors:[]};
let browser,server;
async function hash(file){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
function contained(base,file){const relative=path.relative(base,file);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
async function cleanup(){if(browser){const current=browser;browser=undefined;await current.close();}if(server){const current=server;server=undefined;current.closeAllConnections();await new Promise(resolve=>current.close(resolve));}}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void cleanup().finally(()=>process.exit(1));});
try{
 const records=JSON.parse(await fs.readFile(path.join(root,'reports/local/runtime-assets.json'),'utf8'));
 assert.equal(records.length,745,'Unexpected runtime manifest count');
 const byId=new Map(records.map(row=>[row.id,row]));assert.equal(byId.size,745,'Duplicate runtime asset ID');
 let bytes=0,uriCount=0;
 for(const record of records){
  assert.equal(record.status,'available',record.id+' unavailable');
  const file=path.resolve(root,record.packedFile);assert.ok(contained(path.join(root,'public/assets'),file),record.id+' outside runtime root');
  const stat=await fs.stat(file);assert.equal(stat.size,record.bytes,record.id+' size changed');bytes+=stat.size;
  const copy=path.resolve(dist,record.url);assert.ok(contained(path.join(dist,'assets'),copy));assert.equal(await hash(file),await hash(copy),record.id+' dist copy differs');
  let json;
  if(file.endsWith('.glb')){const b=await fs.readFile(file);assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);json=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));}
  else if(file.endsWith('.gltf'))json=JSON.parse(await fs.readFile(file,'utf8'));
  if(json)for(const resource of [...(json.buffers??[]),...(json.images??[])]){
   const uri=resource.uri;if(!uri||uri.startsWith('data:'))continue;
   assert.ok(uri.startsWith('sc2asset:'),`${record.id}: unexpected external URI ${uri}`);
   assert.ok(byId.has(uri.slice('sc2asset:'.length)),`${record.id}: missing ${uri}`);uriCount++;
  }
 }
 report.assets={count:records.length,bytes,sc2assetReferences:uriCount,matchingDistCopies:records.length};report.checks.push('745 runtime assets and dist copies intact; all GLB/GLTF references resolve without deleted sidecars');
 const restore=JSON.parse(await fs.readFile(path.join(root,'reports/local/cleanup-source-restore-audit.json'),'utf8'));
 assert.equal(restore.restore.length,488);let restoredBytes=0;
 for(const item of restore.restore){
  const file=path.resolve(item.destination);assert.ok(contained(path.join(root,'assets/private'),file));
  assert.equal((await fs.stat(file)).size,item.bytes,file+' restored size');assert.equal(await hash(file),item.sha256,file+' restored SHA256');restoredBytes+=item.bytes;
 }
 report.sources={count:488,bytes:restoredBytes,sha256Verified:488};report.checks.push('All 488 relocated originals restored to project paths with original SHA256');

 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.gltf':'model/gltf+json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
 server=http.createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
   const file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
   if(!contained(dist,file)){res.writeHead(403);res.end();return;}
   const stat=await fs.stat(file);if(!stat.isFile()){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','Connection':'close'});
   if(req.method==='HEAD'){res.end();return;}
   res.end(await fs.readFile(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 report.server={url:`http://127.0.0.1:${port}/`,temporary:true,pid:process.pid};
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const race of ['terran','zerg','protoss']){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],failedRequests=[],responses=[];
  const onPageError=error=>errors.push(error.message);
  const onConsole=message=>{if(message.type()==='error')errors.push(message.text());};
  const onFailed=request=>failedRequests.push({url:request.url(),resourceType:request.resourceType(),error:request.failure()?.errorText});
  const onResponse=response=>{if(response.status()>=400)responses.push({url:response.url(),status:response.status()});};
  page.on('pageerror',onPageError);page.on('console',onConsole);page.on('requestfailed',onFailed);page.on('response',onResponse);
  try{
   await page.goto(report.server.url,{waitUntil:'domcontentloaded',timeout:240000});
   const ready=()=>page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady&&!window.__SC2_REPORT__().assetsPending,null,{timeout:240000});
   await ready();assert.equal(await page.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
   await page.getByLabel('开局种族').selectOption(race);await ready();
   const menu=await page.evaluate(()=>{const r=window.__SC2_REPORT__();return {phase:r.phase,race:r.expedition?.race,assetsPending:r.assetsPending};});
   assert.equal(menu.phase,'menu');assert.equal(menu.race,race);
   await page.locator('[data-action=start]').click();
   await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');await ready();
   await page.waitForTimeout(350);await page.locator('#topbar [data-action=pause]').click();
   const battle=await page.evaluate(()=>{const r=window.__SC2_REPORT__();return {phase:r.phase,stage:r.stage,time:r.time,race:r.expedition?.race,families:r.expedition?.families,assetsReady:r.assetsReady,assetsPending:r.assetsPending};});
   assert.equal(battle.phase,'battle');assert.equal(battle.stage,1);assert.equal(battle.race,race);assert.ok(battle.time>0);assert.equal(battle.assetsReady,true);assert.equal(battle.assetsPending,0);
   const failedRequestTimings=await page.evaluate(urls=>performance.getEntriesByType('resource').filter(e=>urls.includes(e.name)).map(e=>({name:e.name,initiatorType:e.initiatorType,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,duration:e.duration})),failedRequests.map(r=>r.url));
   report.races.push({race,menu,battle,errors,failedRequests,failedRequestTimings,httpErrors:responses});
   if(errors.length||failedRequests.length||responses.length)report.errors.push({race,errors,failedRequests,httpErrors:responses});
  }finally{
   page.off('pageerror',onPageError);page.off('console',onConsole);page.off('requestfailed',onFailed);page.off('response',onResponse);await context.close();
  }
 }
 assert.deepEqual(report.errors,[]);
 report.checks.push('Production dist web: all three race menus and deployments load with zero errors/failed requests; no mutation debug API');
 report.passed=true;
}catch(error){report.failure=String(error.stack??error);report.passed=false;process.exitCode=1;}
finally{
 await cleanup();report.temporaryProcessesClosed=true;report.finishedAt=new Date().toISOString();await fs.writeFile(output,JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,assets:report.assets,sources:report.sources,races:report.races.map(r=>r.race),temporaryProcessesClosed:report.temporaryProcessesClosed,failure:report.failure,output},null,2));
}
