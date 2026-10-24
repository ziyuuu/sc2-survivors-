import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeCarrierSubsystem} from '../src/simulation/combat/carriers';
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {createEquipmentProjections,retireEquipmentProjection,tickEquipmentProjections} from '../src/simulation/starship/projections';
import {equipmentPresentationReceipts} from '../src/simulation/starship/presentation';
import {equipmentEffectRequests} from '../src/render/effects/equipment-effects';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
function fixture(){const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});w.start();return w;}
function advance(w:World,n:number){for(let i=0;i<n;i++)w.step();}
test('projection retirement preserves the first death timestamp, including zero, and emits one end receipt',()=>{
 const w=fixture(),[u]=createEquipmentProjections(w,w.allies()[0],1,'phantom',1,.5,.5);retireEquipmentProjection(w,u.id);assert.equal(u.deadAt,0);w.time=2;retireEquipmentProjection(w,u.id);assert.equal(u.deadAt,0);assert.equal(equipmentPresentationReceipts(w).filter(e=>e.kind==='projection-end').length,1);
});
test('repeated real simulation expiry returns projection bodies and registries to their baseline',()=>{
 const w=fixture(),source=w.allies()[0];advance(w,1);const size=w.entities.size,members=w.starship.members.size,sources=w.starship.combatSources.size,movement=w.starship.combat.movement.size;
 for(let batch=0;batch<8;batch++){const copies=createEquipmentProjections(w,source,2,'recall',.1,.5,.5);assert.equal(copies.length,2);advance(w,120);assert.ok(copies.every(u=>!w.entities.has(u.id)));assert.equal(w.starship.projections.size,0);assert.equal(w.starship.members.size,members);assert.equal(w.starship.combatSources.size,sources);assert.equal(w.starship.combat.movement.size,movement);assert.equal(w.entities.size,size);}
});
test('early combat death remains visually replayable after projection registry cleanup',()=>{
 const w=fixture(),[u]=createEquipmentProjections(w,w.allies()[0],1,'phantom',30,.5,.5);w.hit(u,1e6,[],1,'zerg',0,1,undefined,true);const event=w.visualEvents.find(e=>e.kind==='death'&&e.entityId===u.id)!;assert.ok(event);w.entities.delete(u.id);tickEquipmentProjections(w);assert.equal(w.starship.projections.has(u.id),false);assert.ok(equipmentEffectRequests(w,()=>0).some(e=>e.key==='equipment-death:'+event.serial));
});
test('expired source metadata remains for delayed damage and is collected when the packet drains',()=>{
 const w=fixture(),[u]=createEquipmentProjections(w,w.allies()[0],1,'phantom',.1,.5,.5),enemy=w.addUnit('zergling','zerg',10,10);enemy.hp=enemy.maxHp=1000;enemy.armor=0;
 w.starship.combat.burns.push({target:enemy.id,bornAt:enemy.bornAt,source:u.id,damage:20,next:10,remaining:1});retireEquipmentProjection(w,u.id);w.entities.delete(u.id);tickEquipmentProjections(w);assert.ok(w.starship.projections.has(u.id));const before=enemy.hp;w.hit(enemy,20,[],1,'terran',0,1,u.id);assert.equal(before-enemy.hp,10);w.starship.combat.burns=[];tickEquipmentProjections(w);assert.equal(w.starship.projections.has(u.id),false);
});
test('carrier retirement handles an already dead child without resetting either death clock',()=>{
 const w=fixture(),carrier=w.addUnit('carrier','terran',0,0);initializeCarrierSubsystem(w);const [mother]=createEquipmentProjections(w,carrier,1,'phase',30,.5,.5),copy=[...w.entities.values()].find(u=>u.summonOwnerId===mother.id)!;assert.ok(copy);copy.hp=0;copy.deadAt=0;w.time=1;retireEquipmentProjection(w,mother.id);w.time=3;retireEquipmentProjection(w,mother.id);assert.equal(copy.deadAt,0);assert.equal(mother.deadAt,1);assert.equal(copy.pendingTarget,null);assert.equal(copy.attackTarget,null);
});
test('a real committed projectile keeps its projection damage budget after the body is gone',()=>{
 const run=(collect:boolean)=>{const w=fixture(),source=w.addUnit('marauder','terran',0,0),enemy=w.addUnit('zergling','zerg',0,4);enemy.hp=enemy.maxHp=1000;enemy.armor=0;const [copy]=createEquipmentProjections(w,source,1,'recall',8,.5,.5);copy.shotInterval=copy.attackPeriod;w.fire(copy,enemy);assert.equal(w.weaponFlights.length,1);retireEquipmentProjection(w,copy.id);w.entities.delete(copy.id);if(collect)tickEquipmentProjections(w);assert.ok(w.starship.projections.has(copy.id));for(let n=0;n<60;n++){w.time+=1/60;tickWeaponFlights(w,1/60);}assert.equal(w.weaponFlights.length,0);assert.ok(enemy.hp<1000);if(collect){tickEquipmentProjections(w);assert.equal(w.starship.projections.has(copy.id),false);assert.equal(w.starship.combatSources.has(copy.id),false);}return {hp:enemy.hp,rng:w.rngState,equipmentRng:w.starship.account.rng,wallet:w.wallet};};assert.deepEqual(run(true),run(false));
});
test('an obsolete burn execution counter does not pin an unrelated projection source forever',()=>{
 const w=fixture(),[copy]=createEquipmentProjections(w,w.allies()[0],1,'phantom',.1,.5,.5);w.starship.combat.burning.set(999999,{maxHp:100,actual:10,bornAt:0,source:copy.id});retireEquipmentProjection(w,copy.id);w.entities.delete(copy.id);tickEquipmentProjections(w);assert.equal(w.starship.projections.has(copy.id),false);
});
