/** Windows Chrome, one continuous campaign. The QA entry exposes the normal
 * runtime for bounded fixed-step acceleration. All departures use the HUD. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from '@playwright/test';
import {installRuntimeMemoryTrace} from './runtime-memory-inventory.mjs';
import {World} from '../src/simulation/world.ts';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map.ts';
import {createContentPlan} from '../src/simulation/progression/run-content.ts';
import {newEquipmentAccount} from '../src/simulation/starship/inventory.ts';
import {writeArchive,readArchive} from '../src/persistence/archive.ts';
import {shopProgress} from '../src/ui/presentation/shop-progress.ts';

process.env.SC2_TUTORIAL_DIST_ROOT??='dist/ios-content-20261109';
process.env.SC2_TUTORIAL_WORK_ROOT??='reports/local/ios-content-20261109';
const {serveTutorial}=await import('./serve-short-tutorial-candidate.mjs');
const output=process.env.SC2_TUTORIAL_WORK_ROOT+'/long-campaign.json';
const seed=529,lastStage=15,samples=[],departures=[],errors=[];
const world=new World({seed,race:'terran',equipmentAccount:newEquipmentAccount(seed),terrain:campaignTerrain(chooseCampaignMap(seed))});
world.start(undefined,createContentPlan(seed,'terran',world.difficulty));
// A fixed test squad keeps the resource workload reproducible across builds.
for(const [i,family] of ['marine','marine','marine','marauder','tank','viking','medivac'].entries()){
 world.addUnit(family,'terran',world.anchor.x+i%4-1,world.anchor.z+Math.floor(i/4)+1,5);
}
shopProgress(world).observe();
const run=world.captureRun(),raw=writeArchive({profile:world.permanentProfile.exportJSON(),run,equipment:run.starship.runtime.account,shopProgress:shopProgress(world).snapshot()});
assert.equal(readArchive(raw).bundle.run.state.phase,'battle');
const execute=promisify(execFile);
async function processMemory(cdp){
 const liveIds=async()=>(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id).filter(id=>Number.isSafeInteger(id)&&id>0);
 let sampleError='Process group changed during sampling';
 for(let attempt=0;attempt<3;attempt++){
  const ids=await liveIds();assert(ids.length);
  try{
   const result=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',
    'Get-Process -Id '+ids.join(',')+' -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress; exit 0'],{windowsHide:true});
   const byId=new Map([JSON.parse(result.stdout)].flat().map(row=>[row.Id,row]));
   const current=await liveIds();
   if(!current.length||current.some(id=>!byId.has(id)))continue;
   const rows=current.map(id=>byId.get(id));
   return {processes:rows.length,privateBytes:rows.reduce((n,p)=>n+p.PrivateMemorySize64,0),workingSetBytes:rows.reduce((n,p)=>n+p.WorkingSet64,0)};
  }catch(error){sampleError=String(error);}
 }
 // Keep the campaign running through a transient Windows observer failure.
 return {processes:null,privateBytes:null,workingSetBytes:null,sampleError};
}
function pageState(){
 const {world:w,view,session,readiness}=globalThis.__TUTORIAL_APP__;
 const r=globalThis.__SC2_REPORT__(),trace=globalThis.__RUNTIME_MEMORY_TRACE__?.()[0];
 return {stage:w.stage,time:w.time,phase:w.phase,round:w.rewardRound,elapsed:w.stageElapsed,assetsPending:view.assetsPending,gate:readiness.state.phase,
  gateError:readiness.state.error,decision:w.requiresPlayerDecision,paused:w.paused,models:[...view.gpu.keys()],errors:r.errors,
  shots:w.stats.shots,savedAt:session.savedAt,saveFailed:session.saveFailed,plan:!!w.runConfig?.contentPlan,
  memory:r.resourceMemory,retirement:r.lastStageRetirement,glBufferBytes:trace?.bufferBytes,stageWindow:r.background.stageWindow,
  natural:w.fieldEvents.pacing.choice,lastEvent:w.fieldEvents.pacing.lastKey,special:w.specialStages.active?.kind??null,heals:globalThis.fixtureHeals??0};
}
const release=JSON.parse(await fs.readFile(process.env.SC2_TUTORIAL_DIST_ROOT+'/candidate/web-release.json','utf8'));
const server=await serveTutorial({port:0,diagnostic:true});
const started=Date.now();
async function save(extra={}){await fs.writeFile(output,JSON.stringify({appBuildId:release.appBuildId,seed,fixture:'Seven additional rank-five allies at start. Test medic restores surviving allies below 60% health. Normal waves, simulation ticks, rendering, stage gates and checkpoint transactions. Accelerated fixed-step sampling, Windows touch emulation.',wallMs:Date.now()-started,departures,samples,errors,...extra},null,2));}
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling']});
 const cdp=await browser.newBrowserCDPSession(),context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await context.addInitScript(installRuntimeMemoryTrace);
 await context.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>undefined});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>6});localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium'}));});
 const page=await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/web-release.json');
 await page.evaluate(raw=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('sc2-survivors-saves',1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');
  request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(raw,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};
 }),raw);
 await page.goto(origin+'/qa.html');
 await page.waitForFunction(()=>globalThis.__TUTORIAL_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
 const click=action=>page.locator('[data-action="'+action+'"]:visible').first().click();
 await click('save-continue');
 await page.waitForFunction(()=>['ready','error'].includes(globalThis.__TUTORIAL_APP__.readiness.state.phase),null,{timeout:240000});
 assert.equal((await page.evaluate(pageState)).gate,'ready');
 await click('flow-continue');
 // Resume the restored paused battle. A test medic keeps the same squad alive while legal damage, deaths and rewards still settle.
 await page.evaluate(()=>{const app=globalThis.__TUTORIAL_APP__;app.world.paused=false;app.world.changed();
  const advance=()=>{const {world:w,view,readiness}=app;
   if(w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&!readiness.state.kind&&!view.assetsPending){
    for(let n=0;n<10&&w.phase==='battle'&&!w.requiresPlayerDecision&&!view.assetsPending;n++){
     for(const unit of w.allies())if(unit.hp<unit.maxHp*.6){unit.hp=unit.maxHp;globalThis.fixtureHeals=(globalThis.fixtureHeals??0)+1;}
     w.step();
    }
   }
   requestAnimationFrame(advance);
  };requestAnimationFrame(advance);
 });
 let lastSample=0,stalledAt=Date.now(),previousTime=-1;
 for(;;){
  const row=await page.evaluate(pageState);
  assert.deepEqual(errors,[]);assert.deepEqual(row.errors,[]);assert(!row.saveFailed);assert(!row.gateError,row.gateError);assert(row.plan);
  if(row.time!==previousTime){previousTime=row.time;stalledAt=Date.now();}
  assert(Date.now()-stalledAt<240000,'simulation stalled: '+JSON.stringify(row));
  if(Date.now()-lastSample>=10000||row.phase==='reward'){
   samples.push({...row,wallMs:Date.now()-started,...await processMemory(cdp)});lastSample=Date.now();await save();
  }
  if(row.stage===lastStage&&row.elapsed>=12)break;
  assert.notEqual(row.phase,'lost','squad defeated at '+row.stage);
  if(row.phase==='reward'&&row.gate==='idle'){
   if(row.round==='building'){await click('skip');continue;}
   await page.evaluate(()=>{document.addEventListener('click',function listen(event){
    if(!event.target.closest('[data-action="skip"]'))return;
    document.removeEventListener('click',listen,true);globalThis.__DEPARTURE_AT__=performance.now();
   },true);});
   await click('skip');
   await page.waitForFunction(old=>{const app=globalThis.__TUTORIAL_APP__;return app.readiness.state.phase==='error'||app.world.stage>old&&!app.readiness.state.kind;},row.stage,{timeout:240000});
   const ms=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve(performance.now()-globalThis.__DEPARTURE_AT__))));
   departures.push({from:row.stage,ms});console.log('stage',row.stage+1,'departure',Math.round(ms),'ms');
   continue;
  }
  await page.waitForTimeout(700);
 }
 await page.evaluate(()=>{const w=globalThis.__TUTORIAL_APP__.world;w.paused=true;w.changed();});
 const last=await page.evaluate(pageState);samples.push({...last,wallMs:Date.now()-started,...await processMemory(cdp)});
 assert(last.shots>0);assert.equal(departures.length,lastStage-1);
 const repeats=[];
 for(let i=0;i<3;i++){
  const ok=await page.evaluate(()=>globalThis.__TUTORIAL_APP__.readiness.prepare('reinforcement'));
  assert(ok);await page.waitForTimeout(2500);
  const same=await page.evaluate(pageState);assert.equal(same.stage,last.stage);assert.equal(same.time,last.time);assert.deepEqual(same.errors,[]);
  repeats.push({...same,...await processMemory(cdp)});
 }
 await save({complete:true,chrome:browser.version(),last,repeats});console.log('completed',last.stage,last.time,'simulation seconds');
}catch(error){await save({complete:false,failure:String(error)});throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
