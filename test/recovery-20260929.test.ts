import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../src/simulation/world';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import {validCarrierLanding,findCarrierLanding} from '../src/simulation/movement/carrier-landing';
import {enemyRouteGoal} from '../src/simulation/movement/enemy-routes';
import {campaign18StageConfig} from '../src/data/campaign18';
import {endlessConfig} from '../src/data/endless';
import {rollRarity} from '../src/data/rewards';
import {mapReinforcement} from '../src/simulation/expedition-economy';

import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {updateExpeditionProduction} from '../src/simulation/expedition-production';
const make=(race:'terran'|'zerg'|'protoss'='terran')=>{const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();return w;};

test('enemy patrol destinations are dispersed and remember only a visible target position',()=>{
 const w=make(),goals=[];
 for(let i=0;i<5;i++){const e=w.addUnit('zergling','zerg',-12-i,-12);goals.push(enemyRouteGoal(w,e));assert.ok(e.enemyRoute);}
 assert.ok(new Set(goals.map(p=>`${p.x},${p.z}`)).size>=3);assert.ok(goals.every(p=>p.x!==0||p.z!==0));
 const enemy=w.entities.get(2)??[...w.entities.values()].find(u=>u.team==='enemy')!,target=w.allies()[0];target.x=7;target.z=4;
 enemyRouteGoal(w,enemy,target);target.x=25;target.cloaked=true;
 assert.deepEqual(enemyRouteGoal(w,enemy),{x:7,z:4});const copy=make();copy.restoreRun(w.captureRun());assert.deepEqual(copy.entities.get(enemy.id)!.enemyRoute,enemy.enemyRoute);
});

test('all three elite variants coexist; each upgrade changes only its own seat',()=>{
 const w=make();for(const id of ['marine.1','marine.2','marine.3'] as const)assert.ok(w.acquireElite(id));
 assert.equal(w.familyUnits('marine').length,4);assert.ok(w.acquireElite('marine.2'));
 assert.deepEqual(['marine.1','marine.2','marine.3'].map(id=>w.eliteOwned(id as any)!.rank),[1,2,1]);
 const copy=make();copy.restoreRun(w.captureRun());assert.equal(copy.familyUnits('marine').filter(u=>u.eliteId).length,3);
 const gone=w.eliteOwned('marine.2')!;w.hit(gone,1e9,[],1,'zerg');assert.ok(w.acquireElite('marine.2'));assert.equal(w.eliteOwned('marine.2')!.rank,1);
});

test('three elite zergling variants are three shared-rank pairs, not six seats',()=>{
 const w=make('zerg');for(const id of ['zergling.1','zergling.2','zergling.3'] as const)assert.ok(w.acquireElite(id));
 assert.equal(w.familyUnits('zergling').length,4);assert.equal(w.familyBodies('zergling').length,8);
 assert.ok(w.acquireElite('zergling.3'));assert.ok(w.familyBodies('zergling').filter(u=>u.eliteId==='zergling.3').every(u=>u.rank===2));
});

test('physical map rewards have no chapter quota and free hero pickups survive load',()=>{
 const w=make();w.random=()=>.96;const a=mapReinforcement(w),b=mapReinforcement(w);assert.equal(a?.rarity,'blue');assert.equal(b?.rarity,'blue');assert.notEqual(a?.offerId,b?.offerId);
 let seq=[0,.999,.999];w.random=()=>seq.shift()??0;w.tryRewardDrop({x:2,z:2});const drop=w.rewardDrops[0];assert.equal(drop.reward.rarity,'orange');assert.equal(drop.reward.minerals,0);
 const money={...w.wallet};assert.ok(w.collectRewardDrop(drop.id));assert.equal(w.expedition.bossLootOpen,false);
 const copy=make();copy.restoreRun(w.captureRun());assert.equal(copy.expedition.bossLootOpen,false);
 assert.equal(copy.expedition.bossLootQueue.length,0);assert.deepEqual(copy.wallet,money);assert.equal(copy.heroes.size,1);assert.equal(copy.collectRewardDrop(drop.id),false);
});

