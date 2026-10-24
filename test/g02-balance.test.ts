import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {grantEquipment,newEquipmentAccount} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,isOffensiveSlot} from '../src/simulation/starship/types';
import {equipmentTotals,withEquipmentWeapon} from '../src/simulation/starship/runtime';
import {equipmentCardDamage} from '../src/simulation/starship/card-effects';
import {buySupport,commitStrategic,tickShopSupport} from '../src/simulation/combat/shop-support';
import {castTactical,tickUnique} from '../src/simulation/combat/unique-support';
import {spawnFieldPickup,collectFieldPickup} from '../src/simulation/field-events/pickups';
import {expeditionWeaponBonuses} from '../src/simulation/combat/expedition-combat';
import {heroAura} from '../src/simulation/combat/terran-hero-passives';
import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';
import {teamCardKey} from '../src/simulation/progression/team-cards';
import {newExpedition} from '../src/simulation/expedition-state';
import {beginExpeditionWindow,drawExpeditionReinforcements,type ExpeditionDraftContext} from '../src/simulation/progression/expedition-drafts';
import type {Race} from '../src/data/races';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(race:Race='terran',quality:0|3|4|5=3){
 const w=new World({race,seed:102202,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(102202)});
 if(quality)for(const slot of ATTRIBUTE_SLOTS){const r=grantEquipment(w.starship.account,{template:quality===5?'set.orange.survivor.5':'attribute.'+quality,race,slot},'g02-balance:'+slot,{kind:'warehouse'});assert.ok(r.ok);r.value.allocation=2;const keys=isOffensiveSlot(slot)?['attack','trueDps','range','crit','critDamage']:['defense','health','reduction','dodge','move'];r.value.affixes=keys.slice(0,quality===5?3:quality).map(key=>({key,score:200})) as typeof r.value.affixes;assert.ok(w.equipItem(r.value.id,slot).ok);}
 assert.ok(w.start());w.entities.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.missions.enabled=w.encounters.enabled=false;return w;
}
const foe=(w:World,x=0,z=3)=>{const e=w.addUnit('roach','zerg',x,z);e.hp=e.maxHp=1e6;e.shield=e.maxShield=0;e.armor=0;w.hash.rebuild(w.entities.values());return e;};
// G03: purple white DPS +5% also feeds ordinary-DPS support growth; orange is already at its cap.
for(const race of ['terran','zerg','protoss'] as const)for(const [quality,damage] of [[0,6000],[3,10656],[4,20068.8],[5,50880]] as const)test(`G02 ${race} quality ${quality} pickup nuke commits one strengthened packet and preserves range/pause`,()=>{
 const w=make(race,quality),e=foe(w),outside=foe(w,20,3);assert.ok(spawnFieldPickup(w,'nuke',w.anchor));const pickup=w.fieldEvents.pickups[0].id;assert.ok(collectFieldPickup(w,pickup));assert.equal(collectFieldPickup(w,pickup),false);assert.equal(w.expedition.support.ammo,1);assert.ok(commitStrategic(w,e));assert.equal(commitStrategic(w,e),false);near(w.expedition.support.impacts[0].damage!,damage);w.starship.enabled=false;
 w.time=2.99;tickShopSupport(w);near(e.hp,1e6);w.paused=true;w.time=3;tickShopSupport(w);near(e.hp,1e6);w.paused=false;tickShopSupport(w);near(e.hp,1e6-damage);near(outside.hp,1e6);tickShopSupport(w);near(e.hp,1e6-damage);assert.equal(w.expedition.support.ammo,0);
});
test('G02 independent support caps ordinary-DPS growth and excludes true DPS and combat stats',()=>{
 const w=make(),t=equipmentTotals(w);t.dps=500;t.attack=.2;t.trueDps=100000;t.attackSpeed=100;t.crit=1;t.critDamage=100;near(equipmentCardDamage(w,100),480);t.dps=300;near(equipmentCardDamage(w,100),480);t.dps=0;near(equipmentCardDamage(w,100),120);t.trueDps=0;near(equipmentCardDamage(w,100),120);w.starship.enabled=false;near(equipmentCardDamage(w,100),100);
});
for(const rank of [1,2,3])test(`G02 rank ${rank} overdrive adds to team firepower for native/bonus/white damage, not fixed true DPS`,()=>{
 const w=make(),u=w.addUnit('marauder','terran',0,0),e=foe(w);w.expedition.cardTotals[teamCardKey('firepower','orange')]=1;w.refreshStats(u);const native=u.weaponDamage,bonus=expeditionWeaponBonuses(w,u),t=equipmentTotals(w),health=u.maxHp;
 for(let n=0;n<rank;n++)assert.ok(buySupport(w,'terran.overdrive'));assert.ok(castTactical(w));const add=[0,.3,.45,.6][rank];near(u.weaponDamage,native*(1.16+add)/1.16);for(let i=0;i<5;i++)w.refreshStats(u);near(u.weaponDamage,native*(1.16+add)/1.16);near(u.maxHp,health);
 const current=expeditionWeaponBonuses(w,u);for(let i=0;i<bonus.length;i++)near(current[i].amount,bonus[i].amount*(1.16+add)/1.16);
 u.shotInterval=1;let packet=0,truth=0;withEquipmentWeapon(w,u,e,()=>{packet=u.weaponDamage;truth=w.starship.active!.truePerHit;});near(packet,(u.weaponDamage+t.dps*(1.16+add))*(1+t.attack));near(truth,t.trueDps);
 const ready=w.expedition.support.unique.ready;if(rank<3){assert.ok(buySupport(w,'terran.overdrive'));w.refreshStats(u);near(u.weaponDamage,native*(1.16+add)/1.16);}near(w.expedition.support.unique.ready,ready);w.time=8;tickUnique(w);near(u.weaponDamage,native);u.shotInterval=1;withEquipmentWeapon(w,u,e,()=>{truth=w.starship.active!.truePerHit;});near(truth,t.trueDps);
});
test('G02 overdrive applies to an existing hero and returns to the same weapon after expiry',()=>{
 const w=make();assert.ok(w.acquireHero('raynor'));const hero=w.allies().find(u=>u.heroId==='raynor');assert.ok(hero);const damage=hero.weaponDamage,aura=heroAura(w,hero).damage;assert.ok(buySupport(w,'terran.overdrive'));assert.ok(castTactical(w));near(hero.weaponDamage,damage*(1+aura+.3)/(1+aura));w.time=8;tickUnique(w);near(hero.weaponDamage,damage);
});
test('G02 overdrive covers real interceptor weapons once and restores after expiry',()=>{
 const w=make(),carrier=w.addUnit('carrier','terran',0,0);initializeCarrierSubsystem(w);const children=ownedInterceptors(w,carrier.id);assert.equal(children.length,4);const before=children.map(u=>({damage:u.weaponDamage,period:u.attackPeriod}));assert.ok(buySupport(w,'terran.overdrive'));assert.ok(castTactical(w));for(const [i,u] of children.entries()){near(u.weaponDamage,before[i].damage*1.3);near(u.attackPeriod,before[i].period/1.2);}w.time=8;tickUnique(w);for(const [i,u] of children.entries()){near(u.weaponDamage,before[i].damage);near(u.attackPeriod,before[i].period);}
});
for(const kind of ['bombardment','terran.missiles'] as const)test(`G02 ${kind} first ready is three seconds, upgrade and stage change do not reset it`,()=>{
 const w=make('terran',0);w.addUnit('marine','terran',0,0);w.time=10;assert.ok(buySupport(w,kind));const s=w.expedition.support,ready=()=>kind==='bombardment'?s.bombardAt:s.unique.missilesReady;near(ready(),13);w.time=11;assert.ok(buySupport(w,kind));near(ready(),13);w.stage=2;w.time=12.99;tickShopSupport(w);near(ready(),13);assert.equal(s.impacts.length+s.unique.packets.length,0);
 w.time=13;tickShopSupport(w);near(ready(),13);const e=foe(w);tickShopSupport(w);assert.equal(kind==='bombardment'?s.impacts.length:s.unique.packets.length,kind==='bombardment'?1:6);near(ready(),kind==='bombardment'?28:37);const due=ready();assert.ok(buySupport(w,kind));near(ready(),due);w.stage=3;tickShopSupport(w);near(ready(),due);w.time=due;tickShopSupport(w);near(ready(),due+(kind==='bombardment'?10:24));assert.ok(e.hp>0);
});
test('G02 native random shelf applies only the approved family-utility price schedule',()=>{
 const state=newExpedition('terran');let seed=102202,id=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};beginExpeditionWindow(state,17);state.familySlots=['marine'];
 const ctx:ExpeditionDraftContext={state,stage:17,random,nextOfferId:x=>x+':'+id++,heroes:[],familyInfo:f=>({name:f,alive:f==='marine'?1:0,canAttack:true,canSupport:true,usesEnergy:true,cultivationCapacity:0,canProduce:true})};
 const prices:Record<string,number[]>={white:[25,0],green:[50,0],blue:[90,20],purple:[150,50],orange:[225,90]},teamPrices:Record<string,number[]>={white:[50,0],green:[90,20],blue:[150,50],purple:[225,90],orange:[325,140]},seen=new Set<string>();
 for(let n=0;n<4000;n++)for(const offer of drawExpeditionReinforcements(ctx,true)){const e=offer.expeditionEffect;if(e.kind==='card'&&['recovery','energy','production'].includes(e.effect)){assert.deepEqual([offer.baseMinerals,offer.baseGas],prices[offer.rarity]);seen.add(e.effect+':'+offer.rarity);}if(e.kind==='teamCard')assert.deepEqual([offer.baseMinerals,offer.baseGas],teamPrices[offer.rarity]);}
 for(const effect of ['recovery','energy','production'])for(const rarity of Object.keys(prices))assert.ok(seen.has(effect+':'+rarity),effect+':'+rarity);
});
