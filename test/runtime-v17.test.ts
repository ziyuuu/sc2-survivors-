import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunState} from '../src/simulation/run-state';
import {STAGES,stageConfig,stageSchedule,emptyCounts} from '../src/data/stages';
import {ZERG} from '../src/data/sc2-units';
import {AttackLineCache} from '../src/simulation/combat/attack-lines';
import {EngagementSlots} from '../src/simulation/formation/engagement';
import {unitCallsign,buildingCallsign} from '../src/ui/unit-identity';
import {encode85,decode85} from '../src/assets/base85.mjs';
import {createAssetPack} from '../tools/offline-pack.mjs';
import {restoreAssetPack} from '../src/assets/offline-pack';

const options={seed:2317,waves:false,terrain:false,obstacles:[]} as const;
test('restart replaces all run-owned state, preserving World, terrain settings and subscriptions',()=>{
 const w=new World({...options,obstacles:[]}),fresh=new World({...options,obstacles:[]});
 w.start();w.wallet={minerals:9000,gas:5000};w.addBuilding('factory');w.unlockMarauder();w.upgrades.set('stim',1);
 w.spawnPod('marine',{x:7,z:0});w.spawnEconomic('egg',{x:8,z:0});w.acquireHero('raynor');w.acquireElite('marine.1');
 w.stage=12;w.prepareStage();w.hive!.hp=0;w.endStage();w.startEndless();w.input.x=1;w.paused=true;
 let notifications=0;w.listeners.add(()=>notifications++);const listeners=w.listeners,random=w.random,oldLines=(w as any).attackLines;
 w.resetRun();assert.equal(notifications,1);assert.equal(w.listeners,listeners);assert.equal(w.random,random);
 for(const key of Object.keys(new RunState()))if(key!=='revision'&&key!=='attackLines')assert.deepEqual((w as any)[key],(fresh as any)[key],key);
 assert.notEqual((w as any).attackLines,oldLines);assert.equal(w.enemySpecials.casts.length,0);assert.equal(w.enemySpecials.charges.size,0);
 for(let i=0;i<5;i++){w.start();w.step();w.resetRun();assert.equal(w.allies().length,1);assert.equal(w.buildings.size,1);assert.deepEqual(w.wallet,{minerals:50,gas:0});assert.equal(w.phase,'menu');assert.equal(w.time,0);}
});
test('restart retains chosen difficulty and deterministic seed without stale guardian fractions',()=>{
 const w=new World({...options,obstacles:[],difficulty:'easy'});const first=w.spawnPod('marine',{x:7,z:0}),values=Array.from({length:8},()=>w.random());
 w.resetRun();assert.equal(w.difficulty,'easy');const next=w.spawnPod('marine',{x:7,z:0});assert.deepEqual(next.guardTypes,first.guardTypes);assert.equal(next.number,1);assert.deepEqual(Array.from({length:8},()=>w.random()),values);
 w.setDifficulty('normal');w.resetRun();assert.equal(w.spawnPod('marine',{x:7,z:0}).guardTypes.length,2);
});
test('Normal keeps 90 percent cumulative budgets; Easy remains 50 percent, with fixed rewards and Boss events',()=>{
 const totals=emptyCounts(),normal=emptyCounts(),easy=emptyCounts();
 for(const base of STAGES){const n=stageConfig(base.id,'normal'),e=stageConfig(base.id,'easy');
  for(const type of ZERG){totals[type]+=base.ambient[type];normal[type]+=n.ambient[type];easy[type]+=e.ambient[type];assert.equal(normal[type],Math.round(totals[type]*.9));assert.equal(easy[type],Math.floor(totals[type]*.5));}
  assert.deepEqual(n.reward,base.reward);assert.equal(n.lingHp,base.lingHp);assert.equal(n.durationSeconds,base.durationSeconds);
  const oldBoss=stageSchedule({...base,difficulty:'normal'},5).specials.filter(e=>e.tier==='boss'),newBoss=stageSchedule(n,5).specials.filter(e=>e.tier==='boss');assert.deepEqual(newBoss,oldBoss);
 }
});
test('Normal pod guard scaling carries rounding across landings without halving the first two-ling rescue',()=>{
 const w=new World({...options,obstacles:[]}),total=emptyCounts();let base=emptyCounts();
 for(let i=0;i<40;i++){w.stage=1+Math.floor(i/4);const p=w.spawnPod('marine',{x:8,z:0});for(const t of ZERG){base[t]+=STAGES[w.stage-1].guards[t];total[t]+=p.guardTypes.filter(v=>v===t).length;assert.equal(total[t],Math.round(base[t]*.9));}if(i===0)assert.equal(p.guardTypes.length,2);}
});
test('exact attack-line reuse invalidates for either endpoint, stage, air layer and melee mode',()=>{
 const w=new World({sandbox:true,terrain:false,obstacles:[]}),a=w.allies()[0],b=w.addUnit('roach','zerg',4,0),cache=new AttackLineCache();let calls=0;
 const terrain={lineOfFire:()=>{calls++;return a.x<1;}} as any;
 for(let i=0;i<100;i++)assert.equal(cache.clear(terrain,1,a,b),true);assert.equal(calls,1);
 b.z+=.001;cache.clear(terrain,1,a,b);a.x=1;assert.equal(cache.clear(terrain,1,a,b),false);
 a.flying=true;cache.clear(terrain,1,a,b);a.attackRange=.1;cache.clear(terrain,1,a,b);cache.clear(terrain,2,a,b);assert.equal(calls,6);
});
test('Marauders form separate ranged firing slots instead of converging on the enemy body',()=>{
 const w=new World({sandbox:true,terrain:false,obstacles:[],initial:['marauder','marauder','marauder']}),target=w.addUnit('roach','zerg',8,0),slots=new EngagementSlots();
 const goals=w.allies().map(u=>slots.goal(u,target,w.allies(),w.anchor,0,52,[],undefined,target.id));
 for(const p of goals){const d=Math.hypot(p.x-target.x,p.z-target.z);assert.ok(d>4&&d<7);}
 for(let i=0;i<goals.length;i++)for(let j=i+1;j<goals.length;j++)assert.ok(Math.hypot(goals[i].x-goals[j].x,goals[i].z-goals[j].z)>.8);
});
test('callsigns refer to stable seats and type-local building numbers rather than entity IDs',()=>{
 const w=new World({...options,obstacles:[]});for(let i=0;i<20;i++)w.addUnit('zergling','zerg',i,10);
 const m=w.addUnit('marine','terran',2,0);assert.equal(unitCallsign(m),'陆战队员 · 队伍2');assert.ok(m.id>20);
 w.addBuilding('starport');const f=w.addBuilding('factory');assert.equal(buildingCallsign(w,f),'重工厂1');w.hit(w.allies()[0],1000);assert.equal(unitCallsign(m),'陆战队员 · 队伍2');
});
test('HTML-safe Base85 roundtrips arbitrary data and partial groups without escaping or truncating bytes',()=>{
 let seed=3;for(const size of [0,1,2,3,4,5,127,1024,65539]){const bytes=Uint8Array.from({length:size},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24;});const encoded=encode85(bytes);assert.ok(!/[<>&\\"'/`=]/.test(encoded));assert.equal(encoded.length,Math.ceil(size/4)*5);assert.deepEqual(decode85(encoded,size),bytes);}
 assert.throws(()=>decode85('!!!!!',9));assert.throws(()=>decode85('<<<<<',4));assert.throws(()=>decode85('~~~~~',4));
});
test('offline decoder retains compatibility with version-one Base64 packs',async()=>{
 const bytes=Buffer.from('previous offline pack'),{pack}=createAssetPack([{id:'legacy',mime:'text/plain',bytes}]);pack.version=1;
 for(const c of pack.chunks)c.data=Buffer.from(decode85(c.data,c.storedBytes)).toString('base64');
 const urls=await restoreAssetPack(pack);try{assert.equal(await(await fetch(urls.legacy)).text(),bytes.toString());}finally{URL.revokeObjectURL(urls.legacy);}
});
