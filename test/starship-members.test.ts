import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot,type EquipmentBinding} from '../src/simulation/starship/types';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {deliverEquipmentMembers,evolveEquipmentMembers,equipmentPaidDelivery} from '../src/simulation/starship/members';
import {tickStarship,equipmentUnitTotals,equipmentTotals} from '../src/simulation/starship/runtime';
import {releasePaidPassenger} from '../src/simulation/expedition-production';
import {equipmentCanGrow} from '../src/simulation/starship/eligibility';
function world(){return new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});}
function put(w:World,template:string,slot:EquipmentSlot,binding?:EquipmentBinding){const a=w.starship.account,r=grantEquipment(a,{template,race:w.selectedRace,slot,binding,polluted:EQUIPMENT_TEMPLATES[template].pollution==='required'},'t:'+a.serial,{kind:'warehouse'});assert.ok(r.ok);if(r.value.pollution==='uncleansed'){a.dust=10000;assert.ok(cleanseEquipment(a,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,slot).ok);return r.value;}
function set(w:World,template:string,count:number,binding?:EquipmentBinding,offset=0){for(const slot of ATTRIBUTE_SLOTS.slice(offset,offset+count))put(w,template,slot,binding);}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('orange army actually delivers seven formal rank V seats, respects blocked space, and never pays the opening twice',()=>{
 const w=world();set(w,'set.orange.army.5',4,{direction:'barracks'});assert.ok(w.start());assert.equal(w.familySeatCount('marine'),8);assert.equal(w.familyUnits('marine').filter(u=>u.rank===5).length,7);assert.ok(w.familyUnits('marine').every(u=>!w.starship.members.get(u.id)?.independent));deliverEquipmentMembers(w);assert.equal(w.familySeatCount('marine'),8);
 const blocked=world();set(blocked,'set.orange.army.5',4,{direction:'barracks'});const free=blocked.freePosition.bind(blocked);blocked.freePosition=()=>null;blocked.start();assert.equal(blocked.familySeatCount('marine'),1);assert.equal(blocked.starship.pendingMembers.reduce((n,p)=>n+p.count,0),7);blocked.freePosition=free;deliverEquipmentMembers(blocked);assert.equal(blocked.familySeatCount('marine'),8);assert.equal(blocked.starship.pendingMembers.length,0);
});
test('four-piece identity rewards are fixed III/V from two foreign races and cannot enter growth',()=>{
 const w=world();set(w,'set.advanced.identity.4',4);w.start();const foreign=w.allies().filter(u=>w.starship.members.get(u.id)?.origin?.startsWith('foreign_elites'));assert.equal(foreign.length,2);assert.deepEqual(foreign.map(u=>u.rank).sort(),[3,5]);assert.equal(new Set(foreign.map(u=>u.race)).size,2);assert.ok(foreign.every(u=>u.race!=='terran'&&!!u.eliteId&&!equipmentCanGrow(w,u)&&w.starship.members.get(u.id)?.cannotRevive));assert.equal(w.expedition.familySlots.length,1);
});
test('bound elite gifts are independent, keep the source instance and do not give its exclusive multiplier to another same-ID elite',()=>{
 const w=world();set(w,'set.orange.elite.5',6,{elite:'marine.1'});w.start();const bound=w.allies().find(u=>u.eliteId==='marine.1')!;assert.ok(bound);assert.equal(bound.rank,5);assert.equal(w.familySeatCount('marine'),1);const other=w.addUnit('marine','terran',10,0,5);other.eliteId='marine.1';w.refreshStats(other,true);assert.equal(equipmentUnitTotals(w,bound).native,2);assert.equal(equipmentUnitTotals(w,other).native,0);close(equipmentUnitTotals(w,other).attack-equipmentTotals(w).attack,.5);assert.equal(equipmentUnitTotals(w,bound).exclusiveHealth,2);deliverEquipmentMembers(w);assert.equal(w.allies().filter(u=>u.eliteId==='marine.1').length,2);
});
test('two same-hero set sources merge one hero at the highest opening rank without refilling wounds or cooldown',()=>{
 const w=world();set(w,'set.orange.hero.5',6,{hero:'raynor'});w.acquireHero('raynor');const u=w.heroEntity('raynor')!;u.hp=u.maxHp*.4;w.heroes.get('raynor')!.skillReady=50;w.start();assert.equal(w.heroes.size,1);assert.equal(w.heroes.get('raynor')!.rank,3);assert.equal(w.heroes.get('raynor')!.skillReady,50);close(u.hp/u.maxHp,.4);const hp=u.hp;deliverEquipmentMembers(w);assert.equal(u.hp,hp);assert.equal(w.allies().filter(u=>u.heroId==='raynor').length,1);
});
test('purple training converts eligible high-rank bodies once, caps six real members and preserves wounds',()=>{
 const w=world();set(w,'set.advanced.training.4',4);w.start();const units=Array.from({length:8},(_,i)=>w.addUnit('marine','terran',i+15,10,9));for(const u of units)u.hp=u.maxHp*.3;evolveEquipmentMembers(w);assert.equal(units.filter(u=>u.eliteId).length,6);for(const u of units.filter(u=>u.eliteId)){assert.equal(u.rank,1);close(u.hp/u.maxHp,.3);}evolveEquipmentMembers(w);assert.equal(units.filter(u=>u.eliteId).length,6);
});
test('normal paid production delivery receives additive rank IX while free gift and full-roster cultivation do not reapply start rank',()=>{
 const w=world();put(w,'module.armory.5','logistics');set(w,'set.orange.soldier.5',4,{direction:'barracks'});w.start();const pod=w.spawnPod('marine',{x:4,z:4},100,1);pod.status='opening';w.expedition.ledger.push({id:100,producerId:'p',family:'marine',line:'barracks',facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:50,gas:0},status:'waiting',entityId:null,purpose:'body'}]});const u=releasePaidPassenger(w,pod,0,{x:5,z:5})!;assert.equal(u.rank,9);assert.equal(w.soldierCap('marine'),9);
 const free=w.spawnPod('marine',{x:-4,z:4},101,1,true);free.status='opening';const gift=releasePaidPassenger(w,free,0,{x:-5,z:5})!;assert.equal(gift.rank,1);const before=w.allies().length;assert.equal(releasePaidPassenger(w,pod,0,{x:9,z:9}),null);assert.equal(w.allies().length,before);
});
test('periodic elite growth changes real rank, keeps wounds and skips non-growable sources',()=>{
 const w=world();put(w,'module.academy.4','logistics');set(w,'set.advanced.identity.4',4);w.start();const foreign=w.allies().find(u=>w.starship.members.get(u.id)?.cannotGrow)!;const u=w.addUnit('marine','terran',12,0,2);u.eliteId='marine.2';w.refreshStats(u,true);u.hp=u.maxHp*.5;w.time=120;tickStarship(w);assert.equal(u.rank,3);close(u.hp/u.maxHp,.5);assert.ok([3,5].includes(foreign.rank));w.paused=true;w.time=240;tickStarship(w);assert.equal(u.rank,3);
});
test('orange periodic reinforcement cannot spawn its temporary escort when the formal seat is full',()=>{
 const w=world();set(w,'set.orange.army.5',6,{direction:'barracks'});w.start();while(w.familySeatCount('marine')<w.familyMemberCap('marine'))w.addUnit('marine','terran',w.nextId%20,16,1);w.time=10;tickStarship(w);assert.equal(w.allies().filter(u=>u.temporary).length,0);const body=w.familyUnits('marine').at(-1)!;w.entities.delete(body.id);w.time=20;tickStarship(w);assert.equal(w.familySeatCount('marine'),w.familyMemberCap('marine'));assert.equal(w.allies().filter(u=>u.temporary).length,2);assert.equal(w.allies().filter(u=>u.temporary).every(u=>u.rank===1&&u.temporaryUntil===40),true);
});
