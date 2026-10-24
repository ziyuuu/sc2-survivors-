import fs from 'node:fs/promises';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import path from 'node:path';
const run=process.argv[2]??'1',variant=process.argv[3]??'candidate-r3',root='reports/local/performance-l02-20261020/recovery-'+run,hash=x=>createHash('sha256').update(x).digest('hex'),loaded=new Map();
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const entry=root+'/entry.ts',module=root+'/module.js';
await fs.writeFile(entry,`import {HttpAssetStore} from '../../../../src/assets/http-store';import {ResourceCache} from '../../../../src/assets/persistent-cache';import {BackgroundPreparation} from '../../../../src/app/background-preparation';import {AssetReadinessCoordinator} from '../../../../src/app/asset-readiness';globalThis.L02Recovery={HttpAssetStore,ResourceCache,BackgroundPreparation,AssetReadinessCoordinator};`);
const result=await build({entryPoints:[entry],bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:module,metafile:true,plugins:[{name:'frozen-candidate',setup(b){b.onLoad({filter:/\.(ts|mjs|json)$/},async a=>{const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');if(!file.startsWith('src/'))return;const bytes=await fs.readFile('reports/local/performance-l02-20261020/'+variant+'-inputs/'+file);loaded.set(file,bytes);return {contents:bytes,loader:file.endsWith('.mjs')?'js':file.endsWith('.json')?'json':'ts',resolveDir:path.dirname(a.path)};});}}]});
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(file)??await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});}
const bytes=Buffer.from('L02 timeout then exact verified bytes'),sha=hash(bytes);
const report={run,variant,inputs,moduleSha256:hash(await fs.readFile(module)),requests:[],checks:[],errors:[]};
let stalled=true,disconnected=0;
const server=http.createServer((req,res)=>{report.requests.push(req.url);res.setHeader('Access-Control-Allow-Origin','*');
 if(req.url?.includes('/assets/')){res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':bytes.length});if(stalled){res.write(bytes.subarray(0,1));req.on('close',()=>disconnected++);}else res.end(bytes);}
 else res.end('<!doctype html><title>L02 resource recovery</title><p>Controlled local resource recovery fixture</p>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;let ctx;
try{
 ctx=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base);await page.addScriptTag({path:module});
 const first=await page.evaluate(async ({base,sha,length})=>{
  const store=window.recoveryStore=new L02Recovery.HttpAssetStore({version:1,release:'l02-test',assets:{model:{url:`assets/${sha}.bin`,mime:'application/octet-stream',bytes:length,sha256:sha}}},base,fetch,250);
  let error='';try{await store.prepare(['model']);}catch(e){error=String(e);}return {error,urls:Object.keys(store.urls),metrics:store.metrics};
 },{base,sha,length:bytes.length});assert.match(first.error,/超时/);assert.deepEqual(first.urls,[]);assert.equal(first.metrics.files,0);report.checks.push({name:'real-fetch-body-stall-timeout',...first});
 stalled=false;const retry=await page.evaluate(async()=>{const s=recoveryStore;await s.prepare(['model']);return {bytes:[...new Uint8Array(await(await fetch(s.urls.model)).arrayBuffer())],metrics:s.metrics};});assert.deepEqual(retry.bytes,[...bytes]);assert.equal(retry.metrics.files,1);report.checks.push({name:'same-store-retry-after-abort',...retry});
 // Use a real held v1 database on this isolated origin to exercise blocked v2 open.
 const blocked=await page.evaluate(async()=>{
  await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('sc2-resource-downloads-v1');r.onsuccess=resolve;r.onerror=reject;r.onblocked=()=>{recoveryStore.cache.db?.then(db=>db?.close());};});
  const old=await new Promise((resolve,reject)=>{const r=indexedDB.open('sc2-resource-downloads-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
  const cache=new L02Recovery.ResourceCache(100,0),start=performance.now();await cache.task('blocked','r',[],'running',0);const result={warning:cache.warning,ms:performance.now()-start};old.close();
  await new Promise(r=>setTimeout(r,50));await cache.task('recovered','r',[],'complete',1);const db=await cache.db;
  result.version=db?.version;result.lateConnectionClosed=!!db;return result;
 });assert.match(blocked.warning,/缓存/);assert.equal(blocked.version,2);report.checks.push({name:'real-IDB-blocked-and-reopen',...blocked});
 const lane=await page.evaluate(async()=>{
  let finish;const lane=new L02Recovery.BackgroundPreparation(()=>0,()=>true);lane.select([{key:'slow',run:()=>new Promise(r=>finish=r)}]);lane.tick();await new Promise(r=>setTimeout(r,0));
  let error='';try{await lane.enter(undefined,30);}catch(e){error=String(e);}
  let second=false;const pending=lane.enter(undefined,1000).then(release=>{second=true;return release;});await new Promise(r=>setTimeout(r,20));const before={second,held:lane.report().held};finish();const release=await pending;release();return {error,before,after:lane.report()};
 });assert.match(lane.error,/超时/);assert.equal(lane.before.second,false);assert.equal(lane.after.held,0);report.checks.push({name:'real-browser-lane-timeout-remains-serial',...lane});
 report.disconnected=disconnected;assert.ok(disconnected>=1);assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await ctx?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,failure:report.failure}));}
