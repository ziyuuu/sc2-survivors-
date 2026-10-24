import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {HEROES,type HeroId} from '../src/data/heroes';
import {ELITES,type EliteId} from '../src/data/elites';
import type {Race} from '../src/data/races';
import type {Entity} from '../src/simulation/types';
import {newEquipmentAccount,grantEquipment,cleanseEquipment,validateItem} from '../src/simulation/starship/inventory';
import {itemValues,whiteValues,identityFactors,totalAttributes} from '../src/simulation/starship/attributes';
import {equipmentUnitTotals,equipmentTotals,withEquipmentWeapon} from '../src/simulation/starship/runtime';
import {equipmentCardTotals,equipmentCardDamage} from '../src/simulation/starship/card-effects';
import {createEquipmentProjections} from '../src/simulation/starship/projections';
import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {tickHeroAttacks} from '../src/simulation/combat/hero-attack-upgrades';
import {equipmentDescription} from '../src/ui/starship/equipment-description';
import {catalogRows,catalogItem} from '../src/ui/starship/presentation';
import type {EquipmentItem,EquipmentSlot,Quality} from '../src/simulation/starship/types';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<Math.max(1e-7,Math.abs(b)*1e-9),`${a} != ${b}`);
const round=(v:number)=>Math.round(v*100)/100;
const oldBase={1:[2,.01,.25,15],2:[5,.025,.75,40],3:[12,.06,2,100],4:[30,.15,5,250],5:[75,.36,12,650]};
const alloc=[[1.4,.6],[1.16,.84],[1,1],[.84,1.16],[.6,1.4]];
function world(race:Race='terran'){return new World({race,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});}
function put(w:World,q:Quality,slot:EquipmentSlot,polluted=false){
 const a=w.starship.account,g=grantEquipment(a,{template:q===5?'set.orange.survivor.5':'attribute.'+q,race:w.selectedRace,slot,polluted},'g03:'+a.serial,{kind:'warehouse'});assert.ok(g.ok);
 g.value.allocation=2;
 const keys=slot.startsWith('offense')?['trueDps','range','critDamage','attack','crit']:['defense','move','dodge','reduction','health'];
 g.value.affixes=g.value.affixes.map((_,i)=>({key:keys[i] as EquipmentItem['affixes'][number]['key'],score:200}));
 assert.ok(validateItem(g.value));if(polluted){a.dust=10000;assert.ok(cleanseEquipment(a,g.value.id).ok);}assert.ok(w.equipItem(g.value.id,slot).ok);return g.value;
}
function subject(w:World,rank:number,hero?:HeroId,elite?:EliteId){
 const type=hero?HEROES[hero].baseFamily:elite?ELITES[elite].family:w.selectedRace==='terran'?'marine':w.selectedRace==='zerg'?'roach':'stalker';
 const u=w.addUnit(type,'terran',0,0,rank);
 if(hero){u.heroId=hero;u.modelKey=HEROES[hero].model;w.heroes.set(hero,{id:hero,rank,entityId:u.id,skillReady:0,revivePaid:false,awaitingSpawn:false});}
 if(elite){u.eliteId=elite;u.modelKey=ELITES[elite].model;}w.refreshStats(u,true);return u;
}
function start(w:World){assert.ok(w.start());w.entities.clear();w.pods=[];w.hive=null;w.expansionHives.clear();}

