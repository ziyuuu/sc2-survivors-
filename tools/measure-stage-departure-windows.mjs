/** node --import tsx tools/measure-stage-departure-windows.mjs
 * Measure a real departure click from a synthetic first-stage reward checkpoint. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {createContentPlan} from '../src/simulation/progression/run-content.ts';
import {World} from '../src/simulation/world.ts';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map.ts';
import {newEquipmentAccount} from '../src/simulation/starship/inventory.ts';
import {writeArchive,readArchive} from '../src/persistence/archive.ts';
import {shopProgress} from '../src/ui/presentation/shop-progress.ts';

const root=process.env.SC2_TUTORIAL_DIST_ROOT??'dist/auto-combat-1.2-20261106';
process.env.SC2_TUTORIAL_DIST_ROOT=root;
const {serveTutorial}=await import('./serve-short-tutorial-candidate.mjs');
const release=JSON.parse(await fs.readFile(root+'/candidate/web-release.json','utf8'));
const world=new World({seed:529,race:'terran',equipmentAccount:newEquipmentAccount(529),terrain:campaignTerrain(chooseCampaignMap(529))});
world.start(undefined,process.env.SC2_SEEDED_FIXTURE==='1'?createContentPlan(529,'terran',world.difficulty):undefined);
world.endStage();
if(world.rewardRound==='building')world.skipReward();
shopProgress(world).observe();
const run=world.captureRun();
let raw=writeArchive({profile:world.permanentProfile.exportJSON(),run,equipment:run.starship.runtime.account,shopProgress:shopProgress(world).snapshot()});
if(process.env.SC2_DEPARTURE_ARCHIVE){
 const file=process.env.SC2_DEPARTURE_ARCHIVE;
 try{await fs.writeFile(file,raw,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;raw=await fs.readFile(file,'utf8');}
}
assert.equal(readArchive(raw).bundle.run.state.phase,'reward');

const server=await serveTutorial({port:0});
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling']});
 const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'deviceMemory',{get:()=>undefined});
  Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>6});
  localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium'}));
 });
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(180000);
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/web-release.json');
 await page.evaluate(raw=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('sc2-survivors-saves',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('snapshots');
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{const db=req.result,tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(raw,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};
 }),raw);
 await page.goto(origin);
 await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'));
 const click=id=>page.locator('[data-action="'+id+'"]:visible').first().click();
 await click('save-continue');
 await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().readiness.phase==='ready',null,{timeout:240000});
 await click('flow-continue');
 await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='reward');
 await page.evaluate(()=>{
  document.addEventListener('click',function start(event){
   if(!event.target.closest('[data-action="skip"]'))return;
   document.removeEventListener('click',start,true);
   const at=performance.now(),changes=[];
   const tick=()=>{
    const r=globalThis.__SC2_REPORT__(),elapsedMs=performance.now()-at;
    if(changes.at(-1)?.phase!==r.readiness.phase)changes.push({phase:r.readiness.phase,elapsedMs});
    if(r.phase==='battle'&&r.stage===2&&!r.readiness.kind){
     // Observe a subsequent frame, after the stage switch has had a draw opportunity.
     requestAnimationFrame(()=>{globalThis.__STAGE_DEPARTURE__={observedBattleMs:elapsedMs,followingFrameMs:performance.now()-at,
      phaseSamples:changes,stageWindow:r.background.stageWindow,stage:r.stage,errors:r.errors};});
    }else requestAnimationFrame(tick);
   };
   requestAnimationFrame(tick);
  },true);
 });
 await click('skip');
 await page.waitForFunction(()=>globalThis.__STAGE_DEPARTURE__,null,{timeout:240000});
 const result={appBuildId:release.appBuildId,archiveSha256:createHash('sha256').update(raw).digest('hex'),chrome:browser.version(),scope:'One human race stage 1→2 departure from a restored synthetic reward checkpoint. Timed from capture-phase skip click to observing battle and the following rAF. Phase samples can omit short phases.',pageErrors:errors,...await page.evaluate(()=>globalThis.__STAGE_DEPARTURE__)};
 // Let the first real wave reach the squad. A fast transition is only useful
 // if the normal battle can play and settle its first attack afterwards.
 await page.waitForFunction(()=>globalThis.__SC2_REPORT__().stage===2&&globalThis.__SC2_REPORT__().stats.shots>0,null,{timeout:90000});
 result.attack=await page.evaluate(()=>{const r=globalThis.__SC2_REPORT__();return {time:r.time,shots:r.stats.shots,pending:r.assetsPending,errors:r.errors};});
 assert.deepEqual(result.attack.errors,[]);
 assert.deepEqual(errors,[]);assert(result.stageWindow);assert.deepEqual(result.errors,[]);
 const out=process.env.SC2_MEASURE_OUTPUT??'reports/local/stage-departure-windows-20261109';await fs.mkdir(out,{recursive:true});
 await page.screenshot({path:out+'/stage2.png'});await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
