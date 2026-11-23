import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {applySwarmCard} from '../src/simulation/progression/zerg-swarm-acquisition';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {startQaReleaseServer} from './qa-release-server.mjs';

const root=path.resolve(process.env.SC2_ZSW_WEB??'dist/zerg-swarm-qa');
const release=JSON.parse(await fs.readFile(path.join(root,'web-release.json'),'utf8'));
const seed=201120,w=new World({race:'zerg',seed,waves:false,terrain:campaignTerrain(chooseCampaignMap(seed))});
w.starship.enabled=true;
if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
assert.ok(w.start());
w.missions.enabled=w.encounters.enabled=false;
w.expedition.ledger=[];w.pods=[];
for(const g of w.expedition.building!.groups)g.enabled=false;
assert.ok(applySwarmCard(w,'ZSW-W01','setup-training'));
assert.ok(applySwarmCard(w,'ZSW-W05','setup-hatch'));
w.stage=3;w.endStage();
if(w.rewardRound==='building')assert.ok(w.skipReward());
w.wallet.minerals=500;w.wallet.gas=300;
for(let n=0;n<350&&!w.rewards.some(r=>r.value==='ZSW-W02');n++){
 w.expedition.bonusRefreshRemaining=1;
 assert.ok(w.refreshOffers());
}
const offer=w.rewards.find(r=>r.value==='ZSW-W02');assert.ok(offer);
w.wallet.minerals=500;w.wallet.gas=300;
const fixture=writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun(),equipment:w.starship.account});
const app=await startQaReleaseServer(root);
const url=app.url;
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:800},acceptDownloads:true});
page.setDefaultTimeout(40000);
const errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))errors.push(r.status()+' '+r.url());});
const read=()=>page.evaluate(()=>(window as any).__SC2_REPORT__?.());
async function ready(){
 await page.waitForFunction(()=>{const r=(window as any).__SC2_REPORT__?.();return r&&(['ready','error'].includes(r.readiness.phase)||r.phase==='battle'&&!r.readiness.kind&&r.assetsReady);},null,{timeout:220000,polling:300});
 assert.notEqual((await read()).readiness.phase,'error');
 const b=page.locator('[data-action=flow-continue]:visible');if(await b.count())await b.click();
}
async function settings(){
 if(!await page.locator('[data-action=settings]:visible').count())await page.locator('[data-action=pause]:visible').first().click();
 await page.locator('[data-action=settings]:visible').first().click();
 await page.locator('[data-action=settings-tab][data-tab=saves]').click();
}
async function load(contents:Uint8Array){
 await page.goto(url);
 await page.waitForFunction(()=>(window as any).__SC2_REPORT__?.().phase==='menu',null,{timeout:180000});
 assert.equal(await page.locator('meta[name=sc2-app-build]').getAttribute('content'),release.appBuildId);
 if(release.packedWorker)assert.equal(await page.evaluate(()=>new URL(navigator.serviceWorker.controller!.scriptURL).pathname.split('/').pop()),release.packedWorker);
 await page.locator('[data-action=settings]:visible').first().click();
 await page.locator('[data-action=settings-tab][data-tab=saves]').click();
 const chooser=page.waitForEvent('filechooser');
 await page.locator('[data-action=menu-load-file]').click();
 await(await chooser).setFiles({name:'zerg-swarm-qa.json',mimeType:'application/json',buffer:Buffer.from(contents)});
 await ready();
}
try {
 await load(Buffer.from(fixture));
 console.log('已载入锁主前的正式关间存档');
 await page.locator('[data-action=reward][data-id="'+offer.offerId+'"]').click();
 await page.waitForFunction(()=>(window as any).__SC2_REPORT__().zergSwarm?.main==='zerg-swarm');
 const nodes=page.locator('[data-action=armed-node]:visible');
 await nodes.first().waitFor();
 assert.equal(await nodes.count(),3);
 const layouts=[];
 for(const size of [{width:1280,height:800},{width:860,height:415},{width:415,height:860}]){
  await page.setViewportSize(size);
  const available=await nodes.count();assert.equal(available,3);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=0,'node choices overflow the viewport at '+size.width+'x'+size.height);
  layouts.push({size,available,overflow});
 }
 await page.setViewportSize({width:1280,height:800});
 const screenshot=process.env.SC2_ZSW_SCREEN;
 if(screenshot)await page.screenshot({path:screenshot});
 const chosen=await nodes.first().getAttribute('data-node');
 await nodes.first().click();
 await page.waitForFunction(id=>(window as any).__SC2_REPORT__().zergSwarm?.ranks[id!]===1,chosen);
 await settings();
 await page.locator('[data-action=save-now]').click();
 await page.waitForFunction(()=>{const r=(window as any).__SC2_REPORT__().save;return !r.busy&&r.message.includes('已保存');});
 const saving=page.waitForEvent('download');
 await page.locator('[data-action=save-export]').click();
 const written=await fs.readFile((await(await saving).path())!);
 console.log('已通过正式商店购买和免费节点领取，检查导出档');
 const persisted=readArchive(written.toString()).bundle.run!;
 assert.equal(persisted.state.expedition.build!.main,'zerg-swarm');
 assert.equal(persisted.state.expedition.zergSwarm!.ranks['ZSW-W02'],1);
 await load(written);
 assert.equal((await read()).stage,3);
 await page.locator('[data-action=skip]:visible').first().click();
 await ready();
 const pause=page.locator('.pause-actions [data-action=pause]:visible');
 if(await pause.count())await pause.click();
 await page.waitForFunction(()=>{const r=(window as any).__SC2_REPORT__();return r.phase==='battle'&&r.stage===4&&r.zergSwarm?.active>=4;},null,{timeout:100000,polling:300});
 const result=await read();
 if(screenshot)await page.screenshot({path:screenshot.replace(/\.png$/,'-battle.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(result.errors,[]);
 console.log(JSON.stringify({build:release.appBuildId,schema:release.runSchema,packedWorker:release.packedWorker??null,choice:chosen,layouts,restored:true,stage:result.stage,reported:result.zergSwarm,pageErrors:errors,reportErrors:result.errors}));
}catch(error){
 const r=await read().catch(()=>null);
 console.error(JSON.stringify({phase:r?.phase,stage:r?.stage,load:r?.readiness,swarm:r?.zergSwarm,save:r?.save,alerts:await page.locator('[role=alert]:visible').allTextContents().catch(()=>[]),errors}));
 throw error;
}finally{
 await browser.close();
 await app.close();
}
