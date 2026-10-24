import fs from 'node:fs';import assert from 'node:assert/strict';
import {growthRuntime} from './lib/g03-growth-runtime.mts';
import {consumptionController as oldPolicy} from './lib/g03-consumption-controller-r2.mts';
import {consumptionController as newPolicy} from './lib/g03-consumption-controller-r3.mts';
import {distance} from './lib/g03-economy-runtime-tier-objectives-r2.mts';
const r=await growthRuntime('after'),rows:any[]=[],out='reports/local/g03-farm-minor-20261023';
const world=(race='protoss')=>new r.World({race,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:r.newEquipmentAccount(529)});
const check=(name:string,fn:()=>any)=>{try{const evidence=fn();rows.push({name,pass:true,evidence});console.log('PASS '+name);}catch(e){rows.push({name,pass:false,error:String(e instanceof Error?e.stack:e)});console.log('FAIL '+name+': '+e);}};
check('209 mineral early budget: old reserve blocks adept, revised policy buys native unlock',()=>{
 const results:any[]=[];for(const [name,controller] of [['old',oldPolicy],['revised',newPolicy]] as const){const w=world(),p=controller(w,r,'protoss',{advance:false});p.initialize();w.start();w.endStage();w.wallet.minerals=209;w.wallet.gas=75;const keep=p.reserve();p.development(keep);results.push({name,keep,tech:{...w.expedition.tech},wallet:{...w.wallet},events:p.events});}
 assert.equal(results[0].tech['unlock.adept']??0,0);assert.equal(results[1].tech['unlock.adept'],1);assert.equal(results[1].wallet.minerals,109);return results;
});
check('newly unlocked early fighter is selected while fewer than four fighters remain',()=>{
 const w=world(),p=newPolicy(w,r,'protoss',{advance:false});p.initialize();w.start();w.endStage();w.wallet.minerals=209;w.wallet.gas=75;p.development(p.reserve());p.configure();assert(w.expedition.production.gateway.outputs.includes('adept'));return {units:w.allies().map((u:any)=>u.unitType),production:w.expedition.production,events:p.events};
});
check('unfinished essential development defers optional fun-shop spending',()=>{
 const w=world(),p=newPolicy(w,r,'protoss',{advance:false});p.initialize();w.start();assert.equal(p.score({expeditionEffect:{kind:'funShop'}}),0);return {priority:0,tech:w.expedition.tech};
});
for(const race of ['terran','zerg','protoss'])check(race+' visible falling carrier receives a native protective move',()=>{
 const w=world(race),p=newPolicy(w,r,race);p.initialize();w.start();const family=race==='terran'?'marine':race==='zerg'?'zergling':'zealot',pod=w.trySpawnPod(family,{x:15,z:0},0,1,true);assert(pod);const before={hp:pod.hp,status:pod.status,passengers:structuredClone(pod.passengers)},rng=w.rngState;assert.equal(p.protectDelivery(),true);assert(w.order);assert(distance(w.order.point,pod)<2.1);assert.equal(w.rngState,rng);assert.deepEqual({hp:pod.hp,status:pod.status,passengers:pod.passengers},before);return {before,order:w.order,events:p.events};
});
check('mandatory final stage retains objective priority instead of protecting a carrier',()=>{
 const w=world(),p=newPolicy(w,r,'protoss');p.initialize();w.start();w.stage=18;const pod=w.trySpawnPod('zealot',{x:15,z:0},0,1,true);assert(pod);assert.equal(p.protectDelivery(),false);return {stage:w.stage,order:w.order};
});
const label=process.argv[2]??'r1';fs.writeFileSync(out+'/strategy-probes-'+label+'.json',JSON.stringify({fixture:'Controlled windows and carrier fixtures; explicit wallet/stage fixture setup. No natural probability or continuous-campaign claim.',rows},null,2));assert(rows.every(r=>r.pass));
