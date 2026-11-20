import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {startQaReleaseServer} from './qa-release-server.mjs';
import {World} from '../src/simulation/world';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {terranShelf} from './qa-terran-budget.mts';
import {grantFacility} from '../src/simulation/building/rules';
const mixed=process.env.SC2_QA_CUMULATIVE==='1';
const out=path.resolve(process.env.SC2_TERRAN_QA_OUTPUT??'reports/local/terran-six-20261119',mixed?'browser-cumulative':'browser'),root=path.resolve(process.env.SC2_TERRAN_WEB??'dist/terran-six-20261119');
await fs.mkdir(out,{recursive:true});const release=JSON.parse(await fs.readFile(path.join(root,'web-release.json'),'utf8'));
const offers:Record<string,string>={},reports:any[]=[],errors:string[]=[];
for(const line of ['ground','air','armed'] as const){
 if(mixed&&line!=='ground')continue;
 const w=new World({race:'terran',seed:191145,waves:false,terrain:campaignTerrain(chooseCampaignMap(191145))});w.starship.enabled=true;assert.ok(w.start());
 w.missions.enabled=w.encounters.enabled=false;if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 w.entities.clear();w.expedition.ledger=[];w.pods=[];const base=w.expedition.building!;grantFacility(base,'factory');grantFacility(base,'starport');w.stage=12;
 w.expedition.familySlots=line!=='air'?['marine','reaper','ghost','widow_mine','cyclone']:['marine','reaper','raven','liberator','battlecruiser'];
 w.expedition.familySlots.forEach((f,i)=>{w.expedition.tech['unlock.'+f]=1;const u=w.addUnit(f,'terran',w.anchor.x+(i-2)*1.1,w.anchor.z,3);u.energy=u.maxEnergy;});
 assert.ok(w.setProductionEnabled('marine',true));
 const opposition=()=>{for(let i=0;i<8;i++){const u=w.addUnit(i===7?'mutalisk':i===0?'queen':'roach','zerg',w.anchor.x+(i%3)-1,w.anchor.z+3+Math.floor(i/3)*.7);u.maxHp=u.hp=24000;u.armor=5;u.stoppedUntil=w.time+120;if(i===0)u.enemyTier='boss';}};opposition();
 const save=async(name:string)=>{const raw=writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun(),equipment:w.starship.account});readArchive(raw);await fs.writeFile(path.join(out,line+'-'+name+'.json'),raw);};
 // Import a genuine in-flight snapshot so the D05 checkpoint can replay pending skills.
 w.step();await save('battle');w.wallet={minerals:1500,gas:500};w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;w.paused=true;offers[line]=terranShelf(w,line==='ground'?'BIO-W02':line==='air'?'M-W01':'W02').offerId;await save('shop');
 if(mixed){
  for(const id of ['BIO-W02','M-W01','W04','BIO-W03','BIO-W01'] as const){const offer=terranShelf(w,id);assert.ok(w.purchaseShopOffer(w.draftWindowKey,offer.offerId),id);const node=pendingBuildChoice(w);if(node)assert.ok(w.claimBuildChoice(node.id,w.expedition.shopRevision,node.offers[0]));}
  assert.ok(w.skipReward());w.paused=false;opposition();for(let t=0;t<18;t++)w.step();await save('battle');
 }
}
const unlock=new World({race:'terran',seed:191145,waves:false,terrain:campaignTerrain(chooseCampaignMap(191145))});
unlock.starship.enabled=true;assert.ok(unlock.start());if(unlock.starship.account.tutorial)unlock.starship.account.tutorial.status='completed';
unlock.expedition.ledger=[];unlock.pods=[];unlock.stage=12;unlock.missions.enabled=unlock.encounters.enabled=false;unlock.expedition.tech['unlock.reaper']=1;unlock.expedition.developmentTarget='unlock.ghost';
unlock.endStage();assert.ok(unlock.setBuildingGroupOutputs('barracks',[]));unlock.wallet={minerals:0,gas:0};assert.ok(unlock.setDevelopmentDirection('barracks'));
const ghostOffer=unlock.rewards.find((r:any)=>r.expeditionEffect?.definitionId==='unlock.ghost');assert.ok(ghostOffer);const barracks=unlock.expedition.building!.groups.find(g=>g.id==='barracks')!;barracks.cursor=0;
const unlockRaw=writeArchive({profile:unlock.permanentProfile.exportJSON(),run:unlock.captureRun(),equipment:unlock.starship.account});readArchive(unlockRaw);await fs.writeFile(path.join(out,'unlock.json'),unlockRaw);
if(process.argv.includes('--fixtures-only')){console.log('Validated packaged QA archives',out);process.exit(0);}
const server=await startQaReleaseServer(root);
const url=server.url;
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
let active:import('@playwright/test').Page|undefined,action='boot';
try{
 for(const [device,line,width,height] of [['desktop','ground',1440,900],['landscape','air',844,390],['portrait','armed',390,844]] as const){
  if(mixed&&device!=='desktop')continue;
  if(process.env.SC2_QA_DEVICE&&!process.env.SC2_QA_DEVICE.split(',').includes(device))continue;
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true,hasTouch:device!=='desktop'}),page=await context.newPage();
  await page.addInitScript({content:`
    globalThis.__name = (value) => value;
    globalThis.__sixAudio = {started:0, audible:0};
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){const stats=globalThis.__sixAudio;stats.started++;const data=this.buffer?.getChannelData(0);if(data&&this.context.state==='running'){for(let i=0;i<data.length;i+=41)if(Math.abs(data[i])>.002){stats.audible++;break;}}return start.apply(this,args);};
  `});
  active=page;action=device+' menu';console.log(action);page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});page.on('console',m=>{if(m.type()==='error'&&/Shader Error|GL_INVALID_OPERATION/.test(m.text()))errors.push(m.text());});
  const report=()=>page.evaluate(()=>(window as any).__SC2_REPORT__());
  const settings=async()=>{if(!await page.locator('[data-action=settings]:visible').count()){await page.locator('[data-action=pause]:visible').first().click();}await page.locator('[data-action=settings]:visible').first().click();await page.locator('[data-action=settings-tab][data-tab=saves]').click();};
  const ready=async()=>{for(let attempt=0;attempt<3;attempt++){await page.waitForFunction(()=>{const r=(window as any).__SC2_REPORT__?.();return r?.readiness.phase==='ready'||r?.readiness.phase==='error'||r?.phase==='battle'&&!r.readiness.kind&&r.assetsReady;},null,{timeout:300000,polling:500});const r=await report();if(r.readiness.phase!=='error')return;if(attempt===2||!String(r.readiness.error).includes('超时'))throw Error(JSON.stringify(r.readiness));console.log(device+' retry '+r.readiness.error);await page.locator('[data-action=flow-retry]').click();}};
  const load=async(file:string)=>{action=device+' open '+path.basename(file);console.log(action);await page.goto(url);await page.waitForFunction(()=>(window as any).__SC2_REPORT__?.().phase==='menu',null,{timeout:180000});assert.equal(await page.locator('meta[name=sc2-app-build]').getAttribute('content'),release.appBuildId);await settings();const picker=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await picker).setFiles(file);action=device+' import '+path.basename(file);console.log(action);await ready();await page.locator('[data-action=flow-continue]').click();};
  let nextStage:number|undefined;
  if(device==='desktop'&&!mixed){
   await load(path.join(out,'unlock.json'));action='buy free ghost technology';await page.locator('[data-action=development-purchase][data-id="'+ghostOffer.offerId+'"]').click();
   const bought=await report();assert.equal(bought.wallet.minerals,0);assert.equal(bought.wallet.gas,0);
   if(await page.locator('[data-action=skip]:visible').count())await page.locator('[data-action=skip]').click();
   if((await report()).phase==='reward'&&await page.locator('[data-action=skip]:visible').count())await page.locator('[data-action=skip]').click();
   await ready();if(await page.locator('[data-action=flow-continue]:visible').count())await page.locator('[data-action=flow-continue]').click();
   if(await page.locator('.pause-actions [data-action=pause]:visible').count())await page.locator('.pause-actions [data-action=pause]').click();
   await page.waitForFunction(()=>(window as any).__SC2_REPORT__().stats.produced>0,null,{timeout:240000});const produced=(await report()).stats.produced;
   await settings();await page.locator('[data-action=save-now]').click();await page.waitForFunction(()=>(window as any).__SC2_REPORT__().save.message.includes('已保存'));
   const download=page.waitForEvent('download');await page.locator('[data-action=save-export]').click();const exported=path.join(out,'unlock-verified.json');await(await download).saveAs(exported);
   const state=readArchive(await fs.readFile(exported,'utf8')).bundle.run!.state;
   assert.equal(state.expedition.tech['unlock.ghost'],1);const group=state.expedition.building!.groups.find(g=>g.id==='barracks')!;assert.deepEqual(group.outputs.filter(f=>group.enabledFamilies?.[f]!==false),['ghost']);reports.push({build:release.appBuildId,device,freeUnlock:'ghost',produced,checkpointStage:state.stage});console.log('free unlock and production passed');await fs.writeFile(path.join(out,'free-unlock-result.json'),JSON.stringify(reports.at(-1)));
  }
  if(!mixed){await load(path.join(out,line+'-shop.json'));await page.waitForFunction(()=>(window as any).__SC2_REPORT__().phase==='reward');
  const before=await report();action=device+' buy';console.log(action);await page.locator('[data-action=reward][data-id="'+offers[line]+'"]').click();await page.waitForFunction(n=>(window as any).__SC2_REPORT__().wallet.minerals<n,before.wallet.minerals);
  await page.locator('[data-action=skip]').click();action=device+' next stage';console.log(action);await ready();if(await page.locator('[data-action=flow-continue]:visible').count())await page.locator('[data-action=flow-continue]').click();
  await page.waitForFunction(()=>(window as any).__SC2_REPORT__().phase==='battle');nextStage=(await report()).stage;assert.ok(nextStage!>before.stage);}
  await load(path.join(out,line+'-battle.json'));if(await page.locator('.pause-actions [data-action=pause]:visible').count())await page.locator('.pause-actions [data-action=pause]').click();
  await page.waitForFunction(t=>(window as any).__SC2_REPORT__().time>=t,mixed?9.5:4,{timeout:180000,polling:300});
  const live=await report();assert.ok(live.sourceCombat.routes.some((route:string)=>route.startsWith('six-')),JSON.stringify(live.sourceCombat.routes));action=device+' battle and save';console.log(action);assert.equal(live.expedition.families.length,5);assert.deepEqual(live.audio.errors,[]);assert.ok(live.stats.shots>0);assert.deepEqual(live.errors,[]);
  const sound=await page.evaluate(()=>(window as any).__sixAudio);assert.ok(sound.audible>0,JSON.stringify({sound,audio:live.audio}));
  await page.screenshot({path:path.join(out,device+'.png')});
  let retreatDistance:number|undefined;
  if(device==='desktop'){const start=await report();assert.equal(start.controls.desktop,'mouse');await page.mouse.click(Math.round(width*.29),Math.round(height*.38),{button:'right'});await page.waitForFunction(()=>(window as any).__SC2_REPORT__().order?.kind==='move',null,{timeout:5000,polling:100});await page.waitForFunction(t=>(window as any).__SC2_REPORT__().time>=t+1,start.time,{timeout:45000,polling:200});const moved=await report();retreatDistance=Math.hypot(moved.camera.target[0]-start.camera.target[0],moved.camera.target[2]-start.camera.target[2]);assert.ok(retreatDistance>.05,'retreat did not move the camera target');}
  await settings();await page.locator('[data-action=save-now]').click();await page.waitForFunction(()=>{const s=(window as any).__SC2_REPORT__().save;return s.message.includes('已保存')&&!s.busy;});
  const downloading=page.waitForEvent('download');await page.locator('[data-action=save-export]').click();const file=path.join(out,device+'-resume.json');await(await downloading).saveAs(file);
  const saved=readArchive(await fs.readFile(file,'utf8')).bundle.run!;assert.deepEqual(saved.state.expedition.familySlots,live.expedition.families);
  if(mixed){const e=saved.state.expedition;assert.ok(e.bio?.ranks['BIO-W02']&&e.doomsday?.ranks['M-W01']&&e.support.armed?.ranks.W04);}
  const units=[...saved.state.entities.values()].filter((u:any)=>u.six&&u.owner==='terran');assert.equal(units.length,3);
  await load(file);const restored=await report();assert.deepEqual(restored.expedition.families,live.expedition.families);assert.ok(Math.abs(restored.time-saved.state.time)<.5);assert.ok(saved.state.time<=live.time);
  reports.push({build:release.appBuildId,device,line,width,height,nextStage,time:live.time,shots:live.stats.shots,skills:units.map((u:any)=>({type:u.unitType,state:u.six})),checkpointTime:saved.state.time,retreatDistance,sound,audio:live.audio,source:live.sourceCombat});await fs.writeFile(path.join(out,device+'-result.json'),JSON.stringify(reports.at(-1)));await context.close();console.log(device+' passed');
 }
 assert.deepEqual(errors,[]);
}catch(err){console.error(action,String(err));if(active&&!active.isClosed()){console.error(await active.locator('body').innerText({timeout:2000}).then(s=>s.slice(0,900)).catch(()=>''));console.error(await active.evaluate(()=>{const r=(window as any).__SC2_REPORT__?.();return {phase:r?.phase,readiness:r?.readiness,errors:r?.errors};}).catch(()=>null));await active.screenshot({path:path.join(out,'failure.png'),timeout:5000}).catch(()=>{});}throw err;}finally{await browser.close();await server.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify({build:release.appBuildId,reports,errors},null,2));}
