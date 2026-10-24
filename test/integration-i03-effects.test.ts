import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment,equipmentRandom} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {ATTRIBUTE_SLOTS,type EquipmentBinding} from '../src/simulation/starship/types';
import {activeEquipmentEffects,equipmentValue,tickEquipmentModules,prepareEquipmentShelf} from '../src/simulation/starship/modules';
import {equipmentUnitTotals,equipmentTotals,equipmentRecoveryFactor,tickStarship} from '../src/simulation/starship/runtime';
import {tickEquipmentCombat} from '../src/simulation/starship/combat';
import {tickEquipmentSupport} from '../src/simulation/starship/support';
import {equipmentStageMembers,deliverEquipmentMembers} from '../src/simulation/starship/members';
import {worldBuildingContext} from '../src/simulation/building/expedition';
import {productionQuote,updateExpeditionProduction} from '../src/simulation/expedition-production';
import {draftContext,purchaseOffer,developmentOffers} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements} from '../src/simulation/progression/expedition-drafts';
import {qualityWeightedPool,equipmentDropPolicy} from '../src/simulation/starship/drops';
import {talentModifiers,expeditionWeaponBonuses,tickExpeditionRecovery} from '../src/simulation/combat/expedition-combat';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import type {CombatUnitType,Entity} from '../src/simulation/types';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
let triggerSeed=1;while(equipmentRandom(newEquipmentAccount(triggerSeed))>=.001)triggerSeed++;
function setup(template?:string,count=6,binding:EquipmentBinding={},race:'terran'|'zerg'|'protoss'='terran'){
 const w=new World({race,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
 if(template){const t=EQUIPMENT_TEMPLATES[template];for(const slot of t.kind==='set'?ATTRIBUTE_SLOTS.slice(0,count):t.slots.slice(0,1)){
  const r=grantEquipment(w.starship.account,{template,race,slot,binding,polluted:t.pollution==='required'},'i03-effect:'+slot,{kind:'warehouse'});assert.ok(r.ok);
  if(t.pollution==='required'){w.starship.account.dust=10000;assert.ok(cleanseEquipment(w.starship.account,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,slot).ok);
 }}if(template==='module.contract.4')assert.ok(w.setDevelopmentTarget('barracks'));assert.ok(w.start());w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;
}
function foe(w:World,x=0,z=3){const e=w.addUnit('zergling','zerg',x,z);e.hp=e.maxHp=1e6;e.armor=0;w.hash.rebuild(w.entities.values());return e;}
function actor(w:World,type:CombatUnitType='marine'){const u=type==='marine'?w.allies()[0]:w.addUnit(type,'terran',0,0);u.x=0;u.z=0;u.prev={x:0,z:0};return u;}
function shoot(w:World,u:Entity,e:Entity){u.shotInterval=u.attackPeriod;w.starship.account.rng=triggerSeed;w.fire(u,e);}

test('I03 long blade changes real melee reach and hits an additional enemy through native cleave',()=>{
 const w=setup('module.blade.4'),u=actor(w,'zealot'),plain=actor(setup(),'zealot');close(u.attackRange-plain.attackRange,.5);const a=foe(w,0,1),b=foe(w,.3,1),far=foe(w,0,10);shoot(w,u,a);assert.ok(b.hp<b.maxHp);assert.equal(far.hp,far.maxHp);
});
test('I03 telescope increases native range, distance damage and two legal piercing targets',()=>{
 const w=setup('module.telescope.4'),u=actor(w),plain=actor(setup());close(u.attackRange,plain.attackRange*1.1);const near=foe(w,0,1);shoot(w,u,near);const nearDamage=near.maxHp-near.hp,a=foe(w,0,3),b=foe(w,0,4),c=foe(w,0,5),side=foe(w,3,3);shoot(w,u,a);assert.ok(a.maxHp-a.hp>nearDamage);assert.ok(b.hp<b.maxHp&&c.hp<c.maxHp);assert.equal(side.hp,side.maxHp);
});
test('I03 unstable rifling executes only ordinary enemies, chains and respects its shared cooldown',()=>{
 const w=setup('special.unstable.4'),u=actor(w),a=foe(w),b=foe(w,1,3),elite=foe(w,-1,3);b.hp=b.maxHp*.2;elite.enemyTier='elite';shoot(w,u,a);assert.equal(a.hp,0);assert.equal(b.hp,0);assert.equal(elite.hp,elite.maxHp);const c=foe(w,0,4);shoot(w,u,c);assert.ok(c.hp>0);assert.ok(w.starship.numbers.get('execute-ready')!>w.time);
});
test('I03 overload pays real HP once and chains from a killed ordinary body without recursion',()=>{
 const w=setup('set.advanced.overload.4'),u=actor(w),a=foe(w),b=foe(w,0,5.6),c=foe(w,0,8);b.hp=1;const hp=u.hp;shoot(w,u,a);assert.equal(b.hp,0);assert.ok(c.hp<c.maxHp);close(hp-u.hp,u.maxHp*.05);const after=u.hp;shoot(w,u,a);close(u.hp,after);
});
test('I03 precision stores three real critical hits then spends one penetrative fourth hit',()=>{
 const w=setup('set.advanced.precision.4'),u=actor(w),e=foe(w);w.random=()=>0;for(let n=0;n<3;n++)shoot(w,u,e);assert.equal(w.starship.combat.precision.get(u.id)?.ready,true);w.random=()=>1;e.armor=10;const before=e.hp;shoot(w,u,e);assert.ok(before-e.hp>0);assert.equal(w.starship.combat.precision.get(u.id)?.ready,false);assert.equal(w.starship.combat.precision.get(u.id)?.cooldown,8);
});
test('I03 breakthrough starts one native critical pursuit after a kill',()=>{
 const w=setup('set.advanced.breakthrough.4'),u=actor(w),a=foe(w),b=foe(w,1,3);a.hp=1;w.random=()=>0;shoot(w,u,a);assert.equal(a.hp,0);assert.ok(b.hp<b.maxHp);assert.equal(w.starship.numbers.get('pursuit:'+u.id),1);
});
test('I03 moving-fire and light-assault effects require sustained real movement and expire',()=>{
 for(const template of ['module.moving_fire.4','set.advanced.light.4']){const w=setup(template),u=actor(w),a=foe(w),b=foe(w,.6,3);tickEquipmentCombat(w);for(let t=1;t<=4;t++){w.time=t;u.x+=.1;tickEquipmentCombat(w);}const period=u.attackPeriod;shoot(w,u,a);if(template==='module.moving_fire.4'){assert.ok(b.hp<b.maxHp);assert.ok(w.starship.numbers.get('moving-extra:'+u.id)!>w.time);}else {assert.ok(u.attackPeriod<period);assert.equal(w.starship.combat.movement.get(u.id)?.assaultReady,false);w.time=4.01;tickEquipmentCombat(w);w.time=8;tickEquipmentCombat(w);close(u.attackPeriod,period);}}
});
test('I03 team and hold volleys submit real attacks only when their live conditions hold',()=>{
 for(const template of ['set.advanced.team.4','set.advanced.hold.4']){const w=setup(template),u=actor(w),e=foe(w);u.attackTarget=e.id;w.time=20;const before=e.hp;tickEquipmentCombat(w);assert.ok(e.hp<before);const after=e.hp;tickEquipmentCombat(w);assert.equal(e.hp,after);}
});
test('I03 scorched ground and movement trails apply finite real burn damage',()=>{
 const w=setup('set.advanced.scorched.4'),u=actor(w),e=foe(w);u.attackTarget=e.id;w.time=20;tickEquipmentCombat(w);assert.ok(w.starship.burnZones.length);w.anchor.z=3;tickEquipmentCombat(w);assert.ok(w.starship.burnZones.length>=2);const hp=e.hp;for(let t=21;t<=27;t++){w.time=t;tickEquipmentSupport(w);}assert.ok(e.hp<hp);assert.equal(w.starship.burnZones.length,0);
});
test('I03 sustain waits for continuous engagement and restores real missing HP',()=>{
 const w=setup('set.advanced.sustain.4'),u=actor(w),e=foe(w);u.hp*=.3;u.attackTarget=e.id;const hp=u.hp;for(let t=0;t<12;t++){w.time=t;tickEquipmentCombat(w);assert.equal(u.hp,hp);}w.time=12;tickEquipmentCombat(w);close(u.hp-hp,u.maxHp*.03);
});
test('I03 wall counter displaces nearby ordinary enemies and does not move elite bodies',()=>{
 const w=setup('set.advanced.wall.4'),u=actor(w),a=foe(w,0,2),b=foe(w,2,0);b.enemyTier='elite';w.hit(u,u.maxHp*.5,[],1,'zerg',0,1,a.id);assert.ok(a.z>2);assert.equal(b.x,2);const z=a.z;w.hit(u,1,[],1,'zerg',0,1,a.id);assert.equal(a.z,z);
});
test('I03 native bonus damage is tripled by counter weapon while the main packet stays native',()=>{
 const a=setup(),b=setup('special.counter.4'),u=actor(a,'marauder'),v=actor(b,'marauder'),base=expeditionWeaponBonuses(a,u),gear=expeditionWeaponBonuses(b,v);assert.ok(base.bonuses.length);for(const row of base.bonuses)close(gear.bonuses.find(b=>b.attribute===row.attribute)!.amount,row.amount*3);const totals=equipmentUnitTotals(b,v);assert.ok(totals.dps>=0);
});
test('I03 drone hunter and mentor promote real members once from an actual economic death',()=>{
 const w=setup('set.advanced.drone_hunter.4'),u=actor(w),v=w.addUnit('marine','terran',1,0),drone=w.spawnEconomic('drone',{x:0,z:2});w.starship.account.rng=triggerSeed;w.hit(drone,1e12,[],1,'terran',0,1,u.id);assert.equal(u.rank,2);assert.equal(v.rank,2);w.hit(drone,1e12,[],1,'terran',0,1,u.id);assert.equal(u.rank,2);
});
test('I03 opening troop clauses create their declared real bodies through production initialization',()=>{
 for(const [template,type,count]of [['set.dogs.2','zergling',6],['module.wind_serpent.2','hydralisk',1],['module.elephant.4','ultralisk',1],['set.advanced.team.4','marine',3]] as const){const w=setup(template);const bodies=w.allies().filter(u=>u.unitType===type);assert.equal(bodies.length,count,template);if(type==='ultralisk')assert.ok(bodies[0].eliteId);}
 const lost=setup('set.special.lost.4',4);assert.equal(lost.allies().find(u=>u.eliteId==='high_templar.1')?.rank,3);assert.equal(lost.allies().find(u=>u.eliteId==='adept.3')?.rank,5);
});
test('I03 fleet and reinforcement clauses deliver real additional bodies and retain their expiry',()=>{
 const w=setup('set.advanced.fleet.4',4),fleet=w.allies().find(u=>w.starship.members.get(u.id)?.origin==='opening_fleet')!;assert.ok(fleet.eliteId);const e=foe(w);fleet.attackTarget=e.id;w.time=20;tickEquipmentModules(w);const reinforcements=w.allies().filter(u=>w.starship.members.get(u.id)?.origin==='fleet_reinforcement');assert.equal(reinforcements.length,2);assert.ok(reinforcements.every(u=>u.temporary&&u.temporaryUntil===35));
 const b=setup('module.reinforcement.4');b.time=60;tickEquipmentModules(b);assert.ok(b.allies().some(u=>u.eliteId&&u.rank===3&&u.temporaryUntil===120));
});
test('I03 sky support grants one body per stage and never duplicates the stage receipt',()=>{
 const w=setup('set.special.sky.4',2),count=()=>w.allies().filter(u=>u.unitType==='yamato_battlecruiser').length;assert.equal(count(),1);equipmentStageMembers(w);deliverEquipmentMembers(w);assert.equal(count(),1);w.stage++;equipmentStageMembers(w);deliverEquipmentMembers(w);assert.equal(count(),2);
});
test('I03 rescue module doubles the actual rescued worker payment and queues one real elite',()=>{
 const w=setup('module.rescue.4'),u=actor(w),egg=w.spawnEconomic('egg',{x:0,z:2}),workers=w.workers;w.starship.account.rng=triggerSeed;w.hit(egg,1e12,[],1,'terran',0,1,u.id);assert.equal(w.workers-workers,4);deliverEquipmentMembers(w);assert.ok(w.allies().some(u=>u.eliteId&&u.rank===2));const count=w.entities.size;w.hit(egg,1e12,[],1,'terran',0,1,u.id);deliverEquipmentMembers(w);assert.equal(w.entities.size,count);assert.equal(w.workers-workers,4);
});
test('I03 direction recruiting discount affects the paid recipe and leaves other directions unchanged',()=>{
 const w=setup('set.blue.army.3',4,{direction:'barracks'});assert.equal(productionQuote(w,'marine').minerals,46);assert.equal(productionQuote(w,'hellion').minerals,100);
});
test('I03 double pickup module shifts only the boss quality weights',()=>{
 const w=setup('module.double_pickup.3'),p=equipmentDropPolicy({difficulty:'hell',stage:13,tier:'boss'});assert.deepEqual(qualityWeightedPool(w,p.guaranteed,false),p.guaranteed);const rows=qualityWeightedPool(w,p.guaranteed,true),highest=Math.max(...p.guaranteed.map(r=>r.quality));assert.ok(rows.filter(r=>r.quality===highest).every(r=>r.weight>p.guaranteed.find(x=>x.category===r.category&&x.quality===r.quality)!.weight));
});
test('I03 contract equipment pays for the second building and grants lawful research through the normal offer',()=>{
 const w=setup('module.contract.4');w.wallet={minerals:10000,gas:10000};w.endStage();const offer=w.rewards.find(r=>'expeditionEffect'in r&&r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId==='barracks')!;assert.ok(offer);const count=w.expedition.facilities.filter(f=>f.kind==='barracks').length,money=w.wallet.minerals,tech=JSON.stringify(w.expedition.tech);w.random=()=>0;assert.ok(w.choose(offer.offerId));assert.equal(w.expedition.facilities.filter(f=>f.kind==='barracks').length-count,2);assert.equal(money-w.wallet.minerals,offer.minerals);assert.notEqual(JSON.stringify(w.expedition.tech),tech);assert.equal(w.choose(offer.offerId),false);
});
test('I03 shop grants one free refresh, improved weights, one free product and a claimable paid-copy receipt',()=>{
 const w=setup('module.shop.4');w.wallet={minerals:10000,gas:10000};w.endStage();w.skipReward();assert.equal(w.rerollCost(),0);const weights:number[]=[],random=w.random;w.random=()=>{weights.push(draftContext(w).highQualityWeight??0);return random();};assert.ok(w.reroll());assert.ok(weights.includes(.2));assert.equal(draftContext(w).highQualityWeight,0);assert.ok(w.rerollCost()>0);
 let offer;for(let n=0;n<10000&&!offer;n++)offer=drawExpeditionReinforcements(draftContext(w),true).find(r=>r.expeditionEffect.kind==='teamCard');assert.ok(offer);const shelf=[structuredClone(offer)];w.starship.account.rng=triggerSeed;prepareEquipmentShelf(w,shelf);assert.equal(shelf[0].minerals+shelf[0].gas,0);const rng=w.starship.account.rng;prepareEquipmentShelf(w,shelf);assert.equal(w.starship.account.rng,rng);
 w.rewards=[offer];assert.ok(purchaseOffer(w,offer.offerId));assert.equal(w.starship.cards.length,1);const copy=w.starship.cards[0],before=JSON.stringify(w.expedition.cardTotals);assert.ok(w.claimEquipmentCard(copy.id));assert.notEqual(JSON.stringify(w.expedition.cardTotals),before);assert.equal(w.claimEquipmentCard(copy.id),false);
});
test('I03 purchase discounts use hero prices and a paid native hero receives the extra rank',()=>{
 const w=setup('module.purchase.4');w.expedition.heroRewardsUnlocked=true;w.stage=17;w.wallet={minerals:10000,gas:10000};w.endStage();w.skipReward();let offer;for(let n=0;n<20000&&!offer;n++)offer=drawExpeditionReinforcements(draftContext(w),true).find(r=>r.expeditionEffect.kind==='hero');assert.ok(offer);const price={m:offer.minerals,g:offer.gas};prepareEquipmentShelf(w,[offer]);assert.equal(offer.minerals,Math.max(0,price.m-100));assert.equal(offer.gas,Math.max(0,price.g-50));w.rewards=[offer];assert.ok(purchaseOffer(w,offer.offerId));assert.equal(w.heroEntity((offer.expeditionEffect as any).heroId)?.rank,2);
});
test('I03 singularity raises live hero and research caps while retaining three hero identity seats',()=>{
 const w=setup('module.singularity.5');assert.equal(worldBuildingContext(w)?.researchLimit,4);for(let n=0;n<9;n++)assert.ok(w.acquireHero('raynor'));assert.equal(w.heroEntity('raynor')?.rank,9);assert.equal(w.acquireHero('raynor'),false);assert.ok(w.acquireHero('tychus'));assert.ok(w.acquireHero('nova'));assert.equal(w.acquireHero('tosh'),false);
});
test('I03 rapid deployment shortens a real native tank transition',()=>{
 const a=setup(),b=setup('module.rapid.3'),u=actor(a,'tank'),v=actor(b,'tank');for(const [w,body]of [[a,u],[b,v]] as const){body.desiredMode='siege';w.updateUnit(body,1/60);}assert.ok(v.modeTimer>0&&v.modeTimer<u.modeTimer);close(talentModifiers(b,v).transformTimeReductionPct!, .66);
});
test('I03 stat and white-stat families change real unit vitals and attacks without repeated refresh drift',()=>{
 for(const template of ['set.advanced.enhancer_attack.4','set.advanced.enhancer_defense.4','set.advanced.enhancer_speed.4','set.advanced.wall.4','set.advanced.precision.4','set.advanced.sustain.4']){const w=setup(template),u=actor(w),totals=equipmentUnitTotals(w,u),plain=actor(setup());assert.ok(u.maxHp>plain.maxHp&&u.attackPeriod<plain.attackPeriod);const hp=u.maxHp,period=u.attackPeriod;u.hp*=.4;for(let n=0;n<20;n++)w.refreshStats(u);close(u.maxHp,hp);close(u.hp/hp,.4);close(u.attackPeriod,period);const e=foe(w);shoot(w,u,e);assert.ok(e.hp<e.maxHp);assert.ok(totals.attack>=0&&totals.reduction>=0);if(template.includes('enhancer_attack'))assert.ok(totals.dps>equipmentTotals(w).dps);if(template.includes('enhancer_defense'))assert.ok(totals.hp>equipmentTotals(w).hp&&totals.armor>equipmentTotals(w).armor);if(template.includes('enhancer_speed'))assert.ok(u.moveSpeed>plain.moveSpeed&&totals.dodge>0);if(template.includes('wall'))assert.ok(equipmentRecoveryFactor(w,u)>1);}
});
test('I03 bound elite attack applies only to the specific bound identity body',()=>{
 const w=setup('set.blue.elite.3',6,{elite:'marine.1'}),bound=w.allies().find(u=>u.eliteId==='marine.1')!;assert.ok(bound);const second=w.addUnit('marine','terran',4,0);second.eliteId='marine.1';w.refreshStats(second);close(equipmentUnitTotals(w,bound).attack-equipmentUnitTotals(w,second).attack,.05);const ordinary=w.allies().find(u=>!u.eliteId)!;close(equipmentUnitTotals(w,second).attack-equipmentUnitTotals(w,ordinary).attack,.15);
});
