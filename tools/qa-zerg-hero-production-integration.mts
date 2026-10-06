import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createGameServer} from './coze-web-server.mjs';
import {World} from '../src/simulation/world';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {encodeGraph} from '../src/persistence/graph-codec';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {tickHeroAttacks} from '../src/simulation/combat/hero-attack-upgrades';
import {pairBodies} from '../src/simulation/zerg-brood';
import {HEROES,type HeroId} from '../src/data/heroes';
import {HERO_GROUND_AURAS} from '../src/data/hero-upgrades';
import type {Entity} from '../src/simulation/types';

const out=process.env.QA_OUT??'reports/local/hero-aura-correction-20261005/production-heroes';
await fs.mkdir(out,{recursive:true});
const groups:HeroId[][]=[['kerrigan','zagara','dehaka'],['stukov','niadra','hots_leviathan']];
function advanceCommitted(w:World,ticks:number){
 for(let i=0;i<ticks;i++){w.time+=1/60;w.tick++;resolveExpeditionHeroCasts(w);tickHeroAttacks(w);}
}
function fixture(heroes:HeroId[]){
 const w=new World({race:'zerg',seed:10506,waves:false,terrain:campaignTerrain(chooseCampaignMap(10506))});
 w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.pickups=[];w.rewardDrops=[];w.time=10;w.tick=600;
 for(const p of Object.values(w.expedition.production))p.enabled={};
 const enemies=new Map<HeroId,Entity>();
 for(const id of heroes){
  assert.ok(w.acquireHero(id));const u=w.heroEntity(id)!;u.rank=5;w.heroes.get(id)!.rank=5;w.refreshStats(u,true);
  const melee=id==='kerrigan'||id==='dehaka',p=w.freePosition('roach',u,melee?1.55:3.5,melee?2.6:5);
  assert.ok(p,'legal diagnostic target for '+id);const e=w.addUnit('roach','zerg',p.x,p.z);e.hp=e.maxHp=2e6;e.armor=0;e.stoppedUntil=1e9;e.specialReady=1e9;e.moveSpeed=0;enemies.set(id,e);
 }
 w.hash.rebuild(w.entities.values());
 if(heroes.includes('dehaka')){
  assert.ok(w.castHero('dehaka'));advanceCommitted(w,22);
  assert.ok(w.heroEntity('dehaka')!.zergCombat!.reserve>0);
 }
 let revivedIds:number[]=[];
 if(heroes.includes('niadra')){
  w.expedition.familySlots=['roach','hydralisk','zergling'];const ni=w.heroEntity('niadra')!;
  for(let i=0;i<5;i++){
   const family=i<4?'roach':'hydralisk',p=w.freePosition(family,ni,1.1,5.5);assert.ok(p,'legal revival roster point');
   const a=w.addUnit(family,'terran',p.x,p.z,3);a.stoppedUntil=1e9;
  }
  const p=w.freePosition('zergling',ni,1,4);assert.ok(p);
  const first=w.addFamilyMember('zergling',p,3),pair=w.expedition.zerglingPairs.find(p=>p.id===first.pairId)!;
  const bodies=pairBodies(w,pair);assert.equal(bodies.length,2);
  for(const a of bodies)a.stoppedUntil=1e9;
  w.hash.rebuild(w.entities.values());
  assert.ok(w.castHero('stukov'));advanceCommitted(w,18);
  w.fire(w.heroEntity('stukov')!,enemies.get('stukov')!);advanceCommitted(w,18);
  assert.ok(w.zergHeroes.infections.length>0);
  assert.ok(w.heroCasts.some(c=>c.hero==='stukov'&&c.phase==='dot'));
  assert.ok(w.castHero('niadra'));assert.ok(w.castHero('hots_leviathan'));
  const receipt=w.zergHeroes.revivals[0];assert.ok(receipt.seats.some(s=>s.pairId===pair.id&&s.members.length===2));
  revivedIds=bodies.map(b=>b.id);
  for(const a of bodies)w.hit(a,a.hp+a.armor+1,[],1,'zerg',0,1,enemies.get('niadra')!.id);
  assert.ok(receipt.seats.some(s=>s.pairId===pair.id&&s.deadAt!==null));
 }
 for(const id of heroes){
  const u=w.heroEntity(id)!;w.fire(u,enemies.get(id)!);
  if(id==='kerrigan'||id==='zagara')assert.ok(w.castHero(id));
  u.stoppedUntil=1e9;
 }
 w.time+=3/60;w.tick+=3;w.paused=true;
 const before=w.captureRun();assert.equal(before.schema,18);assert.ok(before.state.heroAttacks.packets.length>=3);
 return {w,before,revivedIds};
}

const fixtures=[];
for(const heroes of groups){const f=fixture(heroes),file=path.resolve(out,heroes[0]+'.json');await fs.writeFile(file,writeArchive({profile:f.w.permanentProfile.exportJSON(),run:f.before}));fixtures.push({...f,heroes,file});}
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify(fixtures.map(f=>({heroes:f.heroes,file:f.file,packets:f.before.state.heroAttacks.packets.length,revivedIds:f.revivedIds}))));process.exit(0);}