test('G03 white values increase only approved high-quality DPS/HP/armor, with pollution provenance and all allocations',()=>{
 for(const quality of [1,2,3,4,5] as const)for(const pollution of ['none','uncleansed','cleansed'] as const)for(const a of [0,1,2,3,4] as const){
  const f=quality===4?1.05:quality===5?(pollution==='none'?1.08:1.1):1,b=oldBase[quality],o=whiteValues(quality,'offense1',a,pollution),d=whiteValues(quality,'defense1',a,pollution);
  close(o.dps,round(b[0]*f*alloc[a][0]));close(o.attackSpeed,round(b[1]*100*alloc[a][1])/100);close(d.hp,round(b[3]*f*alloc[a][1]));close(d.armor,round(b[2]*f*alloc[a][0]));
  assert.ok(Object.values(whiteValues(quality,'gathering',a,pollution)).every(v=>v===0));
 }
});
test('G03 polluted orange shows the same +10% before and after real cleansing and retains affixes',()=>{
 const w=world(),a=w.starship.account,g=grantEquipment(a,{template:'set.orange.survivor.5',race:'terran',slot:'defense1',polluted:true},'polluted',{kind:'warehouse'});assert.ok(g.ok);g.value.allocation=2;
 const before=itemValues(g.value),affixes=structuredClone(g.value.affixes);close(before.hp,715);close(before.armor,13.2);assert.equal(w.equipItem(g.value.id,'defense1').ok,false);
 a.dust=10000;assert.ok(cleanseEquipment(a,g.value.id).ok);assert.deepEqual(itemValues(g.value),before);assert.deepEqual(g.value.affixes,affixes);assert.ok(w.equipItem(g.value.id,'defense1').ok);
 const row=catalogRows.find(r=>r.quality===5&&r.polluted&&r.slot==='defense1')!,atlas=catalogItem(row);close(whiteValues(atlas.quality,atlas.slot,2,atlas.pollution).hp,715);
});
for(const [race,hero,elite] of [['terran','raynor','marine.1'],['zerg','kerrigan','roach.1'],['protoss','artanis','stalker.1']] as const){
 for(const rank of [1,3,5,9])test(`G03 ${race} rank ${rank} scales only mixed-loadout purple additive pools and never native identity`,()=>{
  for(const identity of ['ordinary','hero',...(rank<=5?['elite']:[])] as const){
   const w=world(race),low=[put(w,3,'offense1'),put(w,3,'defense1')],high=[put(w,4,'offense2'),put(w,4,'defense2')];start(w);
   const u=subject(w,rank,identity==='hero'?hero:undefined,identity==='elite'?elite:undefined),raw=totalAttributes([...low,...high]),purple=totalAttributes(high),b=identity==='ordinary'?0:(rank-1)*.05,t=equipmentUnitTotals(w,u);
   close(t.dps,raw.dps+purple.dps*b);close(t.hp,raw.hp+purple.hp*b);close(t.trueDps,raw.trueDps+purple.trueDps*b);
   for(const key of ['attackSpeed','armor','attack','health','defense','reduction'] as const)close(t[key],raw[key]);
   const native=w.starship.native.get(u)!;close(u.maxHp,(native.maxHp+t.hp*identityFactors(u).hp)*(1+t.health));
   const hp=u.maxHp;u.hp=hp*.4;for(let i=0;i<12;i++)w.refreshStats(u);close(u.maxHp,hp);close(u.hp/u.maxHp,.4);
   const naked=world(race);start(naked);const n=subject(naked,rank,identity==='hero'?hero:undefined,identity==='elite'?elite:undefined);close(native.maxHp,n.maxHp);close(u.weaponDamage,n.weaponDamage);close(native.attackPeriod,n.attackPeriod);
  }
 });
}
test('G03 green and blue equipment contributions are identical for a rank IX hero and no high-quality pieces',()=>{
 const w=world(),items=[put(w,2,'offense1'),put(w,3,'offense2'),put(w,2,'defense1'),put(w,3,'defense2')];start(w);const u=subject(w,9,'raynor'),t=equipmentUnitTotals(w,u),raw=totalAttributes(items);
 for(const key of Object.keys(raw) as (keyof typeof raw)[])close(t[key],raw[key]);
});
test('G03 rank V native projectile applies the enhanced normal and true DPS budgets once',()=>{
 const w=world(),p=put(w,4,'offense1');start(w);const u=subject(w,5,'raynor'),e=w.addUnit('zergling','zerg',0,3);e.hp=e.maxHp=1e8;e.armor=0;e.attributes=[];w.random=()=>.99999;u.shotInterval=u.attackPeriod;
 const v=itemValues(p),expected=(u.weaponDamage+v.dps*1.2*48*u.shotInterval)*(1+v.attack)+v.trueDps*1.2*48*u.shotInterval;
 w.hash.rebuild(w.entities.values());w.fire(u,e);for(let i=0;i<120;i++){w.time+=1/60;tickWeaponFlights(w,1/60);tickHeroAttacks(w);}close(e.maxHp-e.hp,expected);
});
test('G03 captured elite uses its own rank; an ordinary captured body has no elite rank bonus',()=>{
 const w=world(),p=put(w,4,'offense1');start(w);const u=subject(w,5);u.enemyTier='elite';close(equipmentUnitTotals(w,u).dps,itemValues(p).dps*1.2);u.enemyTier=undefined;close(equipmentUnitTotals(w,u).dps,itemValues(p).dps);
});
test('G03 carrier children share the parent high-quality rank allowance without multiplying it by child count',()=>{
 const w=world('protoss'),p=put(w,4,'offense1');start(w);const u=subject(w,5,'purifier_flagship');initializeCarrierSubsystem(w);const kids=ownedInterceptors(w,u.id);assert.ok(kids.length>1);
 const e=w.addUnit('mutalisk','zerg',0,3);e.hp=e.maxHp=1e8;let truth=0;
 for(const child of kids){child.shotInterval=child.attackPeriod;close(equipmentUnitTotals(w,child).trueDps,itemValues(p).trueDps*1.2);withEquipmentWeapon(w,child,e,()=>{truth+=w.starship.active!.truePerHit;});}
 close(truth,itemValues(p).trueDps*1.2*48*kids[0].attackPeriod);
});
test('G03 projections freeze the high-quality rank contribution before the parent grows or changes gear',()=>{
 const w=world();put(w,4,'offense1');put(w,4,'defense1');start(w);const u=subject(w,5,'raynor'),t=equipmentUnitTotals(w,u),copies=createEquipmentProjections(w,u,1,'recall',10,.5,.5);assert.equal(copies.length,1);
 const c=copies[0],frozen=w.starship.projections.get(c.id)!;u.rank=9;w.heroes.get('raynor')!.rank=9;w.refreshStats(u);assert.ok(equipmentUnitTotals(w,u).dps>t.dps);assert.deepEqual(frozen.totals,t);
 const e=w.addUnit('zergling','zerg',0,3);c.shotInterval=c.attackPeriod;withEquipmentWeapon(w,c,e,()=>close(w.starship.active!.truePerHit,t.trueDps*48*c.shotInterval));
 const hp=c.maxHp;for(let i=0;i<12;i++)w.refreshStats(c);close(c.maxHp,hp);
});
test('G03 team cards and white-pool set modifiers multiply the eligible rank contribution once',()=>{
 const w=world();const a=w.starship.account;for(const slot of ['offense1','offense2','offense3','offense4'] as const){const g=grantEquipment(a,{template:'set.advanced.enhancer_attack.4',race:'terran',slot},slot,{kind:'warehouse'});assert.ok(g.ok);assert.ok(w.equipItem(g.value.id,slot).ok);}start(w);const u=subject(w,5,'raynor'),base=equipmentTotals(w).dps;
 close(equipmentUnitTotals(w,u).dps,base*1.18*1.2);w.expedition.cardTotals['team.firepower.orange']=1;w.refreshStats(u);close(equipmentUnitTotals(w,u).dps,base*1.18*1.2*1.16);
});
test('G03 independent support keeps global base growth but cannot inherit a hero rank bonus',()=>{
 const w=world();put(w,4,'offense1');start(w);const before=equipmentCardTotals(w),damage=equipmentCardDamage(w,6000),u=subject(w,9,'raynor');assert.ok(equipmentUnitTotals(w,u).dps>before.dps);assert.deepEqual(equipmentCardTotals(w),before);close(equipmentCardDamage(w,6000),damage);
});
test('G03 equipment detail explains rank growth only for eligible attribute slots',()=>{
 const w=world(),purple=put(w,4,'offense1'),blue=put(w,3,'defense1');assert.match(equipmentDescription(purple,[purple]).stacking,/每级.*5%.*Ⅴ级20%.*Ⅸ级40%/);assert.doesNotMatch(equipmentDescription(blue,[blue]).stacking,/每级/);
});
