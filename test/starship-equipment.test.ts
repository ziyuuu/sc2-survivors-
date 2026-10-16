import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {tickHeroAttacks} from '../src/simulation/combat/hero-attack-upgrades';
import {newEquipmentAccount,grantEquipment,equip,unequip,itemsAt,beginEquipmentRun,settleEquipment,cleanseEquipment,dismantleEquipment,expandWarehouse} from '../src/simulation/starship/inventory';
import {itemValues,itemScore,rollScores,identityFactors} from '../src/simulation/starship/attributes';
import {equipmentTotals,tickStarship} from '../src/simulation/starship/runtime';
import type {EquipmentAccount,EquipmentItem,EquipmentSlot,Quality} from '../src/simulation/starship/types';

const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
function item(a:EquipmentAccount,slot:EquipmentSlot,quality:Quality=1,polluted=false){const r=grantEquipment(a,{template:slot.startsWith('offense')||slot.startsWith('defense')?'attribute.'+quality:'module.'+slot+'.'+quality,race:'terran',slot,polluted},'fixture:'+a.serial,{kind:'warehouse'});assert.ok(r.ok);r.value.allocation=2;return r.value;}
function world(a=newEquipmentAccount()){return new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:a});}
function resolve(w:World){for(let i=0;i<120;i++){w.time+=1/60;tickWeaponFlights(w,1/60);tickHeroAttacks(w);}}