const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
const report:any={method:'Diagnostic archives built by actual World, genuine hero casts/weapon flights and genuine twin deaths. Production file-import UI, three simultaneous heroes, then actual save/export/reload/local-load in isolated browser profiles. No production debug API or live-state mutation. Separate from natural acquisition, campaign, performance and human acceptance.',appBuildId:release.appBuildId,checks:[],errors:[]};
const server=createGameServer({webRoot:path.resolve('dist/web')});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});report.browser=browser.version();let page:any;
const ready=async()=>{await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:240000});const r=await page.evaluate(()=>window.__SC2_REPORT__());assert.equal(r.readiness.phase,'ready',JSON.stringify(r.readiness));};
const exportRun=async()=>{const d=page.waitForEvent('download');await page.locator('[data-action=save-export]').click();return readArchive(await fs.readFile(await(await d).path(),'utf8')).bundle.run!;};
const savedMechanisms=(state:any)=>encodeGraph({heroAttacks:state.heroAttacks,heroCasts:state.heroCasts,zergHeroes:state.zergHeroes,combat:[...state.entities.values()].filter((u:Entity)=>u.heroId).map((u:Entity)=>({id:u.id,combat:u.zergCombat})),pairs:state.expedition.zerglingPairs});
try{
 for(const {heroes,before,file,revivedIds} of fixtures){
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});page=await context.newPage();page.on('pageerror',(e:any)=>report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${(server.address() as any).port}/`,{timeout:240000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
  assert.equal(await page.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
  await page.locator('[data-action=menu-load]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await chooser).setFiles(file);await page.locator('[data-action=menu-load-ready]').click();await ready();await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
  const restored=await exportRun();assert.equal(restored.schema,18);assert.deepEqual(savedMechanisms(restored.state),savedMechanisms(before.state));assert.equal(restored.state.time,before.state.time);assert.equal(restored.state.paused,true);
  const r=await page.evaluate(()=>window.__SC2_REPORT__());assert.ok(r.zergHeroes.ready);assert.equal(r.zergHeroes.auraDisplays,3);assert.equal(r.zergHeroes.auras.textLabels,0);assert.equal(r.confirmedHeroes.auras.heroes,0);assert.deepEqual(r.errors,[]);
  for(const id of heroes)assert.ok(r.zergHeroes.actions[id].attack,'original attack animation '+id);
  await page.screenshot({path:out+'/'+heroes[0]+'-import-paused.png'});
  await page.locator('.end-screen [data-action=pause]').click();await page.waitForFunction(time=>window.__SC2_REPORT__().time>time+1.4,before.state.time,{timeout:30000});await page.screenshot({path:out+'/'+heroes[0]+'.png'});
  await page.locator('[data-seat="hero:0"]').click();const details=await page.locator('#unit-inspector').innerText();assert.ok(details.includes(HEROES[heroes[0]].skill));for(const aura of Object.values(HERO_GROUND_AURAS))assert.ok(!details.includes(aura.name),'aura text visible: '+aura.name);await page.screenshot({path:out+'/'+heroes[0]+'-details.png'});await page.locator('[data-inspect-close]').click();
  await page.locator('#topbar [data-action=pause]').click();await page.locator('[data-action=save-now]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().save.message.includes('已保存'));const after=await exportRun();assert.ok(after.state.stats.damage>before.state.stats.damage);assert.equal(after.schema,18);
  if(revivedIds.length){
   const receipt=after.state.zergHeroes.revivals[0];assert.ok(receipt);assert.equal(receipt.charges,3);
   assert.ok(receipt.seats.some(s=>s.claimed&&s.members.length===2));for(const id of revivedIds)assert.ok(after.state.entities.get(id)!.hp>0,'same body revived '+id);
  }
  await page.reload({timeout:240000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');await page.locator('[data-action=menu-load]').click();await page.locator('[data-action=menu-load-local]').click();await page.locator('[data-action=menu-load-ready]').click();await ready();await page.locator('[data-action=flow-continue]').click();const loaded=await exportRun();
  assert.deepEqual(savedMechanisms(loaded.state),savedMechanisms(after.state));assert.equal(loaded.state.time,after.state.time);assert.equal(loaded.state.paused,true);assert.deepEqual(encodeGraph(loaded.state.wallet),encodeGraph(after.state.wallet));assert.deepEqual(encodeGraph(loaded.state.expedition.ledger),encodeGraph(after.state.expedition.ledger));
  report.checks.push({heroes,schema:loaded.schema,importedPackets:before.state.heroAttacks.packets.length,remainingPackets:loaded.state.heroAttacks.packets.length,pendingCasts:loaded.state.heroCasts.length,infections:loaded.state.zergHeroes.infections.length,revivedIds,revivalCharges:loaded.state.zergHeroes.revivals[0]?.charges??null,damage:after.state.stats.damage-before.state.stats.damage,zergAuraDisplays:3,terranAuraDisplays:0,auraTextVisible:false,actions:r.zergHeroes.actions,saveRestored:true,mechanismsPreserved:true,debugApi:false});
  await context.close();console.log(heroes.join('/')+': production integration passed');
 }
 assert.deepEqual(report.errors,[]);assert.equal(JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')).appBuildId,report.appBuildId);
}catch(e){report.failure=String((e as Error).stack??e);process.exitCode=1;if(page&&!page.isClosed()){report.last=await page.evaluate(()=>window.__SC2_REPORT__?.());await page.screenshot({path:out+'/failure.png'});}}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({checks:report.checks,errors:report.errors,failure:report.failure??null}));}