test('legacy conditional quality probabilities remain exact at boundaries and statistically represented',()=>{
 assert.equal(rollRarity(()=>.84799,true),'white');assert.equal(rollRarity(()=>.848,true),'green');assert.equal(rollRarity(()=>.948,true),'blue');assert.equal(rollRarity(()=>.988,true),'purple');assert.equal(rollRarity(()=>.9981,true),'orange');
 let state=1207;const counts:Record<string,number>={white:0,green:0,blue:0,purple:0,orange:0};
 for(let i=0;i<100000;i++)counts[rollRarity(()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),true)]++;
 for(const [key,p] of Object.entries({white:.848,green:.10,blue:.04,purple:.01,orange:.002}))assert.ok(Math.abs(counts[key]-p*100000)<6*Math.sqrt(100000*p*(1-p)),key);
});

test('carrier HP follows approved stage/round boundaries in every difficulty',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const){
  for(const [stage,hp] of [[7,3600],[9,3600],[10,4800],[15,4800],[16,6000],[18,6000]])assert.equal(campaign18StageConfig(stage,difficulty).podHp,hp);
  for(const [round,hp] of [[1,7200],[2,7200],[3,8400],[4,8400],[5,9600],[20,18000]])assert.equal(endlessConfig(difficulty,round).podHp,hp);
 }
 const w=make(),p=w.spawnPod('marine',{x:8,z:0});p.hp-=100;const hp=p.hp;w.stage=18;const copy=make();copy.restoreRun(w.captureRun());assert.equal(copy.pods[0].hp,hp);
});

test('blocked landing retains the paid order, wallet and reservation until a legal site exists',()=>{
 const w=make();w.expedition.ledger.push({id:1,family:'marine',line:'barracks',facilityIds:[1],remaining:0,state:'awaiting',podId:null,passengers:[{paid:{minerals:50,gas:0},status:'waiting',entityId:null,purpose:'body'}]});
 const saved=structuredClone(w.captureRun());(w as any).spawnCells=[];const money={...w.wallet};updateExpeditionProduction(w,1,false);
 assert.equal(w.expedition.ledger[0].state,'awaiting');assert.equal(w.pods.length,0);assert.deepEqual(w.wallet,money);
 w.restoreRun(saved);w.paused=false;updateExpeditionProduction(w,1,false);assert.equal(w.expedition.ledger[0].state,'risk');assert.equal(w.pods.length,1);updateExpeditionProduction(w,1,false);assert.equal(w.pods.length,1);
});

test('real Kairos narrow edges reject carriers while open pads retain a complete melee ring',()=>{
 const data=JSON.parse(fs.readFileSync('public/assets/map/kairos.json','utf8')),terrain=new MapTerrain(data),w=new World({race:'protoss',waves:false,terrain});w.start();w.stage=18;w.prepareStage();
 const unsafe=w.spawnLocations.filter(p=>terrain.canOccupy(p,1.25)&&!terrain.canOccupy(p,3.2));assert.ok(unsafe.length>0);
 for(const p of unsafe.slice(0,40))assert.equal(validCarrierLanding(w,'zealot',p),false);
 const p=findCarrierLanding(w,'zealot');assert.ok(p,'real map must retain an actual legal delivery site');assert.ok(validCarrierLanding(w,'zealot',p!));
 const pod=w.spawnPod('zealot',p!);assert.equal(validCarrierLanding(w,'zealot',p!),false,'falling pods reserve their site');assert.ok(validCarrierLanding(w,'zealot',pod,pod.id));
});

test('detection is ready at ten seconds, with eight-second stationary fields',()=>{
 const w=make();assert.ok(w.castDetection());assert.equal(w.expedition.detectionReady,10);assert.equal(w.expedition.detectionFields[0].until,8);
 w.time=10-1/60;assert.equal(w.castDetection(),false);w.time=10;assert.ok(w.castDetection());
});

test('actual map drop attempts preserve each source chance independently of legal-pool filtering',()=>{
 for(const [source,drone,tier,chance] of [['regular',false,undefined,.02],['drone',true,undefined,.08],['elite',false,'elite',.4]] as const){
  const w=make();for(let i=0;i<20000;i++){w.tryRewardDrop({x:2,z:2},drone,tier);if(i%100===0)w.rewardDrops=[];}
  const c=w.expedition.mapLootStats[source];assert.equal(c.attempts,20000);assert.equal(c.generated+c.empty,c.triggered);
  assert.ok(Math.abs(c.triggered-20000*chance)<6*Math.sqrt(20000*chance*(1-chance)),source);
  assert.ok(c.generated>20,'map rewards are not capped at one per chapter');
 }
});

