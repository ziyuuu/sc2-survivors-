import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {tickWeaponAreas} from '../src/simulation/combat/weapon-patterns';
import {fireInterceptor,initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';
import {MVP_TALENTS,allocationCost,allocationPoints} from '../src/data/mvp-talents';

function world(race:'terran'|'zerg'|'protoss'){
 const w=new World({race,waves:false,sandbox:true,terrain:false,obstacles:[],seed:24});
 w.start();w.entities.clear();return w;
}
function durable<T extends {hp:number;maxHp:number;armor:number;unitRadius:number}>(target:T){target.hp=target.maxHp=1000;target.armor=0;target.unitRadius=.1;return target;}
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

test('M07 Lurker spike line persists one direct duplicate for its original visible target only',()=>{
 const w=world('zerg'),levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race==='zerg'&&node.line==='micro').map(node=>[node.id,node.maxRank]));
 Object.assign(w.runConfig!.frozenTalents,{levels,allocated:allocationPoints(levels),investment:allocationCost(levels)});
 const lurker=w.addUnit('lurker','terran',0,0),primary=durable(w.addUnit('roach','zerg',3,0)),secondary=durable(w.addUnit('roach','zerg',3,.25));
 lurker.nativeMode='lurker_burrowed';w.refreshStats(lurker);w.fire(lurker,primary);
 assert.equal(w.expedition.weaponAreas.length,1);const snapshot=w.captureRun();
 const restored=world('zerg');restored.restoreRun(snapshot);restored.paused=false;
 for(let i=0;i<60;i++){restored.time+=1/60;tickWeaponAreas(restored);}
 const a=restored.entities.get(primary.id)!,b=restored.entities.get(secondary.id)!;
 near(1000-a.hp,2*(1000-b.hp));assert.equal(restored.expedition.weaponAreas.length,0);
});

test('M07 Colossus adds one direct package for the whole two-sweep cycle, never another line',()=>{
 const w=world('protoss');w.runConfig!.frozenTalents.levels={'P-M07':1};
 const colossus=w.addUnit('colossus','terran',0,0),primary=durable(w.addUnit('roach','zerg',5,0)),secondary=durable(w.addUnit('roach','zerg',5,.2));
 w.fire(colossus,primary);assert.equal(w.expedition.weaponAreas.length,2);
 for(let i=0;i<60;i++){w.time+=1/60;tickWeaponAreas(w);}
 near(1000-primary.hp,2*(1000-secondary.hp));assert.equal(w.expedition.weaponAreas.length,0);
});

test('M07 multi-barrel and interceptor attacks append one armor-resolved direct package',()=>{
 const w=world('protoss');w.runConfig!.frozenTalents.levels={'P-M07':1};
 const carrier=w.addUnit('carrier','terran',0,0);initializeCarrierSubsystem(w);const child=ownedInterceptors(w,carrier.id)[0];
 const target=durable(w.addUnit('roach','zerg',1,0));target.armor=1;
 assert.equal(fireInterceptor(w,child,target),true);
 near(1000-target.hp,(child.weaponDamage-1)*2+(child.weaponDamage*2-1));
 assert.equal(w.stats.shots,1);
});

test('an interceptor attack keeps permanent mother reward identity after mother loss without awarding a dead rank',()=>{
 const w=world('protoss');w.runConfig!.frozenTalents.levels={'P-R14':2,'P-A02':3};
 const carrier=w.addUnit('carrier','terran',0,0);initializeCarrierSubsystem(w);const child=ownedInterceptors(w,carrier.id)[0];
 const decoy=durable(w.addUnit('roach','zerg',1,0));fireInterceptor(w,child,decoy);
 assert.equal(child.rewardOwnerId,carrier.id);assert.equal(child.rewardOwnerGeneration,carrier.bornAt);assert.equal(child.rewardSourceKind,'ordinary');
 const rank=carrier.rank;carrier.hp=0;
 const enemy=durable(w.addUnit('roach','zerg',1,1));
 w.random=()=>0;(w as unknown as {rollTalentLoot:()=>number}).rollTalentLoot=()=>0;w.hit(enemy,2000,[],1,'terran',0,1,child.id);
 assert.equal(carrier.rank,rank);assert.equal(w.rewardDrops.filter(drop=>drop.talentLoot).length,2);
});

test('temporary carrier ancestry cannot produce qualified loot through its interceptor',()=>{
 const w=world('protoss');w.runConfig!.frozenTalents.levels={'P-R14':2};
 const carrier=w.addUnit('carrier','terran',0,0);carrier.temporary=true;initializeCarrierSubsystem(w);const child=ownedInterceptors(w,carrier.id)[0];
 const decoy=durable(w.addUnit('roach','zerg',1,0));fireInterceptor(w,child,decoy);
 const enemy=durable(w.addUnit('roach','zerg',1,1));w.random=()=>0;w.hit(enemy,2000,[],1,'terran',0,1,child.id);
 assert.equal(child.rewardSourceKind,'temporary');assert.equal(w.rewardDrops.filter(drop=>drop.talentLoot).length,0);
});
