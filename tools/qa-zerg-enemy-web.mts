import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {writeArchive} from '../src/persistence/archive';
import {startQaReleaseServer} from './qa-release-server.mjs';

const root=path.resolve(process.env.SC2_ZERG_WEB??'dist/zerg-six-campaign-qa');
const release=JSON.parse(await fs.readFile(path.join(root,'web-release.json'),'utf8'));
const seed=17,w=new World({race:'zerg',difficulty:'normal',seed,terrain:campaignTerrain(chooseCampaignMap(seed))});
w.starship.enabled=true;
if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
assert.ok(w.start());
w.missions.enabled=w.encounters.enabled=false;
w.expedition.ledger=[];w.pods=[];w.entities.clear();w.expedition.zerglingPairs=[];
for(const group of w.expedition.building!.groups)group.enabled=false;
w.expedition.familySlots=['hydralisk','aberration','devourer','viper','brood_lord'];
for(const [i,f] of w.expedition.familySlots.entries()){
 w.expedition.tech['unlock.'+f]=1;
 for(const dz of [-3,-1,1,3]){
  const p=w.freePosition(f,{x:w.anchor.x+(i-2)*2,z:w.anchor.z+dz},0,4)??w.anchor;
  w.addFamilyMember(f,p,5);
 }
}
w.stage=11;w.endStage();
assert.ok(w.skipReward());
assert.ok(w.finishIntermission());
assert.equal(w.stage,12);
const resumeActive=process.argv.includes('--resume-active');
if(resumeActive){
  while(w.phase==='battle'&&w.stageElapsed<39&&(w.expedition.zergEncounters?.counters.mother.entered??0)===0)w.step();
  assert.ok([...w.entities.values()].some(e=>e.hp>0&&e.owner==='zerg'&&e.enemySix&&!e.zergSix?.temp));
  assert.ok([...w.entities.values()].some(e=>e.hp>0&&e.owner==='zerg'&&e.experience));
 }
 const snapshot=w.captureRun();
w.restoreRun(snapshot,true);
const archive=writeArchive({profile:w.permanentProfile.exportJSON(),run:snapshot,equipment:w.starship.account});
const server=await startQaReleaseServer(root);
const url=server.url;
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
page.setDefaultTimeout(45000);
const errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))errors.push(r.status()+' '+r.url());});
await page.addInitScript(()=>{
 const p=window as any,frame=window.requestAnimationFrame.bind(window);
 const renderTimes:number[]=[];
 let prev=performance.now(),deltaTime=prev;
 p.qaFrames=renderTimes;p.qaSpeed=1;
 const sample={stamp(t:number){
  const d=Math.max(0,t-prev);prev=t;deltaTime+=d*p.qaSpeed;
  if(p.qaSpeed===1&&p.qaSampling){renderTimes.push(d);if(renderTimes.length>600)renderTimes.shift();}
  frame(sample.stamp);
 }};
 frame(sample.stamp);
 window.requestAnimationFrame=callback=>frame(()=>callback(deltaTime));
});
const read=()=>page.evaluate(()=>(window as any).__SC2_REPORT__());
try{
 await page.goto(url);
 await page.waitForFunction(()=>(window as any).__SC2_REPORT__?.().phase==='menu',null,{timeout:180000});
 assert.equal(await page.locator('meta[name=sc2-app-build]').getAttribute('content'),release.appBuildId);
 await page.locator('[data-action=settings]:visible').first().click();
 await page.locator('[data-action=settings-tab][data-tab=saves]').click();
 const picker=page.waitForEvent('filechooser');
 await page.locator('[data-action=menu-load-file]').click();
 await(await picker).setFiles({name:'zerg-r2-late-field.json',mimeType:'application/json',buffer:Buffer.from(archive)});
 await page.waitForFunction(()=>{const r=(window as any).__SC2_REPORT__();return ['ready','error'].includes(r.readiness.phase)||r.phase==='battle'&&!r.readiness.kind&&r.assetsReady;},null,{timeout:160000,polling:300});
 assert.notEqual((await read()).readiness.phase,'error');
 const continueFlow=page.locator('[data-action=flow-continue]:visible');
 if(await continueFlow.count())await continueFlow.click();
 const paused=page.locator('.pause-actions [data-action=pause]:visible');
 if(await paused.count())await paused.click();
 console.log('已从正式入口载入第12关');
 await page.evaluate(()=>{(window as any).qaSpeed=3;});
 await page.waitForFunction(()=>{const r=(window as any).__SC2_REPORT__();return r.phase==='lost'||r.zergEncounterCounts?.mother.entered>0&&r.zergEncounterCounts?.experience.entered>=20;},null,{timeout:160000,polling:300});
 const active=await read();
 assert.ok(active.phase==='battle'&&active.zergEncounterCounts?.mother.entered>0,JSON.stringify({phase:active.phase,time:active.time,counts:active.zergEncounterCounts}));
 await page.evaluate(()=>{(window as any).qaSpeed=1;(window as any).qaSampling=true;});
 const first=await read();
 await page.waitForFunction(()=>((window as any).qaFrames?.length??0)>=140,null,{timeout:45000});
 const last=await read(),samples=(await page.evaluate(()=>(window as any).qaFrames) as number[]).filter(t=>t>0).sort((a,b)=>a-b);
 assert.equal(last.phase,'battle');assert.ok(last.stats.damage>0&&last.zergEncounterCounts.experienceKills>0);
 assert.deepEqual(last.errors,[]);assert.deepEqual(last.audio.errors,[]);assert.deepEqual(errors,[]);
 const output=process.env.SC2_QA_SCREENSHOT;
 if(output)await page.screenshot({path:output});
 console.log(JSON.stringify({build:release.appBuildId,stage:last.stage,savedBattleTime:snapshot.state.time,resumeActive,timeStart:first.time,timeEnd:last.time,
  normalKills:last.stats.kills,stats:last.zergEncounterCounts,entities:last.entities,drawCalls:last.drawCalls,
  frameCount:samples.length,p95FrameMs:samples[Math.floor(samples.length*.95)],audioContext:last.audio.contextState,
  playedCombatBanks:Object.keys(last.audio.nativePlayed),audioErrors:last.audio.errors}));
}catch(error){
 const r=await read().catch(()=>null);
 const visible=await page.locator('[role=alert]:visible').allTextContents().catch(()=>[]);
 console.error(JSON.stringify({phase:r?.phase,stage:r?.stage,time:r?.time,readiness:r?.readiness,stats:r?.zergEncounterCounts,visible,errors}));
 throw error;
}finally{await browser.close();await server.close();}
