import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {ATTRIBUTE_SLOTS,type EquipmentSlot,type EquipmentItem} from '../src/simulation/starship/types';
import {equipmentUnitTotals,equipmentTotals,tickStarship} from '../src/simulation/starship/runtime';
import {tickEquipmentCombat} from '../src/simulation/starship/combat';
import {initializeCarrierSubsystem,ownedInterceptors,tickInterceptor} from '../src/simulation/combat/carriers';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function world(race:'terran'|'protoss'='terran'){return new World({race,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});}
function put(w:World,template:string,slot:EquipmentSlot,affix?:EquipmentItem['affixes']){const a=w.starship.account,r=grantEquipment(a,{template,race:w.selectedRace,slot,polluted:EQUIPMENT_TEMPLATES[template].pollution==='required'},'t:'+a.serial,{kind:'warehouse'});assert.ok(r.ok);if(affix)r.value.affixes=affix;if(r.value.pollution==='uncleansed'){a.dust=10000;assert.ok(cleanseEquipment(a,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,slot).ok);return r.value;}
function target(w:World,z=3){const e=w.addUnit('zergling','zerg',0,z);e.hp=e.maxHp=1e6;e.armor=0;return e;}
function begin(w:World,type:'marine'|'reaper'='marine'){w.start();w.entities.clear();const u=w.addUnit(type,'terran',0,0);u.shotInterval=u.attackPeriod;return u;}
test('double strike copies the ordinary multi-hit packet once and shares the one fixed true-DPS budget',()=>{
 const w=world();put(w,'special.double.4','offense1');put(w,'attribute.2','offense2',[{key:'trueDps',score:200}]);const u=begin(w,'reaper'),e=target(w),t=equipmentTotals(w),physical=u.weaponDamage*2+t.dps*u.shotInterval;
 w.fire(u,e);close(e.maxHp-e.hp,physical*2+t.trueDps*u.shotInterval);assert.equal(w.stats.shots,1);assert.equal(w.starship.combat.burns.length,0);
});
test('split and three-jump ricochet each start once from a native attack and never repeat their own chains',()=>{
 const w=world();put(w,'module.split.4','control');const u=begin(w),targets=[target(w,2),target(w,3),target(w,4),target(w,5)],damage=u.weaponDamage;w.starship.account.rng=1;w.fire(u,targets[0]);close(targets[0].maxHp-targets[0].hp,damage);close(targets[1].maxHp-targets[1].hp,damage*1.5);close(targets[2].maxHp-targets[2].hp,damage*.5);close(targets[3].maxHp-targets[3].hp,damage*.5);assert.equal(w.stats.shots,1);
});
test('weakness converts real ordinary hits after two seconds, expires after three seconds, and leaves skills ordinary',()=>{
 const w=world();put(w,'module.weakness.5','control');const u=begin(w),e=target(w);e.armor=100;for(const time of [0,1]){w.time=time;const before=e.hp;w.fire(u,e);close(before-e.hp,.5);}w.time=2;let hp=e.hp;w.fire(u,e);close(hp-e.hp,u.weaponDamage);hp=e.hp;w.hit(e,10,[],1,'terran',.5,0,u.id);close(hp-e.hp,.5);w.time=5.1;hp=e.hp;w.fire(u,e);close(hp-e.hp,.5);
});
test('each primary cycle contributes exactly one finite noncritical three-second burn even when the weapon has two hits',()=>{
 const w=world();for(const slot of ATTRIBUTE_SLOTS.slice(0,2))put(w,'set.special.flame.4',slot,[{key:'critDamage',score:200},{key:'range',score:200},{key:'attack',score:200}]);const u=begin(w,'reaper'),e=target(w);w.fire(u,e);const main=e.maxHp-e.hp;assert.equal(w.starship.combat.burns.length,1);for(const time of [1,2,3,4]){w.time=time;tickEquipmentCombat(w);}close(e.maxHp-e.hp,main*1.2);assert.equal(w.starship.combat.burns.length,0);
});
test('burn execution counts actual life true damage, ignores shield absorption and produces only one death',()=>{
 const w=world();for(const slot of ATTRIBUTE_SLOTS.slice(0,6))put(w,'set.special.flame.4',slot,slot.startsWith('offense')?[{key:'critDamage',score:200},{key:'range',score:200},{key:'attack',score:200}]:undefined);const u=begin(w),e=target(w);e.maxHp=e.hp=1000;e.maxShield=e.shield=500;e.shieldArmor=0;w.fire(u,e);e.shield=500;w.hit(e,500,[],1,'terran',0,1,u.id);assert.equal(e.hp,1000);w.hit(e,399,[],1,'terran',0,1,u.id);assert.equal(e.hp,601);const kills=w.stats.kills;w.hit(e,1,[],1,'terran',0,1,u.id);assert.equal(e.hp,0);assert.equal(w.stats.kills,kills+1);w.hit(e,1e6,[],1,'terran',0,1,u.id);assert.equal(w.stats.kills,kills+1);
});
test('real interceptor updates share one mother DPS budget across all natural child shots',()=>{
 const w=world('protoss');put(w,'attribute.2','offense1',[{key:'trueDps',score:200}]);w.start();w.entities.clear();const mother=w.addUnit('carrier','terran',0,0),e=target(w,1);initializeCarrierSubsystem(w);const children=ownedInterceptors(w,mother.id),t=equipmentTotals(w),base=children.reduce((n,c)=>n+c.weaponDamage*2,0),period=children[0].attackPeriod;assert.ok(children.length>1);for(const child of children){child.x=0;child.z=0;child.pendingTarget=e.id;child.windup=0;tickInterceptor(w,child,1/60);}close(e.maxHp-e.hp,base+(t.dps+t.trueDps)*period);assert.equal(w.stats.shots,children.length);
});
test('adrenaline responds to real health changes and removes its threshold multiplier without stat drift',()=>{
 const w=world();put(w,'module.adrenaline.3','control');const u=begin(w),high=u.attackPeriod;u.hp=u.maxHp*.49;tickStarship(w);close(u.attackPeriod,high/4);for(let i=0;i<20;i++){w.refreshStats(u);tickStarship(w);}close(u.attackPeriod,high/4);u.hp=u.maxHp*.51;tickStarship(w);close(u.attackPeriod,high);
});
