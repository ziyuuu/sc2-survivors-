import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment,equip,itemsAt,BACKPACK_CAPACITY} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {beginSpecialStage,markSpecialReady,quitSpecialStage,finishSpecialStage,specialAfterStep} from '../src/simulation/special-stages/runtime';
import {collectSpecialRewards} from '../src/simulation/special-stages/rewards';
import {createPair,tickBroods} from '../src/simulation/zerg-brood';
import {tickEquipmentLife} from '../src/simulation/starship/lifecycle';
import {crossingCounts} from '../src/simulation/special-stages/crossing';
import type {Difficulty} from '../src/data/stages';
import type {Race} from '../src/data/races';
const difficulties:Difficulty[]=['easy','normal','hard','hell'],races:Race[]=['terran','zerg','protoss'];
function fixture(race:Race='terran',difficulty:Difficulty='hard',stage=4){
 const account=newEquipmentAccount();const quality=difficulties.indexOf(difficulty)+1;
 for(const [i,slot] of ATTRIBUTE_SLOTS.entries()){
  const got=grantEquipment(account,{template:'attribute.'+quality,slot,race},'matrix:'+i,{kind:'warehouse'});assert.ok(got.ok);if(got.ok)assert.ok(equip(account,race,got.value.id,slot).ok);
 }
 const initial=race==='terran'?['marine','marauder','reaper','hellion'] as const:race==='zerg'?['zergling','roach','hydralisk','queen'] as const:['zealot','stalker','adept','sentry'] as const;
 const w=new World({seed:529,sandbox:true,waves:false,race,difficulty,terrain:new FlatTerrain(),obstacles:[],initial:[...initial],equipmentAccount:account});w.start();w.stage=stage;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;
}
function begin(w:World,kind:Parameters<typeof beginSpecialStage>[1]){assert.ok(beginSpecialStage(w,kind,'fixture'));assert.ok(markSpecialReady(w));return w.specialStages.active!;}
for(const difficulty of difficulties)for(const race of races)test(`${race}/${difficulty}: arena tier guard or three legal chapters with real equipment`,()=>{
 for(const [stage,count] of [[4,7],[10,10],[16,12]]){
  const w=fixture(race,difficulty,stage);if(difficulty==='easy'||difficulty==='normal'){assert.equal(beginSpecialStage(w,'arena','fixture'),false);assert.equal(w.specialStages.used.size,0);continue;}const a=begin(w,'arena'),parents=[...w.entities.values()].filter(u=>a.enemies.includes(u.id));
  assert.equal(parents.length,count);assert.ok(parents.some(u=>u.arenaHero));assert.ok(w.starship.account.equipped[race]);
  w.advance(1);for(const u of w.entities.values())for(const v of [u.x,u.z,u.hp,u.maxHp,u.armor,u.weaponDamage,u.attackPeriod])assert.ok(Number.isFinite(v));
  assert.equal(w.heroCasts.length,0);assert.ok(w.entities.size<300);finishSpecialStage(w,'timeout');
 }
});
test('crossing native movement lets every body, including a slow medic, reach the full route exit',()=>{
 const w=fixture();w.addUnit('medivac','terran',0,0);const a=begin(w,'crossing');a.nextSwarm=Infinity;w.issueMove({x:0,z:-51});
 for(let i=0;i<12000&&a.phase==='active';i++)w.step();
 assert.equal(a.phase,'loot',JSON.stringify({anchor:w.anchor,escaped:[...a.escaped],bodies:w.allies().map(u=>({id:u.id,type:u.unitType,x:u.x,z:u.z,action:u.action,speed:u.moveSpeed}))}));assert.equal(a.escaped.size,a.participants.length);assert.ok([...a.evacuated.values()].some(u=>u.unitType==='medivac'));assert.ok([...a.evacuated.values()].every(u=>u.z<=-47.25));
});
test('crossing keeps an evacuated twin alive for native regrowth and waits for the replacement body',()=>{
 const w=fixture('zerg');w.entities.clear();w.expedition.zerglingPairs=[];createPair(w,{x:0,z:0},2);const a=begin(w,'crossing');a.nextSwarm=Infinity;
 const p=w.expedition.zerglingPairs[0],[first,second]=p.members.map(id=>w.entities.get(id)!);
 w.hit(second,1e9,[],1,'zerg',0,1,undefined,false);assert.equal(second.hp,0);
 first.z=-48;specialAfterStep(w);assert.equal(a.phase,'active');assert.equal(a.escaped.size,1);assert.equal(crossingCounts(w).pending,true);
 w.tick=p.regrowAt!;w.time=w.tick/60;tickEquipmentLife(w);tickBroods(w);
 const born=w.allies().find(u=>u.id!==first.id)!;assert.ok(born);assert.equal(p.members.length,2);assert.ok(p.members.includes(first.id));
 tickEquipmentLife(w);
 born.z=-40;specialAfterStep(w);assert.equal(a.phase,'active');born.z=-48;specialAfterStep(w);assert.equal(a.phase,'loot');assert.equal(a.escaped.size,2);
 collectSpecialRewards(w);quitSpecialStage(w);assert.equal(w.allies().length,2);assert.ok(w.expedition.zerglingPairs[0].members.includes(born.id));
});
test('crossing full backpack retains all three reward items until the player creates space',()=>{
 const w=fixture(),a=begin(w,'crossing');
 for(let i=0;i<BACKPACK_CAPACITY;i++){const got=grantEquipment(w.starship.account,{template:'attribute.1',slot:'offense1',race:'terran'},'full:'+i,{kind:'backpack',run:w.runId!});assert.ok(got.ok);}
 for(const id of a.participants)w.entities.get(id)!.z=-48;specialAfterStep(w);collectSpecialRewards(w);
 assert.equal(itemsAt(w.starship.account,'backpack').length,BACKPACK_CAPACITY);assert.equal(a.rewardIds.filter(id=>w.starship.account.locations[id].kind==='ground').length,3);assert.equal(quitSpecialStage(w),false);
});
test('resource payout carries exact pickup ledger and original actor generation back to frozen time',()=>{
 const w=fixture();w.advance(2);const actor=w.allies()[0],generation=actor.bornAt,original=w.time,before=w.economyTotals.drops.minerals;
 const a=begin(w,'resources'),b=[...a.resources.values()].find(r=>r.kind==='mineral')!;Object.assign(w.anchor,{x:b.x,z:b.z});w.hit(b,1e9);w.advance(1);
 const amount=w.economyTotals.drops.minerals;assert.ok(amount>0);finishSpecialStage(w,'timeout');
 assert.equal(w.time,original);assert.equal(actor.bornAt,generation);assert.equal(w.economyTotals.drops.minerals,before+amount);
});
test('resource and arena true wipe ends the expedition, dodge losses never cause actual deaths',()=>{
 for(const kind of ['resources','arena'] as const){const w=fixture(),a=begin(w,kind);for(const id of a.participants)w.hit(w.entities.get(id)!,1e12,[],1,'zerg',0,1,undefined,true);specialAfterStep(w);assert.equal(w.phase,'lost');assert.ok(w.starship.account.run?.ended);}
 const w=fixture();const ids=w.allies().map(u=>u.id);begin(w,'dodge');finishSpecialStage(w,'timeout');assert.equal(w.phase,'battle');assert.ok(ids.every(id=>w.entities.get(id)!.hp>0));
});
