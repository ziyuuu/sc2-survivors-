import fs from 'node:fs';import assert from 'node:assert/strict';
import {growthRuntime} from './lib/g03-growth-runtime.mts';
import {consumptionController as r3} from './lib/g03-consumption-controller-r3.mts';
import {consumptionController as r4} from './lib/g03-consumption-controller-r4.mts';
import {tickNativeMode} from '../src/simulation/combat/expedition-combat';
const r=await growthRuntime('after'),rows:any[]=[];
for(const [version,controller] of [['r3',r3],['r4',r4]] as const){
 const w=new r.World({race:'zerg',seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:r.newEquipmentAccount(529)}),p=controller(w,r,'zerg');p.initialize();w.start();
 const pod=w.trySpawnPod('roach',{x:15,z:0},0,1,true);assert(pod);w.anchor.x=pod.x;w.anchor.z=pod.z;
 const u=w.addUnit('lurker','terran',pod.x-2,pod.z),enemy=w.addUnit('roach','zerg',pod.x+3,pod.z);enemy.hp=enemy.maxHp=100000;pod.guardianIds.add(enemy.id);
 assert(w.setFamilyMode('lurker','lurker'));tickNativeMode(w,u);w.time=5;tickNativeMode(w,u);assert.equal(u.nativeMode??u.unitType,'lurker');
 const handled=p.protectDelivery(),desired=u.desiredNativeMode;tickNativeMode(w,u);w.time=10;tickNativeMode(w,u);
 const canFire=w.canFireAt(u,enemy,0);rows.push({version,handled,desired,mode:u.nativeMode,canFire,events:p.events});assert(handled);assert.equal(canFire,version==='r4');
}
for(const race of ['terran','protoss']){
 const results=[];for(const controller of [r3,r4]){const w=new r.World({race,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:r.newEquipmentAccount(529)}),p=controller(w,r,race);p.initialize();w.start();const pod=w.trySpawnPod(race==='terran'?'marine':'zealot',{x:15,z:0},0,1,true);assert(pod);p.protectDelivery();results.push({order:w.order,wallet:w.wallet,rng:w.rngState,events:p.events});}
 assert.deepEqual(results[0],results[1]);rows.push({race,unchanged:true});
}
fs.writeFileSync('reports/local/g03-farm-minor-20261023/lurker-mode-red-green.json',JSON.stringify({fixture:'Controlled visible carrier, nearby enemy and native unburrow/burrow transitions; explicit initial coordinates and native clock advancement. Not a campaign result.',rows},null,2));console.log(JSON.stringify(rows.map(({events,...r})=>r)));
