import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
import {World} from '../src/simulation/world';
import {campaignTerrain,type CampaignTheme} from '../src/data/campaign-map';
import {createCampaignLandscape} from '../src/data/campaign-landscape';
import {makeEnvironmentFullPlan} from '../src/render/terrain/environment-full-plan';
import {writeArchive} from '../src/persistence/archive';

const out=process.argv[2],option=(key:string)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3),mode=option('mode')??'natural';
const web=option('web')??'reports/local/mvp5-lifecycle-20261014/diagnostic-r1',seconds=Number(option('seconds')??100),selected=option('theme');
assert.ok(out?.startsWith('reports/local/mvp5-lifecycle-20261014/')&&!out.includes('..'));assert.ok(['natural','tour','cache'].includes(mode));await fs.mkdir(out,{recursive:false});await fs.copyFile(new URL(import.meta.url),out+'/runner.mts');await fs.copyFile(web+'/build-inputs.json',out+'/build.json');
const build=JSON.parse(await fs.readFile(web+'/web-release.json','utf8'));assert.equal(build.diagnostic,true);
const themes=(selected?selected.split(','):['industrial','ice','mar-sara','char','frontier']) as CampaignTheme[],races:Record<CampaignTheme,'terran'|'zerg'|'protoss'>={industrial:'terran',ice:'protoss','mar-sara':'zerg',char:'terran',frontier:'zerg'},fixtures:Record<string,string>={},routes:Record<string,any[]>={};
assert.ok(themes.every(theme=>theme in races));assert.equal(new Set(themes).size,themes.length);
for(const theme of themes){
 const terrain=campaignTerrain({version:3,seed:529,theme}),w=new World({race:races[theme],seed:529,waves:false,terrain,difficulty:'easy'});assert.ok(w.start());
 if(mode==='tour'){
  // Explicit late-map inspection fixture; continuous movement thereafter uses real input and physics.
  w.stage=18;w.prepareStage();for(const g of w.expedition.building!.groups)w.setBuildingGroupEnabled(g.id,false);w.expedition.ledger=[];w.pods=[];(w as any).eventPlan=[];(w as any).nextEvent=0;w.nextFreePodAt=w.nextEliteGrowthAt=w.nextMercenaryAt=w.nextTankSupportAt=Infinity;
  // The fixed terrain tour is not a boss fight; the separate new-run mode keeps all combat native.
  if(w.hive)w.hive.hp=0;w.nextExpansionAt=Infinity;
  const plan=makeEnvironmentFullPlan(terrain),{blockers}=createCampaignLandscape(theme,529);
  const legal=(p:{x:number;z:number})=>{if(terrain.canOccupy(p,.95))return p;for(let ring=.5;ring<=5;ring+=.5)for(let i=0;i<24;i++){const q={x:p.x+Math.cos(i*Math.PI/12)*ring,z:p.z+Math.sin(i*Math.PI/12)*ring};if(terrain.canOccupy(q,.95))return q}throw Error('No legal inspection point');};
  const root=(i:number)=>{const b=blockers[i],a=Math.atan2(-b.z,-b.x);return legal({x:b.x+Math.cos(a)*(b.r+2),z:b.z+Math.sin(a)*(b.r+2)});};
  routes[theme]=[{id:'spawn',kind:'spawn',x:0,z:0},{id:'main-road',kind:'road',x:10,z:0},{id:'early-root',kind:'root',...root(0)},{id:'transition',kind:'surface',...legal(plan.sites[2])},{id:'middle-root',kind:'root',...root(4)},{id:'late-root',kind:'root',...root(10)},...plan.boundaries.map((b,i)=>{const a=Math.atan2(b.z,b.x);return {id:'boundary-'+i,kind:'boundary',...legal({x:Math.cos(a)*(plan.protection.finalRadius-2.5),z:Math.sin(a)*(plan.protection.finalRadius-2.5)})}})];
 }
 w.paused=true;fixtures[theme]=path.resolve(out,theme+'-fixture.json');await fs.writeFile(fixtures[theme],writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));
}
const server=createGameServer({webRoot:path.resolve(web),assetRoot:path.resolve('deploy/runtime'),backendOptions:{config:{enabled:false}}});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report:any={at:new Date().toISOString(),build,mode,seconds,method:mode==='natural'?'Real new-run menus, fresh empty profile, easy difficulty, map-ticket theme/seed input only. Native default-speed RAF/World loop, visible minimap pointer orders, real combat/economy/production/guards/delivery. Read-only native observation; no forced health, wallet, stage, clock, enemy, carrier or passenger state.':mode==='tour'?'Current-source paused archive fixtures and native minimap input. Tour starts at stage 18 with waves, economic events and production isolated, and the hive already at zero HP, to inspect terrain. No teleportation or World writes after entry. Not natural campaign/boss evidence.':'Current-source paused archive fixtures; same-page five-map import/preparation repeats. Not natural campaign evidence.',routes,screens:[],checks:[],runs:[],errors:[],httpErrors:[],actions:[],transitions:[]};let page:any,context:any;
const runtime=()=>page.evaluate(()=>(window as any).__SC2_REPORT__());
const heartbeat=setInterval(()=>{if(!page)return;void page.evaluate(()=>{const r=(window as any).__SC2_REPORT__?.();return r?{phase:r.phase,time:r.time,readiness:r.readiness,assetsPending:r.assetsPending,errors:r.errors}:null}).then((state:any)=>fs.writeFile(out+'/live.json',JSON.stringify({at:new Date().toISOString(),state},null,2))).catch(()=>{});},30000);
const state=()=>page.evaluate(()=>{
 const n=(window as any).__MVP5_NATIVE__,w=n.world;
 const economicTargets=[...w.economicTargets.values()].map((e:any)=>({id:e.id,kind:e.kind,x:e.x,z:e.z,hp:e.hp,status:e.status}));
 return {
  phase:w.phase,paused:w.paused,decision:w.requiresPlayerDecision,stage:w.stage,time:w.time,tick:w.tick,seed:w.seed,rng:w.rngState,anchor:{...w.anchor},wallet:{...w.wallet},economy:structuredClone(w.economyTotals),stats:{...w.stats},order:structuredClone(w.order),
  ledger:structuredClone(w.expedition.ledger),groups:structuredClone(w.expedition.building?.groups),
  pods:w.pods.map((p:any)=>({id:p.id,x:p.x,z:p.z,status:p.status,hp:p.hp,jobId:p.jobId,guardAlive:[...p.guardianIds].filter((id:any)=>(w.entities.get(id)?.hp??0)>0).length,passengers:p.passengers.map((a:any)=>({status:a.status,paid:a.paid,entityId:a.entityId}))})),
  targets:economicTargets.filter((e:any)=>e.status==='active'),economicTargets,
  allies:w.allies().map((u:any)=>({id:u.id,type:u.unitType,x:u.x,z:u.z,hp:u.hp,flying:u.flying,groundLegal:u.flying||w.terrain.canOccupy(u,u.unitRadius)})),
  memory:{...n.view.renderer.info.memory},programs:n.view.renderer.info.programs.length,maps:[...n.view.mapViews.keys()].map((t:any)=>({theme:t.recipe?.theme??'flat',hash:t.definition?.source.sha256})),
  driver:{accumulator:n.driver.accumulator,discarded:n.driver.discardedBacklogSeconds},visible:!document.hidden,focused:document.hasFocus()
 };
});
async function progress(label:string){report.progress={label,at:new Date().toISOString(),state:page?await state().catch(()=>null):null};await fs.writeFile(out+'/progress.json',JSON.stringify(report,null,2));console.log(label);}
async function shot(name:string){await page.screenshot({path:out+'/'+name+'.png'});report.screens.push({name,state:await state(),runtime:await runtime()});await progress(name);}
async function setup(){context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});await context.addInitScript('window.__name=v=>v;');page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',(e:any)=>report.errors.push(String(e)));page.on('console',(m:any)=>{if(m.type()==='error')report.errors.push(m.text())});page.on('response',(r:any)=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()})});await page.goto('http://127.0.0.1:'+(server.address() as any).port,{timeout:600000});await page.waitForFunction(()=>(window as any).__SC2_REPORT__?.().phase==='menu',null,{timeout:900000});}
async function ready(){await page.waitForFunction(()=>['ready','error'].includes((window as any).__SC2_REPORT__?.().readiness?.phase),null,{timeout:900000});const r=await runtime();assert.equal(r.readiness.phase,'ready',JSON.stringify(r.readiness));assert.equal(r.assetsPending,0);assert.deepEqual(r.errors,[]);await page.locator('[data-action="flow-continue"]').click();await page.waitForFunction(()=>(window as any).__SC2_REPORT__().phase==='battle');}
async function load(theme:string){if((await state()).phase!=='menu')await page.locator('.pause-actions [data-action="restart"]').click();await page.locator('.main-actions [data-action="menu-load"]').click();const event=page.waitForEvent('filechooser');await page.locator('[data-action="menu-load-file"]').click();await(await event).setFiles(fixtures[theme]);await page.locator('[data-action="menu-load-ready"]').click();await progress(theme+' preparing');await ready();}
async function start(theme:CampaignTheme){await page.evaluate((theme:string)=>{const n=(window as any).__MVP5_NATIVE__,prepare=n.session.prepareNewRun.bind(n.session);n.session.prepareNewRun=(...args:any[])=>{const ticket=prepare(...args);ticket.campaignMap={version:3,theme,seed:529};return ticket}},theme);await page.locator('.main-actions [data-action="menu-new"]').click();await page.locator('[data-action="menu-race"][data-race="'+races[theme]+'"]').click();await page.locator('[data-action="menu-race-next"]').click();await page.locator('[data-action="menu-difficulty"][data-difficulty="easy"]').click();await page.locator('[data-action="menu-difficulty-next"]').click();await page.locator('[data-action="menu-start"]').click();await progress(theme+' native new run preparing');await ready();}
async function move(point:{x:number;z:number},label:string){const box=await page.locator('#minimap-canvas').boundingBox();assert.ok(box);const frame=JSON.parse(await page.locator('#minimap-canvas').getAttribute('data-map-frame')),x=(point.x-frame.left)/frame.size,z=(point.z-frame.top)/frame.size;assert.ok(x>=0&&x<=1&&z>=0&&z<=1);await page.mouse.click(box.x+box.width*x,box.y+box.height*z,{button:'right'});report.actions.push({label,point,time:(await state()).time,control:'native-minimap-right-pointer'});}
async function decision(){for(const selector of ['[data-action="elite-rescue-claim"]:not(:disabled):visible','[data-action="talent-loot"]:not(:disabled):visible','[data-action="family-reject"]:visible','[data-action="elite-replace"]:not(:disabled):visible','[data-action="elite-rescue-decline"]:visible']){const button=page.locator(selector).first();if(await button.isVisible()){await button.click();report.actions.push({selector,control:'native-decision'});return true}}return false;}
try{
 if(mode==='cache'){
  await setup();for(let cycle=0;cycle<3;cycle++)for(const theme of themes){await load(theme);const s=await state();assert.ok(s.maps.filter((m:any)=>m.theme!=='flat').length<=2,'At most the previous/current campaign maps');assert.ok(s.maps.filter((m:any)=>m.theme==='flat').length<=1,'Initial flat map remains bounded');report.runs.push({cycle,theme,state:s});await progress('cache '+cycle+' '+theme)}
  const a=report.runs.slice(-themes.length*2,-themes.length),b=report.runs.slice(-themes.length);for(let i=0;i<b.length;i++)assert.deepEqual(b[i].state.memory,a[i].state.memory,b[i].theme);report.checks.push({kind:'same-page-map-cache-plateau',cycles:3,themes,comparedCycles:[1,2]});await shot('cache-final');
 }else for(const theme of themes){
  await setup();if(mode==='natural')await start(theme);else {await load(theme);await page.locator('.pause-actions [data-action="pause"]').click();}
  const began=await state();assert.equal(began.paused,false);assert.equal((await runtime()).map.environment.ground.profile,theme);await shot(theme+'-start');const samples:any[]=[];let previousSignature='',lastProgress=Date.now(),lastTime=-1;
  if(mode==='tour'){
   for(const point of routes[theme]){
    await move(point,theme+' '+point.id);const startAt=Date.now(),from=(await state()).time;
    while(true){const s=await state();assert.equal(s.phase,'battle');assert.equal(s.decision,false);samples.push({target:point.id,time:s.time,tick:s.tick,anchor:s.anchor,allies:s.allies});if(Math.hypot(s.anchor.x-point.x,s.anchor.z-point.z)<.65)break;if(Date.now()-startAt>90000||s.time-from>35)throw Error('Native traversal did not reach '+point.id);await page.waitForTimeout(300)}
    // Give native squad following time to catch up for the ordinary-camera inspection.
    // This is an observation wait, never a unit teleport or a product visibility threshold.
    const followAt=Date.now(),followTime=(await state()).time;
    while(Date.now()-followAt<30000){const s=await state();if(s.allies.some((u:any)=>u.hp>0&&Math.hypot(u.x-s.anchor.x,u.z-s.anchor.z)<5)||s.time-followTime>=8)break;await page.waitForTimeout(300)}
    await page.waitForTimeout(1200);await shot(theme+'-'+point.id);
   }
   report.checks.push({kind:'continuous-native-minimap-tour',theme,points:routes[theme].length,teleportsAfterEntry:0});
  }else{
   const deadline=Date.now()+Math.max(300000,seconds*6000);let nextOrder=0,patrol=0,lastTarget='',nextImage=20,decisionWaitStart=0;
   while(Date.now()<deadline){const s=await state(),r=await page.evaluate(()=>{const r=(window as any).__SC2_REPORT__();return {readiness:r.readiness,assetsPending:r.assetsPending}});samples.push({time:s.time,tick:s.tick,phase:s.phase,stage:s.stage,anchor:s.anchor,stats:s.stats,driver:s.driver,visible:s.visible,focused:s.focused});const signature=JSON.stringify([s.ledger.map((j:any)=>[j.id,j.state,j.passengers.map((p:any)=>p.status)]),s.pods.map((p:any)=>[p.id,p.status,p.guardAlive])]);if(signature!==previousSignature){previousSignature=signature;report.transitions.push({theme,state:s});await progress(theme+' native production/combat '+s.time.toFixed(2))}
    if(s.time!==lastTime){lastTime=s.time;lastProgress=Date.now()}
    if(s.time>=nextImage){await shot(theme+'-battle-'+Math.floor(nextImage));nextImage+=30}
    if(s.time-began.time>=seconds||s.phase==='lost'){if(s.phase==='lost')await shot(theme+'-native-loss');break}
    if(r.readiness.phase==='error')throw Error('Native readiness failed: '+r.readiness.error);
    if(r.readiness.phase==='ready'){const proceed=page.locator('[data-action="flow-continue"]:visible');if(await proceed.isVisible()){await proceed.click();report.actions.push({control:'native-next-stage-ready',time:s.time});continue}}
    if(s.phase==='reward'){const skip=page.locator('.reward-actions [data-action="skip"]').first();if(await skip.isVisible())await skip.click();await page.waitForTimeout(200);continue}
    if(s.decision){if(await decision())decisionWaitStart=0;else {decisionWaitStart||=Date.now();if(Date.now()-decisionWaitStart>30000)throw Error('Unhandled native decision: '+await page.locator('button:visible').evaluateAll((buttons:any[])=>buttons.map(b=>b.getAttribute('data-action')).join(',')));await page.waitForTimeout(200)}continue}decisionWaitStart=0;
    if(s.paused&&!r.readiness.kind)throw Error('Unexpected pause');
    if(!r.readiness.kind&&!r.assetsPending&&s.time>=nextOrder){const pod=s.pods.find((p:any)=>['falling','active','opening'].includes(p.status));const target=pod?{id:'pod-'+pod.id,x:pod.x,z:pod.z}:s.targets.find((e:any)=>e.kind==='egg');if(target){if(lastTarget!==target.id||Math.hypot(s.anchor.x-target.x,s.anchor.z-target.z)>2)await move(target,'visible-'+target.id);lastTarget=target.id;nextOrder=s.time+3}else if(s.time>=10){const points=[{x:9,z:0},{x:0,z:9},{x:-9,z:0},{x:0,z:-9}];await move(points[patrol++%4],'opening-main-road');lastTarget='';nextOrder=s.time+7}}
    if(Date.now()-lastProgress>120000)throw Error('Native gameplay stopped advancing');await page.waitForTimeout(300);
   }
   const final=await state();assert.ok(final.time>began.time+10,'Insufficient actual combat time');assert.ok(final.time-began.time>=seconds||final.phase==='lost','Native run timed out before its requested duration');assert.ok(final.stats.shots>0,'No native attacks observed');report.checks.push({kind:'native-default-speed-play',theme,seconds:final.time-began.time,continuous:final.phase!=='lost',outcome:final.phase,shots:final.stats.shots,productionPaid:final.economy.production,delivered:final.ledger.flatMap((j:any)=>j.passengers).filter((p:any)=>p.status==='released').length});
  }
  report.runs.push({theme,race:races[theme],before:began,after:await state(),runtime:await runtime(),samples});await progress(theme+' '+mode+' complete');await context.close();page=undefined;
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=String((error as Error).stack??error);if(page)await shot('failure').catch(()=>{});process.exitCode=1;}
finally{clearInterval(heartbeat);report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({passed:report.passed,mode,runs:report.runs.length,checks:report.checks.length,screens:report.screens.length,error:report.failure}));}
