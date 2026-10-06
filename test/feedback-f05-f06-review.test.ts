import {settleWeaponFlights} from './helpers/weapon-flight';
import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {HEROES,ALL_HERO_IDS,heroStats} from '../src/data/heroes';
import {SOURCE_INTERCEPTOR} from '../src/data/expansion-units';
import {unitData} from '../src/simulation/combat/expedition-combat';
import {protossHeroGrowth} from '../src/data/protoss-heroes';
import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const make=(race:'terran'|'zerg'|'protoss'='terran')=>{const w=new World({race,seed:627,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();return w;};

test('F06 independent review: actual hero basic hits apply approved boost once while source damage stays unboosted',()=>{
 for(const id of ALL_HERO_IDS){
  const w=make(HEROES[id].race);assert.ok(w.acquireHero(id));const u=w.heroEntity(id)!;u.rank=3;w.refreshStats(u);u.x=u.z=0;
  const target=w.addUnit('roach','zerg',0,.8);target.hp=target.maxHp=10000;target.armor=0;w.hash.rebuild(w.entities.values());
  near(unitData(u).attackDamage,HEROES[id].damage);
  w.fire(u,target);settleWeaponFlights(w);near(10000-target.hp,u.weaponDamage*HEROES[id].attacks*(id==='nova'?1.4:id==='stukov'?1.45:id==='zeratul'?3*1.6:1));
 }
});

test('F06 independent review: injured flagship, child output and committed clocks survive save without repeat boost or hit',()=>{
 const w=make('protoss');assert.ok(w.acquireHero('purifier_flagship'));const hero=w.heroEntity('purifier_flagship')!;hero.rank=3;w.heroes.get('purifier_flagship')!.rank=3;w.refreshStats(hero);hero.x=hero.z=0;
 initializeCarrierSubsystem(w);const child=ownedInterceptors(w,hero.id)[0];child.x=child.z=0;w.refreshStats(child);
 const target=w.addUnit('roach','zerg',0,.8);target.hp=target.maxHp=10000;target.armor=0;w.fire(child,target);settleWeaponFlights(w);
 near(10000-target.hp,250*protossHeroGrowth(3).damage*1.3);
 hero.hp=hero.maxHp-71;hero.shield=hero.maxShield!-43;hero.weaponCooldown=.321;hero.nextShotAt=9;
 child.hp-=8;child.shield!-=6;child.weaponCooldown=.234;child.nextShotAt=11;
 const saved=w.captureRun(),copy=make('protoss');copy.restoreRun(saved);const loaded=copy.entities.get(hero.id)!,loadedChild=copy.entities.get(child.id)!;
 for(let n=0;n<5;n++){copy.refreshStats(loaded);copy.refreshStats(loadedChild);}
 near(loaded.maxHp-loaded.hp,71);near(loaded.maxShield!-loaded.shield!,43);near(loaded.weaponCooldown,.321);near(loaded.nextShotAt,9);
 near(loadedChild.maxHp-loadedChild.hp,8);near(loadedChild.maxShield!-loadedChild.shield!,6);near(loadedChild.weaponCooldown,.234);near(loadedChild.nextShotAt,11);
 near(loadedChild.weaponDamage,child.weaponDamage);near(loadedChild.attackPeriod,child.attackPeriod);near(copy.entities.get(target.id)!.hp,target.hp);
 assert.equal(copy.visualEvents.length,0);assert.equal(ownedInterceptors(copy,hero.id).length,ownedInterceptors(w,hero.id).length);
});

test('F05 independent review: invalid worker counts and renamed rescue counters reject before live state changes',()=>{
 const w=make(),before=w.captureRun();
 for(const value of [NaN,Infinity,-1,.5]){const bad=structuredClone(before);bad.state.workers=value;assert.throws(()=>w.restoreRun(bad),/工人/);assert.deepEqual(w.captureRun(),before);}
 for(const key of ['workersRescued','workersLost'] as const)for(const value of [undefined,NaN,Infinity,-1,.5]){const bad=structuredClone(before);(bad.state.stats as any)[key]=value;assert.throws(()=>w.restoreRun(bad),/工人/);assert.deepEqual(w.captureRun(),before);}
});