test('ship inventory has one owner, exact slot/race checks, atomic full-backpack swaps and stale-command rejection',()=>{
 const a=newEquipmentAccount(),one=item(a,'offense1'),two=item(a,'offense1');assert.ok(equip(a,'terran',one.id,'offense1').ok);
 assert.equal(equip(a,'zerg',two.id,'offense1').ok,false);assert.equal(equip(a,'terran',two.id,'defense1').ok,false);assert.ok(beginEquipmentRun(a,'terran','r1').ok);
 a.locations[two.id]={kind:'backpack',run:'r1'};for(let i=1;i<64;i++){const result=grantEquipment(a,{template:'attribute.1',race:'terran',slot:'offense2'},'bag:'+i,{kind:'backpack',run:'r1'});assert.ok(result.ok);}
 const before=a.revision;assert.ok(equip(a,'terran',two.id,'offense1',before).ok);assert.equal(a.locations[one.id].kind,'backpack');assert.equal(itemsAt(a,'backpack').length,64);
 assert.equal(equip(a,'terran',one.id,'offense1',before).ok,false);assert.equal(unequip(a,'terran','offense1').ok,false);
 const module=grantEquipment(a,{template:'module.gathering.1',race:'terran',slot:'gathering'},'module',{kind:'ground',run:'r1'});assert.ok(module.ok);a.locations[module.value.id]={kind:'backpack',run:'r1'};assert.equal(equip(a,'terran',module.value.id,'gathering').ok,false);
});
test('green scores respect the exact feasible tuple, ordinary pity and full pollution values without consuming pity',()=>{
 for(const count of [1,2,3,4])for(const target of [100,139,140,169,170,189,190,199,200]){const scores=rollScores(count,target,target>=190,()=>.637);assert.equal(scores.reduce((a,b)=>a+b,0),count*target);assert.ok(scores.every(x=>x>=Math.max(target>=190?180:100,target-20)&&x<=Math.min(200,target+20)));}
 const a=newEquipmentAccount(83);for(let i=0;i<70;i++){const gear=item(a,'offense1',4);assert.equal(new Set(gear.affixes.map(x=>x.key)).size,4);assert.ok(itemScore(gear)!>=100&&itemScore(gear)!<=200);assert.ok(a.pity[4]<=18);}
 const prior=a.pity[4],polluted=item(a,'defense1',4,true);assert.equal(itemScore(polluted),200);assert.equal(a.pity[4],prior);assert.equal(equip(a,'terran',polluted.id,'defense1').ok,false);
});
test('cleansing and dismantling pay once, retain rolled values, and warehouse upgrades cost 1000/2000/4000',()=>{
 const a=newEquipmentAccount(),gear=item(a,'offense1',3,true),roll=structuredClone(gear.affixes);a.dust=8000;
 assert.ok(cleanseEquipment(a,gear.id).ok);assert.equal(a.dust,7975);assert.deepEqual(gear.affixes,roll);assert.equal(gear.pollution,'cleansed');assert.equal(cleanseEquipment(a,gear.id).ok,false);
 for(let i=0;i<3;i++){assert.ok(expandWarehouse(a,i).ok);assert.equal(expandWarehouse(a,i).ok,false);}assert.equal(a.dust,975);assert.equal(expandWarehouse(a,3).ok,false);
 assert.ok(dismantleEquipment(a,[gear.id]).ok);assert.equal(a.dust,995);assert.equal(dismantleEquipment(a,[gear.id]).ok,false);
});
test('extraction keeps polluted items, failure loses polluted backpack items, and settlement cannot roll twice',()=>{
 for(const outcome of ['success','failure'] as const){const a=newEquipmentAccount(),equipped=item(a,'offense1'),bag=item(a,'defense1',3,true);assert.ok(equip(a,'terran',equipped.id,'offense1').ok);assert.ok(beginEquipmentRun(a,'terran','run').ok);a.locations[bag.id]={kind:'backpack',run:'run'};
  const first=settleEquipment(a,outcome),snapshot=structuredClone(a);assert.deepEqual(settleEquipment(a,outcome),first);assert.deepEqual(a,snapshot);assert.ok(a.items[equipped.id]);assert.equal(!!a.items[bag.id],outcome==='success');}
});
test('real unit HP/armor and attack cadence change, repeated refresh is stable, and swapping preserves wounds',()=>{
 const a=newEquipmentAccount(),w=world(a),u=w.allies()[0],base={hp:u.maxHp,armor:u.armor,period:u.attackPeriod};u.hp=u.maxHp*.4;
 const defense=item(a,'defense1'),attack=item(a,'offense1');assert.ok(w.equipItem(defense.id,'defense1').ok);assert.ok(w.equipItem(attack.id,'offense1').ok);
 close(u.maxHp,base.hp+15);close(u.hp/u.maxHp,.4);close(u.armor,base.armor+.25);close(u.attackPeriod,base.period/1.01);
 for(let i=0;i<100;i++)w.refreshStats(u);close(u.maxHp,base.hp+15);close(u.hp/u.maxHp,.4);assert.ok(w.unequipItem('defense1').ok);close(u.maxHp,base.hp);close(u.hp/u.maxHp,.4);
});
test('native Marine and multi-hit Reaper attacks receive one fixed DPS budget per actual weapon period',()=>{
 for(const type of ['marine','reaper'] as const){const a=newEquipmentAccount(),w=world(a);const gear=item(a,'offense1');assert.ok(w.equipItem(gear.id,'offense1').ok);assert.ok(w.start());w.entities.clear();const u=w.addUnit(type,'terran',0,0),enemy=w.addUnit('zergling','zerg',0,3);enemy.hp=enemy.maxHp=1e7;enemy.armor=0;u.shotInterval=u.attackPeriod;const original=u.weaponDamage,hits=type==='reaper'?2:1;
  w.fire(u,enemy);resolve(w);close(1e7-enemy.hp,original*hits+2*u.shotInterval);close(u.weaponDamage,original);
 }
});
test('battle rejects attribute changes and a launched real projectile keeps its committed equipment damage',()=>{
 const a=newEquipmentAccount(),w=world(a),gear=item(a,'offense1');assert.ok(w.equipItem(gear.id,'offense1').ok);assert.ok(w.start());w.entities.clear();const u=w.addUnit('marauder','terran',0,0),enemy=w.addUnit('zergling','zerg',0,4);enemy.hp=enemy.maxHp=1e7;enemy.armor=0;u.shotInterval=u.attackPeriod;const expected=u.weaponDamage+2*u.shotInterval;
 w.fire(u,enemy);assert.equal(w.weaponFlights.length,1);const before=structuredClone(a);assert.equal(w.unequipItem('offense1').ok,false);assert.deepEqual(a,before);resolve(w);close(1e7-enemy.hp,expected);
});
test('white opening and periodic modules use real workers/wallet and freeze during pause and intermission',()=>{
 const a=newEquipmentAccount(),w=world(a),gather=item(a,'gathering'),supply=item(a,'logistics');assert.ok(w.equipItem(gather.id,'gathering').ok);assert.ok(w.equipItem(supply.id,'logistics').ok);const workers=w.workers;assert.ok(w.start());assert.equal(w.workers,workers+1);assert.equal(w.unequipItem('gathering').ok,false);
 const wallet={...w.wallet};w.time=60;w.paused=true;tickStarship(w);assert.deepEqual(w.wallet,wallet);w.paused=false;w.phase='reward';tickStarship(w);assert.deepEqual(w.wallet,wallet);w.phase='battle';tickStarship(w);assert.equal(w.wallet.minerals,wallet.minerals+10);assert.equal(w.wallet.gas,wallet.gas+3);tickStarship(w);assert.equal(w.wallet.minerals,wallet.minerals+10);
 w.resetRun();assert.ok(w.start());assert.equal(w.workers,workers+1);
});
