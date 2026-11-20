import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,type Page} from '@playwright/test';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {SC2_UNITS} from '../src/data/sc2-units';
import {familyLine} from '../src/data/expedition-buildings';
import {ZERG_SIX,ZERG_SIX_PRODUCTION,type ZergSixFamily} from '../src/data/zerg-six';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {startQaReleaseServer} from './qa-release-server.mjs';

const root=path.resolve(process.env.SC2_ZERG_WEB??'dist/zerg-six-campaign-qa');
const release=JSON.parse(await fs.readFile(path.join(root,'web-release.json'),'utf8'));
const selected=process.env.SC2_QA_FAMILIES?.split(',');
const families=ZERG_SIX.filter(f=>!selected||selected.includes(f));
assert.ok(families.length);
const server=await startQaReleaseServer(root);
const url=server.url;
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:true});
await context.addInitScript(() => {
 const state=window as any,draw=CanvasRenderingContext2D.prototype.fillText;
 state.carrierMarkers={};
 // Observe the real minimap drawing. The game still receives a normal mouse command.
 CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth?){
  if(this.canvas.id==='minimap-canvas'&&text.includes('×'))state.carrierMarkers[text.split('×')[0]]={x:x/this.canvas.width,y:y/this.canvas.height};
  return maxWidth===undefined?draw.call(this,text,x,y):draw.call(this,text,x,y,maxWidth);
 };
 const frame=window.requestAnimationFrame.bind(window),origin=performance.now();
 // Advance only the animation clock so real fixed-step work executes faster during QA.
 window.requestAnimationFrame=callback=>frame(now=>callback(origin+(now-origin)*3));
});
const page=await context.newPage();
page.setDefaultTimeout(45000);
const failures:string[]=[];
page.on('pageerror',e=>failures.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))failures.push(r.status()+' '+r.url());});
const read=()=>page.evaluate(()=>(window as any).__SC2_REPORT__());

function fixture(family:ZergSixFamily){
 const w=new World({race:'zerg',seed:201120,waves:false,terrain:campaignTerrain(chooseCampaignMap(201120))});
 w.starship.enabled=true;
 if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 assert.ok(w.start());
 w.missions.enabled=w.encounters.enabled=false;
 w.expedition.ledger=[];w.pods=[];
 const group=w.expedition.building!.groups[0],line=familyLine(family);
 group.directions=line==='zerg.air'?['ground','air']:['ground'];
 group.outputs=[];group.enabled=true;
 for(const f of line==='zerg.air'?['mutalisk','corruptor']:['hydralisk','ravager'])w.expedition.tech['unlock.'+f]=1;
 if(!w.expedition.tech['unlock.hydralisk'])w.expedition.tech['unlock.hydralisk']=1;
 w.expedition.familySlots.push('hydralisk');
 for(const x of [-1.5,0,1.5])w.addFamilyMember('hydralisk',{x:w.anchor.x+x,z:w.anchor.z+2},5);
 for(const u of w.allies()){u.rank=5;w.refreshStats(u,true);}
 w.stage=ZERG_SIX_PRODUCTION[family].firstBattle-1;
 w.endStage();
 assert.ok(w.setDevelopmentTarget('unlock.'+family));
 const b=w.expedition.building!;b.offers={};b.quotes={};
 w.generateDevelopmentOffers(w.draftWindowKey);
 assert.ok(w.setDevelopmentDirection(line));
 for(let retry=0;retry<8&&!w.rewards.some(r=>r.value==='unlock.'+family);retry++){
  w.expedition.bonusRefreshRemaining=1;
  assert.ok(w.refreshOffers());
 }
 const offer=w.rewards.find(r=>r.value==='unlock.'+family);
 assert.ok(offer);
 w.wallet.minerals=w.wallet.gas=0;
 assert.ok(!w.expedition.familySlots.includes(family)&&!w.expedition.tech['unlock.'+family]);
 const archive=writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun(),equipment:w.starship.account});
 return {archive,offerId:offer.offerId};
}

async function settings(p:Page){
 if(!await p.locator('[data-action=settings]:visible').count())await p.locator('[data-action=pause]:visible').first().click();
 await p.locator('[data-action=settings]:visible').first().click();
 await p.locator('[data-action=settings-tab][data-tab=saves]').click();
}
async function ready(){
 await page.waitForFunction(()=>{const r=(window as any).__SC2_REPORT__?.();return r?.readiness.phase==='ready'||r?.readiness.phase==='error'||r?.phase==='battle'&&!r.readiness.kind&&r.assetsReady;},null,{timeout:240000,polling:350});
 const r=await read();
 assert.notEqual(r.readiness.phase,'error',JSON.stringify(r.readiness));
 if(await page.locator('[data-action=flow-continue]:visible').count())await page.locator('[data-action=flow-continue]:visible').click();
}
async function loadArchive(archive:Buffer,name:string){
 await page.goto(url);
 await page.waitForFunction(()=>(window as any).__SC2_REPORT__?.().phase==='menu',null,{timeout:180000});
 assert.equal(await page.locator('meta[name=sc2-app-build]').getAttribute('content'),release.appBuildId);
 await settings(page);
 const picker=page.waitForEvent('filechooser');
 await page.locator('[data-action=menu-load-file]').click();
 await (await picker).setFiles({name,mimeType:'application/json',buffer:archive});
 await ready();
}