test('new route and waiting state reject malformed saves without touching the live run',()=>{
 const w=make(),enemy=w.addUnit('roach','zerg',5,5);enemyRouteGoal(w,enemy);const snapshot=structuredClone(w.captureRun());
 snapshot.state.entities.get(enemy.id)!.enemyRoute!.index=8;const before=w.captureRun();assert.throws(()=>w.restoreRun(snapshot));assert.deepEqual(w.captureRun(),before);
 const invalid=structuredClone(w.captureRun());invalid.state.expedition.pendingFreeDeliveries.push({family:'marine',jobId:77,retryAt:NaN});assert.throws(()=>w.restoreRun(invalid));assert.deepEqual(w.captureRun(),before);
});

test('Nova locked line does not turn toward a moved target or damage structures',()=>{
 const w=make();w.acquireHero('nova');const hero=w.heroEntity('nova')!;hero.x=hero.z=0;
 const target=w.addUnit('roach','zerg',3,0),line=w.addUnit('roach','zerg',6,0);for(const t of [target,line]){t.hp=t.maxHp=5000;t.armor=0;}
 w.hash.rebuild(w.entities.values());assert.ok(w.castHero('nova'));target.z=4;line.cloaked=true;w.hash.rebuild(w.entities.values());w.time=.35;w.tick=21;resolveExpeditionHeroCasts(w);
 assert.equal(target.hp,5000);assert.equal(line.hp,0,'a preselected area can damage cloaked units without revealing them');assert.equal(line.cloaked,true);
});

test('Nova completes one locked penetrating shot against biological, mechanical and air bodies',()=>{
 const w=make();w.acquireHero('nova');const hero=w.heroEntity('nova')!;hero.x=0;hero.z=0;
 const targets=[w.addUnit('roach','zerg',3,0),w.addUnit('immortal','zerg',6,0),w.addUnit('mutalisk','zerg',9,0),w.addUnit('roach','zerg',7,3)];
 for(const t of targets){t.hp=t.maxHp=5000;t.shield=0;t.armor=0;t.weaponDamage=0;t.moveSpeed=0;}
 const building=w.spawnEconomic('egg',{x:11,z:0});building.hp=building.maxHp=5000;
 w.hash.rebuild(w.entities.values());assert.ok(w.castHero('nova'));const snapshot=w.captureRun(),copy=make();copy.restoreRun(snapshot);copy.paused=false;copy.hash.rebuild(copy.entities.values());for(const t of targets){const u=copy.entities.get(t.id)!;u.shield=0;u.barrier=0;u.barrierReady=999;}
 for(let i=0;i<21;i++){copy.tick++;copy.time=copy.tick/60;resolveExpeditionHeroCasts(copy);}
 assert.deepEqual(targets.map(t=>copy.entities.get(t.id)!.hp),[0,0,0,5000]);assert.equal(copy.economicTargets.get(building.id)!.hp,5000);assert.equal(copy.visualEvents.filter(e=>e.kind==='skill-line').length,1);
 resolveExpeditionHeroCasts(copy);assert.equal(copy.entities.get(targets[0].id)!.hp,0);
});


test('pending full-family replacement reserves the choice until committed or canceled',()=>{
 const w=make();for(let i=1;i<5;i++)w.addFamilyMember('marine',{x:i,z:1});
 assert.ok(w.acquireElite('marine.1'));assert.equal(w.canAcquireElite('marine.2'),false);assert.equal(w.acquireElite('marine.2'),false);
 assert.ok(w.cancelPendingEliteChoice('marine.1'));assert.ok(w.acquireElite('marine.2'));assert.ok(w.replaceWithElite('marine.2',w.ordinaryUnits('marine')[0].id));
 assert.ok(w.canAcquireElite('marine.1'));assert.equal(w.familyUnits('marine').length,5);
});
