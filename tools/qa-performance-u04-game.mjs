import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'game-1',revision=process.argv[3]??'r1',folder='performance-u04-20261020-candidate-'+revision,root=path.resolve('reports/local/performance-u04-20261020',run);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex'),report={run,build:JSON.parse(await fs.readFile('preview/'+folder+'/web-build-inputs.json')),checks:[],screens:[],errors:[],requests:[],api:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
let context,page;
const shot=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();};
try{
 context=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});page=context.pages()[0];page.setDefaultTimeout(90000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))report.api.push(r.url());});
 const served=[];page.on('response',r=>{if(/\/main\.(js|css)(?:\?|$)/.test(r.url()))served.push(r.body().then(b=>({url:r.url(),sha256:hash(b)})));});
 await page.goto('http://127.0.0.1:4436/'+folder+'/',{timeout:120000});await page.waitForFunction(()=>window.__R03__&&window.U04,null,{timeout:180000});
 report.served=await Promise.all(served);assert.ok(report.served.some(r=>r.sha256===report.build.outputs.find(o=>o.file.endsWith('/main.js')).sha256));
 // The current title has no services footer. Inspect its existing dialog via
 // the shared controller; this does not add a new public navigation entry.
 await page.evaluate(()=>__R03__.hud.playerServices.open('privacy'));await shot('default-privacy-offline');
 const defaults=await page.evaluate(()=>{const p=__R03__.hud.playerServices;return {offline:p.client.offline,active:p.client.active,identity:p.client.identity,queue:p.client.queue.length,disabled:p.dialog.querySelector('[data-service-action=allow]').disabled,keys:Object.values(U04.TELEMETRY_KEYS).filter(k=>localStorage.getItem(k)!==null)};});
 assert.deepEqual(defaults,{offline:true,active:false,identity:null,queue:0,disabled:true,keys:[]});report.checks.push({name:'ordinary-default-offline',...defaults});
 await page.locator('#player-services-dialog [data-service-action=close]').first().click();
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 const start=Date.now();for(;;){const s=await page.evaluate(()=>__B02__.readiness.state);console.log('Loading '+s.phase+' '+s.done+'/'+s.total);if(s.phase==='ready')break;if(s.phase==='error')throw Error(s.error);if(Date.now()-start>600000)throw Error('Loading timeout');await page.waitForTimeout(5000);}
 await page.locator('[data-action=flow-continue]').click();await page.evaluate(()=>{__B02__.freeze();__R03__.stop();__R03__.draw();});await shot('default-battle');
 const off=await page.evaluate(()=>{const {world:w,hud}=__R03__,{client:c,observer:o}=hud.playerServices;const before=__B02__.snapshot();for(let i=0;i<120;i++)o.frame(16.7,0,true);return {unchanged:before===__B02__.snapshot(),queue:c.queue.length,identity:c.identity,frames:o.summary().performance.frames};});
 assert.deepEqual(off,{unchanged:true,queue:0,identity:null,frames:0});report.checks.push({name:'default-no-collection',...off});
 await page.evaluate(async()=>{
  const {world:w,hud:h}=__R03__,ps=h.playerServices,requests=[],memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
  const c=new U04.candidate.TelemetryClient({protocol:'http:',storage,request:async(url,options)=>{const body=options?.body?JSON.parse(options.body):null;requests.push({url,body});return new Response(JSON.stringify(url==='/api/config'?{enabled:true,version:U04.CONSENT_VERSION,operator:'本机验证服务',contact:'本机桩，无外部上传',backupDays:null,retention:{}}:url.endsWith('/batch')?{accepted:body.events.map(e=>e.id)}:{}));}});
  const o=new U04.candidate.GameObserver(w,c,()=>({build:'local',release:'local',device:'desktop',orientation:'landscape',animation:'complete',diagnostic:true}));
  ps.client=c;ps.observer=o;c.onChange=()=>{o.syncConsent();ps.refresh();};await c.initialize();
  window.U04Game={w,h,ps,c,o,requests,memory,storage};ps.open('privacy');
 });
 await shot('optional-before-consent');await page.locator('[data-service-action=allow]').click();await page.waitForFunction(()=>U04Game.c.active);
 await shot('optional-consented');await page.locator('#player-services-dialog [data-service-action=close]').first().click();
 const live=await page.evaluate(async()=>{const {w,h,c,o}=U04Game;w.paused=false;w.changed();for(let i=0;i<36;i++){h.advanceSimulation(()=>w.step());o.frame(i%5?16.7:25,.01,true);}const u=w.allies()[0],enemy=w.addUnit('roach','zerg',u.x+3,u.z,1);w.hit(enemy,15,[],1,'terran',0,1,u.id);U04.observeRecovery(w,u,u,4,2);w.changed();o.frame(16.7,.02,true);const before=__B02__.snapshot();for(let i=0;i<60;i++)o.frame(16.7,.02,false);const same=before===__B02__.snapshot();o.persist();await c.persist();for(const e of c.queue)U04.validateEvent(e);return {same,summary:o.summary(),observation:JSON.parse(U04Game.memory.get(U04.TELEMETRY_KEYS.observation)),events:c.queue.map(e=>e.kind)};});
 assert.ok(live.same);assert.equal(live.summary.performance.frames,37);assert.ok(live.summary.damage>=15);assert.equal(live.summary.healed,4);assert.equal(live.summary.shieldRestored,2);report.checks.push({name:'optional-live-combat-and-paused-observation',...live});
 await page.evaluate(()=>{__R03__.draw();});await shot('optional-battle');
 const finish=await page.evaluate(async()=>{const {w,c,o,requests}=U04Game;w.endStage();o.frame(16.7,0,false);await new Promise(r=>setTimeout(r,50));const events=c.queue.map(e=>({id:e.id,kind:e.kind,status:e.data.status}));for(const e of c.queue)U04.validateEvent(e);await c.flush();return {events,remaining:c.queue.length,batches:requests.filter(r=>r.url.endsWith('/batch')).length};});
 assert.ok(finish.events.some(e=>e.kind==='stage_summary'&&e.status==='cleared'));assert.ok(finish.batches>0);report.checks.push({name:'stage-summary-and-local-flush',...finish});await shot('intermission');
 await page.evaluate(()=>U04Game.ps.open('privacy'));await page.locator('[data-service-action=withdraw]').click();await page.waitForFunction(()=>!U04Game.c.active);await shot('withdrawn');
 const revoked=await page.evaluate(()=>{const {c,o,w,memory}=U04Game;const count=U04Game.requests.length;for(let i=0;i<40;i++){w.changed();o.frame(10,0,true);}return {active:c.active,queue:c.queue.length,observation:memory.get(U04.TELEMETRY_KEYS.observation)??null,requestsAdded:U04Game.requests.length-count};});
 assert.deepEqual(revoked,{active:false,queue:0,observation:null,requestsAdded:0});report.checks.push({name:'withdraw-stops-immediately',...revoked});
 await page.locator('[data-service-action=allow]').click();await page.waitForFunction(()=>U04Game.c.active);
 const cross=await page.evaluate(()=>{const {c,storage,memory,o}=U04Game;storage.setItem(U04.TELEMETRY_KEYS.identity,JSON.stringify({...c.identity,status:'withdrawn',uploadToken:undefined}));c.synchronize();o.frame(10,0,true);return {active:c.active,session:c.sessionId,queue:c.queue.length};});
 assert.deepEqual(cross,{active:false,session:null,queue:0});report.checks.push({name:'cross-tab-revoke-synchronize',...cross});
 await page.locator('[data-service-action=delete]').click();await page.waitForFunction(()=>U04Game.c.identity===null);await shot('deleted');
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){await page.setViewportSize(viewport);await page.waitForTimeout(100);await page.evaluate(()=>__R03__.draw());await shot('privacy-'+viewport.width);}
 report.mockRequests=await page.evaluate(()=>U04Game.requests.map(r=>({url:r.url,events:r.body?.events?.length??0})));
 assert.equal(report.api.length,0);assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(e);if(page)await shot('failure').catch(()=>{});}finally{await save();await context?.close();}
console.log(JSON.stringify({run,pass:report.pass,checks:report.checks.length,screens:report.screens.length,errors:report.errors,api:report.api,failure:report.failure?.slice(0,600)}));
