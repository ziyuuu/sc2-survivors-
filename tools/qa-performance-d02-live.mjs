import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const run=process.argv[2]??'live-r1',variant=process.argv[3]??'candidate-r1',root=path.resolve('reports/local/performance-d02-medium-20261021',run),web=path.resolve(variant==='baseline'?'preview/performance-a03-20261021-r2':'preview/performance-d02-medium-20261021-'+variant);
const hash=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const build=JSON.parse(await fs.readFile(web+'/build-inputs.json')),assets=JSON.parse(await fs.readFile('reports/local/performance-a03-20261021/asset-files-r2.json'));
for(const f of build.outputs)assert.equal(hash(await fs.readFile(f.file)),f.sha256,f.file);
const report={run,variant,build,scope:'Four alternating fresh-run pairs. Native menu/start/production/combat/RAF, easy terran Char seed529, no health lock, one-hit, injected units or accelerated clock. Each fresh run begins from the same original empty test equipment account, replacing the unfinished previous test account only in the title menu. Deliberate pause at tick3300 (55 seconds); first 3 seconds excluded from steady summary, retained in raw frames. Same-page warm resources; one visible page, serial measurements. RAF callback CPU includes native input, driver, render, HUD and observer; interval is actual native frame start spacing. Not human play or complete campaign/60FPS acceptance.',runs:[],screens:[],progress:[],errors:[],failedRequests:[],served:[]};
let phase='boot',context,page,timer;
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),sha=url.pathname.match(/^\/assets\/([a-f0-9]{64})\.[a-z0-9]+$/)?.[1];
 if(sha){const f=assets[sha];if(!f){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':f.mime,'Content-Length':f.bytes,'Cache-Control':'public,max-age=31536000,immutable'});createReadStream(f.source).pipe(res);return;}
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!['index.html','main.js','main.css','current.json','runtime-config.json'].includes(name)){res.writeHead(404);res.end();return;}
 const b=await fs.readFile(path.join(web,name));res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html','Cache-Control':'no-store'});res.end(b);
}catch(e){report.errors.push({phase,server:String(e)});res.writeHead(500);res.end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const base=`http://127.0.0.1:${server.address().port}/`;report.base=base;
async function shot(name){const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();}
try{
 context=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});
 page=context.pages()[0]??await context.newPage();page.setDefaultTimeout(60000);report.browser=context.browser()?.version();const pending=[];
 page.on('response',r=>{if(new URL(r.url()).pathname==='/main.js')pending.push(r.body().then(b=>report.served.push({url:r.url(),bytes:b.length,sha256:hash(b)})));});
 page.on('pageerror',e=>report.errors.push({phase,message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({phase,message:m.text()});});page.on('requestfailed',r=>report.failedRequests.push({phase,url:r.url(),message:r.failure()?.errorText}));
 await context.addInitScript(()=>{
  for(const [k,v]of Object.entries({'sc2.renderQuality':'native','sc2.ordinaryEffects':'full','sc2.heroEffects':'full','sc2.animationMode':'complete','sc2.combatDetail':'full','sc2.newGameDifficulty':'easy'}))localStorage.setItem(k,v);
  const native=requestAnimationFrame;window.D02Frame={current:null,record:null};window.requestAnimationFrame=function(callback){return native.call(window,time=>{const frame={at:performance.now(),render:false};D02Frame.current=frame;try{return callback(time);}finally{frame.cpu=performance.now()-frame.at;if(frame.render)D02Frame.record?.(frame);D02Frame.current=null;}});};
 });
 timer=setInterval(async()=>{try{const p=await page.evaluate(()=>({ready:window.A03?.app?.readiness.state,time:window.A03?.app?.world.time,phase:window.A03?.app?.world.phase,enemies:window.A03?.app?.world.enemyCount()}));report.progress.push({phase,at:new Date().toISOString(),...p});console.log(JSON.stringify({work:phase,...p}));await save();}catch{}},20000);
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
 await page.evaluate(()=>{
  const a=A03.app,w=a.world,v=a.view,nativeStep=w.step,nativeRender=v.render,emptyAccount=structuredClone(w.starship.account);let active=false,previous=0,frames=[],snapshots=[],initial=null,peaks={enemies:0,entities:0};
  __SC2_DEBUG__.healthLock(false);__SC2_DEBUG__.oneHit(false);__SC2_DEBUG__.speed=1;
  const health=__SC2_DEBUG__.healthLock,one=__SC2_DEBUG__.oneHit;__SC2_DEBUG__.healthLock=x=>{if(x)throw Error('No health lock');return health(false);};__SC2_DEBUG__.oneHit=x=>{if(x)throw Error('No one-hit');return one(false);};
  const counts=()=>({time:w.time,tick:w.tick,phase:w.phase,paused:w.paused,enemies:w.enemyCount(),entities:w.entities.size,allies:w.allies().map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp,shots:u.shotSequence})),kills:w.stats.kills,backlog:a.driver.accumulator,discarded:a.driver.discardedBacklogSeconds,assetsPending:v.assetsPending});
  const state=()=>JSON.stringify({run:A03.selectRunData(w),statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot()},(key,value)=>key==='runId'||key==='noticeUntil'||key==='notice'?undefined:value instanceof Map?{map:[...value]}:value instanceof Set?{set:[...value]}:value);
  w.step=function(...args){const out=nativeStep.apply(this,args);if(active){peaks.enemies=Math.max(peaks.enemies,w.enemyCount());peaks.entities=Math.max(peaks.entities,w.entities.size);if(w.tick%600===0||w.tick===3300)snapshots.push({tick:w.tick,state:state()});if(w.tick>=3300||w.phase!=='battle'){w.paused=true;a.hud.update();}}return out;};
  v.render=function(...args){const at=performance.now(),out=nativeRender.apply(this,args);if(D02Frame.current){D02Frame.current.render=true;D02Frame.current.renderCpu=performance.now()-at;}return out;};
  D02Frame.record=frame=>{if(!active)return;frames.push({...frame,interval:previous?frame.at-previous:null,time:w.time,tick:w.tick,enemies:w.enemyCount(),backlog:a.driver.accumulator,assetsPending:v.assetsPending,paused:w.paused});previous=frame.at;};
  window.D02Live={counts,state,
   freshAccount(){if(w.phase!=='menu')throw Error('Fresh test account only in title menu');w.starship.account=structuredClone(emptyAccount);a.hud.update();return JSON.stringify(w.starship.account);},
   configure(preset){v.setCombatPreset(preset);return {preset:v.combatPreset,resolution:v.report().resolution,animation:v.animationMode};},
   begin(){frames=[];snapshots=[];previous=0;peaks={enemies:0,entities:0};initial=state();active=true;w.paused=false;a.hud.update();},
   finish(){active=false;return {frames,snapshots,initial,final:state(),counts:counts(),peaks,preset:v.combatPreset,resolution:v.report().resolution,animation:v.animationMode,world:a.world.runConfig};}
  };
 });
 for(let pair=Number(process.argv[4]??0);pair<Number(process.argv[5]??4);pair++)for(const preset of pair%2?['medium','full']:['full','medium']){
  phase=`pair${pair}-${preset}-loading`;
  const account=await page.evaluate(()=>D02Live.freshAccount());if(report.emptyAccountSha256)assert.equal(hash(account),report.emptyAccountSha256);else report.emptyAccountSha256=hash(account);
  for(const selector of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty][data-difficulty=easy]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector+':visible').click();
  await page.waitForFunction(()=>['ready','error'].includes(A03.app.readiness.state.phase),null,{timeout:420000});assert.equal(await page.evaluate(()=>A03.app.readiness.state.phase),'ready');
  await page.evaluate(()=>{const a=A03.app,commit=a.hud.onCommitFlow;a.hud.onCommitFlow=()=>{commit();a.world.paused=true;a.hud.update();a.hud.onCommitFlow=commit;};});
  await page.locator('[data-action=flow-continue]:visible').click();await page.waitForFunction(()=>A03.app.world.phase==='battle'&&A03.app.world.paused);
  const settings=await page.evaluate(preset=>D02Live.configure(preset),preset);assert.equal(settings.preset,preset);assert.equal(settings.animation,'complete');assert.equal(settings.resolution.renderPixelRatio,1);
  // Let the real paused renderer warm both the preset and its material programs.
  await page.evaluate(async()=>{for(let i=0;i<40;i++)await new Promise(r=>requestAnimationFrame(r));});
  phase=`pair${pair}-${preset}-live`;const start=Date.now();await page.evaluate(()=>D02Live.begin());await page.waitForFunction(()=>A03.app.world.paused,null,{timeout:300000});const result=await page.evaluate(()=>D02Live.finish());
  const row={pair,preset,wallMs:Date.now()-start,...result};report.runs.push(row);await save();assert.equal(row.counts.tick,3300);assert.equal(row.counts.phase,'battle');assert.equal(row.counts.assetsPending,0);assert.ok(row.counts.discarded<=1/60+1e-9,'At most one fixed-step tail discarded by intentional final pause');assert.equal(row.world.seed,529);assert.equal(row.world.difficulty,'easy');
  await shot(`pair${pair}-${preset}-end`);console.log(JSON.stringify({pair,preset,wallMs:row.wallMs,frames:row.frames.length,counts:row.counts}));
  // Use the same native archives/restart action as the ordinary pause menu.
  await page.locator('[data-action=pause-saves]:visible').click();await page.locator('[data-action=restart]:visible').click();await page.waitForFunction(()=>A03.app.world.phase==='menu');
 }
 await Promise.all(pending);assert.equal(report.served.length,1);assert.equal(report.served[0].sha256,build.outputs.find(x=>x.file.endsWith('/main.js')).sha256);assert.equal(report.errors.length,0,JSON.stringify(report.errors));report.pass=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;if(page){report.failureText=await page.locator('body').innerText().catch(()=>null);await shot('failure').catch(()=>{});}}
finally{clearInterval(timer);await context?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await save();console.log(JSON.stringify({run,pass:report.pass,runs:report.runs.length,screens:report.screens.length,errors:report.errors.length,failure:report.failure}));}
