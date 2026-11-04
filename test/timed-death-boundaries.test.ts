import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {activeEquipmentEffects,tickEquipmentModules} from '../src/simulation/starship/modules';
import {spawnAdvancedEquipmentGroup,expireAdvancedEquipmentBody} from '../src/simulation/starship/advanced-support';
import {teamEntryBarrier} from '../src/simulation/combat/team-auras';
import {zergEliteCombat} from '../src/simulation/combat/zerg-elite-runtime';
import {registerShieldReconstruction} from '../src/simulation/combat/protoss-hero-passives';

function world(race:'terran'|'protoss'|'zerg'='terran',module?:string){const w=new World({race,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});if(module){const a=w.starship.account,g=grantEquipment(a,{template:module,race,slot:'support',polluted:EQUIPMENT_TEMPLATES[module].pollution==='required'},'fixture',{kind:'warehouse'});assert.ok(g.ok);if(g.value.pollution==='uncleansed'){a.dust=1e6;assert.ok(cleanseEquipment(a,g.value.id).ok);}assert.ok(w.equipItem(g.value.id,'support').ok);}assert.ok(w.start());w.entities.clear();return w;}

test('a temporary immortal reinforcement expires at its deadline despite native shields and barrier',()=>{
 const w=world('protoss','module.reinforcement.3');w.addUnit('immortal','terran',0,0);w.time=60;tickEquipmentModules(w);const u=w.allies().find(u=>u.temporary)!;assert.ok(u);assert.equal(u.unitType,'immortal');assert.ok(u.shield!>0);
 w.time=u.temporaryUntil!;w.updateUnit(u,1/60);assert.equal(u.hp,0);assert.equal(u.deadAt,w.time);assert.equal(w.starship.life.pending.has(u.id),false);
 const events=w.visualEvents.filter(e=>e.kind==='death'&&e.entityId===u.id).length;assert.equal(events,1);w.updateUnit(u,1/60);assert.equal(w.visualEvents.filter(e=>e.kind==='death'&&e.entityId===u.id).length,events);
});

test('an expiring elite behemoth bypasses its real defensive boost and explodes only once',()=>{
 const w=world('zerg','module.behemoth.5'),effect=activeEquipmentEffects(w).find(e=>e.key==='behemoth')!;assert.ok(effect);
 const [u]=spawnAdvancedEquipmentGroup(w,effect,[{type:'ultralisk',rank:5,elite:'ultralisk.2'}],{x:0,z:0},30,2,6);assert.ok(u);
 w.time=29;w.hit(u,u.maxHp*.8,[],1,'zerg',0,1);assert.ok(zergEliteCombat(u).boostUntil>w.time);assert.ok(u.hp>0);
 const enemy=w.addUnit('roach','zerg',u.x,u.z+1);enemy.hp=enemy.maxHp=1e8;enemy.armor=0;
 w.time=30;assert.equal(expireAdvancedEquipmentBody(w,u),true);assert.equal(u.hp,0);assert.ok(enemy.hp<enemy.maxHp);const hp=enemy.hp;expireAdvancedEquipmentBody(w,u);assert.equal(enemy.hp,hp);assert.equal(w.starship.life.pending.has(u.id),false);
});

test('S15 last stand still dies at the deadline when a teammate has granted a fresh barrier',()=>{
 const w=world(),u=w.addUnit('marine','terran',0,0);w.runConfig!.frozenTalents.levels={'T-S15':1};w.time=1;w.hit(u,1e6,[],1,'zerg',0,1);assert.equal(u.hp,1);assert.equal(u.lastStandUntil,11);
 const ally=w.addUnit('mutalisk','terran',1,0);ally.eliteId='mutalisk.3';w.refreshStats(ally,true);w.time=9;teamEntryBarrier(w,ally,1);assert.ok(w.teamAuras.barriers.some(b=>b.target===u.id&&b.amount>2));
 w.time=11;w.updateUnit(u,1/60);assert.equal(u.hp,0);assert.equal(u.deadAt,11);assert.equal(w.starship.life.pending.has(u.id),false);
});

test('S15 prevents active medical recovery and leaves healing capacity for another wounded unit',()=>{
 const w=world(),u=w.addUnit('marine','terran',0,0);w.runConfig!.frozenTalents.levels={'T-S15':1};w.time=1;w.hit(u,1e6,[],1,'zerg',0,1);assert.equal(u.hp,1);
 const healer=w.addUnit('medivac','terran',1,0),other=w.addUnit('marine','terran',2,0);other.hp=other.maxHp/2;const before=other.hp;w.heal(healer,.1);
 assert.equal(u.hp,1);assert.ok(other.hp>before);assert.equal(healer.healTarget,other.id);
});

test('S15 prevents an allied shield reconstruction from restoring native shields',()=>{
 const w=world('protoss'),u=w.addUnit('stalker','terran',0,0);w.runConfig!.frozenTalents.levels={'P-S15':1};w.time=1;w.hit(u,1e6,[],1,'zerg',0,1);assert.equal(u.hp,1);assert.equal(u.shield,0);
 const hero=w.addUnit('zealot','terran',1,0);hero.heroId='artanis';registerShieldReconstruction(w,hero,100,1,[u]);assert.equal(u.shield,0);assert.equal(u.hp,1);
});

test('S15 prevents the real reinforcement landing heal from restoring its patient',()=>{
 const w=world('terran','module.reinforcement.3'),u=w.addUnit('marine','terran',0,0);w.runConfig!.frozenTalents.levels={'T-S15':1};w.time=59;w.hit(u,1e6,[],1,'zerg',0,1);assert.equal(u.hp,1);
 w.time=60;tickEquipmentModules(w);assert.ok(w.allies().some(a=>a.temporary));assert.equal(u.hp,1);
});

test('temporary lifespan expires even while an elite roach is in its burrow transition',()=>{
 const w=world('zerg'),u=w.addUnit('roach','terran',0,0,5);u.eliteId='roach.1';u.temporary=true;u.temporaryKind='mercenary';u.temporaryUntil=80;w.refreshStats(u,true);u.hp=u.maxHp*.2;
 w.time=79.9;w.updateUnit(u,1/60);assert.equal(zergEliteCombat(u).burrowPhase,1);assert.ok(u.hp>0);
 w.time=80;w.updateUnit(u,1/60);assert.equal(u.hp,0);assert.equal(u.deadAt,80);
});

test('ordinary incoming damage still spends native shields before health',()=>{
 const w=world('protoss'),u=w.addUnit('stalker','terran',0,0),hp=u.hp,shield=u.shield!;w.hit(u,10,[],1,'zerg',0,1);assert.equal(u.hp,hp);assert.ok(u.shield!<shield);
});
