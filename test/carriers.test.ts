import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES} from '../src/data/races';
import {SOURCE_ABILITIES,SOURCE_INTERCEPTOR} from '../src/data/expansion-units';
import {initializeCarrierSubsystem,tickCarrierSubsystem,tickInterceptor,refreshInterceptorStats,ownedInterceptors,cleanupCarrierSummons,fireInterceptor,interceptorUnitData} from '../src/simulation/combat/carriers';

const source=SOURCE_INTERCEPTOR,seconds=SOURCE_ABILITIES.carrierHangar.replacementSeconds;
function setup(minerals=0,owner:'terran'|'zerg'='terran'){const w=new World({rulesVersion:THREE_RACE_RULES,race:'protoss',waves:false,sandbox:true,terrain:false,obstacles:[],seed:42});w.start();w.wallet.minerals=minerals;w.wallet.gas=7;const carrier=w.addUnit('carrier',owner,0,0);initializeCarrierSubsystem(w);return {w,carrier};}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('a new carrier has four source-stat targetable interceptors without extra family or rank slots',()=>{
 const {w,carrier}=setup(),children=ownedInterceptors(w,carrier.id);assert.equal(children.length,4);assert.equal(w.familyUnits('carrier').length,1);assert.equal(w.ordinaryUnits('carrier').length,1);assert.equal(w.wallet.minerals,0);
 for(const u of children){assert.equal(u.summonOwnerId,carrier.id);assert.equal(u.summonKind,'interceptor');assert.equal(u.temporary,true);assert.equal(u.modelKey,'interceptor');assert.equal(u.hp,40);assert.equal(u.shield,40);assert.equal(u.armor,0);assert.equal(u.rank,1);assert.equal(u.moveSpeed,10.5);assert.equal(u.weaponDamage,5);assert.equal(u.attackPeriod,source.weapon.attackPeriod);assert.equal(u.flying,true);assert.deepEqual(u.attributes,['Light','Mechanical']);assert.equal(u.heroId,undefined);assert.equal(u.eliteId,undefined);assert.equal(u.carrierHangar,undefined);}
 assert.equal(interceptorUnitData().attacks,2);assert.equal(interceptorUnitData().targetType,'both');
});
test('initialization and save restoration never reissue the four included children or erase paid progress',()=>{
 const {w,carrier}=setup(100);tickCarrierSubsystem(w,3);const child=ownedInterceptors(w,carrier.id)[0];child.hp=17;child.shield=9;const job=structuredClone(carrier.carrierHangar!.job);assert.equal(w.wallet.minerals,85);near(job!.remaining,seconds-3);initializeCarrierSubsystem(w);assert.equal(ownedInterceptors(w,carrier.id).length,4);
 const copy=new World({rulesVersion:THREE_RACE_RULES,race:'protoss',waves:false,sandbox:true,terrain:false,obstacles:[],seed:42});copy.restoreRun(w.captureRun());initializeCarrierSubsystem(copy);const restored=copy.entities.get(carrier.id)!;assert.equal(ownedInterceptors(copy,carrier.id).length,4);assert.equal(copy.entities.get(child.id)!.hp,17);assert.equal(copy.entities.get(child.id)!.shield,9);assert.deepEqual(restored.carrierHangar!.job,job);assert.equal(copy.wallet.minerals,85);copy.paused=false;tickCarrierSubsystem(copy,seconds-3);assert.equal(ownedInterceptors(copy,carrier.id).length,5);assert.equal(copy.wallet.minerals,70,'the next sequential paid job starts once');
});
test('one replacement requires an actual 15 mineral payment and a complete sequential construction time',()=>{
 const {w,carrier}=setup();tickCarrierSubsystem(w,100);assert.equal(ownedInterceptors(w,carrier.id).length,4);assert.equal(carrier.carrierHangar!.job,null);w.wallet.minerals=15;tickCarrierSubsystem(w,seconds-.1);assert.equal(w.wallet.minerals,0);assert.equal(w.wallet.gas,7);assert.equal(ownedInterceptors(w,carrier.id).length,4);near(carrier.carrierHangar!.job!.remaining,.1);tickCarrierSubsystem(w,.1);assert.equal(ownedInterceptors(w,carrier.id).length,5);assert.equal(carrier.carrierHangar!.job,null);assert.equal(w.economyTotals.production.minerals,15);
});
test('each mother reaches eight at most and a killed child consumes a new paid job',()=>{
 const {w,carrier}=setup(1000);tickCarrierSubsystem(w,seconds*4);assert.equal(ownedInterceptors(w,carrier.id).length,8);assert.equal(w.wallet.minerals,940);assert.equal(carrier.carrierHangar!.job,null);tickCarrierSubsystem(w,1000);assert.equal(ownedInterceptors(w,carrier.id).length,8);assert.equal(w.wallet.minerals,940);
 const child=ownedInterceptors(w,carrier.id)[0];w.hit(child,1000,[],1,'zerg',0,0);assert.equal(child.hp,0);initializeCarrierSubsystem(w);assert.equal(ownedInterceptors(w,carrier.id).length,7);tickCarrierSubsystem(w,0);assert.equal(w.wallet.minerals,925);assert.equal(ownedInterceptors(w,carrier.id).length,7);tickCarrierSubsystem(w,seconds);assert.equal(ownedInterceptors(w,carrier.id).length,8);assert.equal(w.wallet.minerals,925);
});
test('paid jobs freeze in intermission, pause and required decisions, then resume their remaining time',()=>{
 const {w,carrier}=setup(60);tickCarrierSubsystem(w,1);const expected=carrier.carrierHangar!.job!.remaining;w.phase='reward';tickCarrierSubsystem(w,100);near(carrier.carrierHangar!.job!.remaining,expected);w.phase='battle';w.paused=true;tickCarrierSubsystem(w,100);near(carrier.carrierHangar!.job!.remaining,expected);w.paused=false;w.expedition!.pendingReceipt={id:'pending',podId:500,passengerIndex:0,family:'stalker',readyTick:w.tick};tickCarrierSubsystem(w,100);near(carrier.carrierHangar!.job!.remaining,expected);w.expedition!.pendingReceipt=null;tickCarrierSubsystem(w,1);near(carrier.carrierHangar!.job!.remaining,expected-1);
});
test('mother death or removal retires all children, abandons paid work and cannot mint loot or resources',()=>{
 const {w,carrier}=setup(100);tickCarrierSubsystem(w,1);const before={wallet:{...w.wallet},drops:w.pickups.length,kills:w.stats.kills};carrier.hp=0;cleanupCarrierSummons(w);assert.equal(ownedInterceptors(w,carrier.id).length,0);assert.equal(carrier.carrierHangar!.job,null);assert.deepEqual(w.wallet,before.wallet);assert.equal(w.pickups.length,before.drops);assert.equal(w.stats.kills,before.kills);
 const other=w.addUnit('carrier','terran',5,5);initializeCarrierSubsystem(w);assert.equal(ownedInterceptors(w,other.id).length,4);w.entities.delete(other.id);cleanupCarrierSummons(w);assert.equal(ownedInterceptors(w,other.id).length,0);
});
test('enemy-owned carriers never charge the player wallet and children keep their actual allegiance',()=>{
 const {w,carrier}=setup(1000,'zerg');tickCarrierSubsystem(w,100);assert.equal(w.wallet.minerals,1000);assert.equal(ownedInterceptors(w,carrier.id).length,4);for(const u of ownedInterceptors(w,carrier.id)){assert.equal(u.owner,'zerg');assert.equal(u.team,'enemy');assert.equal(u.race,'protoss');}
});
test('scoped carrier output is applied exactly once while mother shield/rank health bonuses do not leak',()=>{
 const {w,carrier}=setup();w.runConfig!.frozenTalents.levels={'P-S01':3,'P-S02':3,'P-S11':3};w.expedition!.cardTotals['weapon.carrier']=.2;w.expedition!.tech['protoss.air_weapon']=2;carrier.rank=3;
 const u=ownedInterceptors(w,carrier.id)[0],growth=w.growth(carrier),expected=7*growth.damage*1.2*1.6;for(let n=0;n<10;n++){refreshInterceptorStats(w,u);near(u.weaponDamage,expected);near(u.attackPeriod,source.weapon.attackPeriod/growth.attackSpeed/1.15);assert.equal(u.maxHp,40);assert.equal(u.maxShield,40);assert.equal(u.rank,1);}
 u.hp=10;u.shield=5;refreshInterceptorStats(w,u);assert.equal(u.hp,10);assert.equal(u.shield,5);
});
test('interceptor attacks apply two source hits to legal ground or air targets after the source windup',()=>{
 const {w,carrier}=setup(),u=ownedInterceptors(w,carrier.id)[0],enemy=w.addUnit('roach','zerg',1,0);enemy.hp=enemy.maxHp=1000;enemy.armor=1;carrier.attackTarget=enemy.id;tickInterceptor(w,u,.01);assert.equal(enemy.hp,1000);assert.equal(u.pendingTarget,enemy.id);w.time+=.1;tickInterceptor(w,u,.1);assert.equal(enemy.hp,1000);w.time+=.03;tickInterceptor(w,u,.03);assert.equal(enemy.hp,992);assert.equal(u.pendingTarget,null);assert.equal(w.stats.shots,1);
 const air=w.addUnit('mutalisk','zerg',1,0);air.hp=air.maxHp=1000;air.armor=0;assert.equal(fireInterceptor(w,u,air),true);assert.equal(air.hp,990);assert.equal(fireInterceptor(w,u,carrier),false);
});
test('child shield recovery uses its source delay and HP remains damaged without a healer',()=>{
 const {w,carrier}=setup(),u=ownedInterceptors(w,carrier.id)[0];u.hp=20;u.shield=0;u.lastDamagedAt=0;w.time=source.shieldRegenDelay-.01;tickInterceptor(w,u,.1);assert.equal(u.shield,0);w.time=source.shieldRegenDelay;tickInterceptor(w,u,1);near(u.shield!,2.8);assert.equal(u.hp,20);
});
test('summons return toward their mother and do not follow the player anchor as squad members',()=>{
 const {w,carrier}=setup(),u=ownedInterceptors(w,carrier.id)[0];carrier.x=20;carrier.z=0;w.anchor.x=-30;u.x=0;u.z=0;w.time=1;tickInterceptor(w,u,.1);assert.ok(u.x>0);near(Math.hypot(u.x,u.z),1.05);assert.equal(u.attackTarget,null);assert.equal(tickInterceptor(w,carrier,.1),false);
});