try{
 for(const family of families){
  const {archive,offerId}=fixture(family);
  console.log(family+' · 读取解锁前的关间检查点');
  await loadArchive(Buffer.from(archive),family+'.json');
  await page.locator('[data-action=development-purchase][data-id="'+offerId+'"]').click();
  const purchased=await read();assert.deepEqual(purchased.wallet,{minerals:0,gas:0});
  if(purchased.phase==='reward')await page.locator('[data-action=skip]:visible').first().click();
  await ready();
  const paused=page.locator('.pause-actions [data-action=pause]:visible');
  if(await paused.count())await paused.click();
  const stage=ZERG_SIX_PRODUCTION[family].firstBattle;
  await page.waitForFunction(stage=>{const r=(window as any).__SC2_REPORT__();return r.phase==='battle'&&r.stage===stage&&r.stats.produced>0;},stage,{timeout:250000,polling:300});
  console.log(family+' · 真实训练完成，点小地图接应运输');
  const minimap=page.locator('#minimap-canvas');
  const marker=()=>page.evaluate(key=>(window as any).carrierMarkers[key]??null,SC2_UNITS[family].zh[0]);
  let at=await marker();
  for(let retry=0;!at&&retry<16;retry++){await page.waitForTimeout(200);at=await marker();}
  assert.ok(at,await minimap.getAttribute('title')??'没有运输标记');
  const bounds=await minimap.boundingBox();
  assert.ok(bounds);
  await minimap.click({button:'right',position:{x:at.x*bounds.width,y:at.y*bounds.height}});
  await page.waitForFunction(()=>((window as any).__SC2_REPORT__().order?.kind==='move'),null,{timeout:14000});
  await page.waitForFunction(f=>{const r=(window as any).__SC2_REPORT__();return r.expedition.families.includes(f);},family,{timeout:125000,polling:300});
  const live=await read();assert.deepEqual(live.errors,[]);assert.deepEqual(live.audio.errors,[]);
  console.log(family+' · 入编成功，等待真实关间检查点');
  await page.waitForFunction(stage=>{const r=(window as any).__SC2_REPORT__();return r.phase==='reward'&&r.stage===stage;},stage,{timeout:275000,polling:300});
  await settings(page);
  await page.locator('[data-action=save-now]').click();
  await page.waitForFunction(()=>{const s=(window as any).__SC2_REPORT__().save;return s.message.includes('已保存')&&!s.busy;});
  const pending=page.waitForEvent('download');
  await page.locator('[data-action=save-export]').click();
  const exported=await fs.readFile((await (await pending).path())!);
  const saved=readArchive(exported.toString()).bundle.run!;
  assert.equal(saved.state.expedition.tech['unlock.'+family],1);
  const actual=[...saved.state.entities.values()].find(u=>u.owner==='terran'&&u.unitType===family&&u.hp>0&&!u.temporary);
  assert.ok(actual);
  assert.ok(saved.state.expedition.ledger.some(j=>j.family===family&&j.passengers.some(p=>p.status==='released'&&p.entityId===actual.id&&p.paid.minerals+p.paid.gas===0)));
  await loadArchive(exported,'saved-'+family+'.json');
  const restored=await read();
  assert.equal(restored.stage,stage);
  assert.equal(restored.phase,'reward');
  assert.ok(restored.expedition.families.includes(family));
  for(let round=0;round<2&&(await read()).phase==='reward';round++)await page.locator('[data-action=skip]:visible').first().click();
  await ready();
  assert.equal((await read()).stage,stage+1);
  console.log(JSON.stringify({build:release.appBuildId,family,stage,body:actual.id,produced:live.stats.produced,damage:live.stats.damage,restored:true}));
 }
 assert.deepEqual(failures,[]);
}catch(error){
 const r=await read().catch(()=>null);
 console.log(JSON.stringify({phase:r?.phase,stage:r?.stage,time:r?.time,stats:r?.stats,error:r?.readiness,order:r?.order,minimap:await page.locator('#minimap-canvas').getAttribute('title',{timeout:3000}).catch(()=>null)}));
 throw error;
}finally {await browser.close();await server.close();}
