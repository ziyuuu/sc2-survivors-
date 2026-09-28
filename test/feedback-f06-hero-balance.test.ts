import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {HEROES,heroStats,type HeroId} from '../src/data/heroes';
import {acquireExpeditionHero,refreshExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import {initializeCarrierSubsystem,ownedInterceptors,refreshInterceptorStats} from '../src/simulation/combat/carriers';
import {SOURCE_INTERCEPTOR} from '../src/data/expansion-units';

const rows: [HeroId,number,number,number,number][]=[
 ['raynor',1400,0,28,.18],['tychus',1500,0,14,.08],['nova',1200,0,100,.7],['swann',1400,0,28,.4],['tosh',1300,0,52,.4],
 ['kerrigan',1500,0,52,.36],['zagara',1300,0,36,.36],['dehaka',1600,0,80,.6],['stukov',1400,0,50,.44],['niadra',1400,0,32,.45],
 ['artanis',750,750,34,.55],['zeratul',600,600,90,.5],['alarak',1000,500,85,.6],['fenix',800,800,72,.5],['vorazun',600,600,75,.5],
 ['yamato_battlecruiser',1600,0,40,.65],['hots_leviathan',1600,0,60,.55],['purifier_flagship',850,750,0,1],
];
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const [id,hp,shield,damage,period] of rows)test(`F06 ${id}: approved durability/output at ranks 1/3/5, refresh preserves losses and clocks`,()=>{
 const w=new World({race:HEROES[id].race,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 assert.ok(acquireExpeditionHero(w,id,()=>true));const u=w.heroEntity(id)!;
 for(const rank of [1,3,5]){
  u.rank=rank;refreshExpeditionHero(w,u,true);const g=heroStats(rank);
  near(u.maxHp,hp*g.health*1.15);near(u.maxShield??0,shield*g.health*1.15);
  near(u.weaponDamage,damage*g.damage*1.15*1.15);near(u.attackPeriod,period/g.attackSpeed/1.15/1.15);
  u.hp-=71;if(u.maxShield)u.shield!-=43;u.weaponCooldown=.123;u.nextShotAt=17;
  for(let i=0;i<3;i++)refreshExpeditionHero(w,u);
  near(u.maxHp-u.hp,71);if(u.maxShield)near(u.maxShield-u.shield!,43);
  near(u.weaponCooldown,.123);near(u.nextShotAt,17);
 }
});
test('F06 flagship interceptor output inherits the boost exactly once; ordinary carrier stays unchanged',()=>{
 const w=new World({race:'protoss',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 const ordinary=w.addUnit('carrier','terran',0,0);assert.ok(acquireExpeditionHero(w,'purifier_flagship',()=>true));
 const hero=w.heroEntity('purifier_flagship')!;initializeCarrierSubsystem(w);
 const normalChild=ownedInterceptors(w,ordinary.id)[0],child=ownedInterceptors(w,hero.id)[0];
 for(const rank of [1,3,5]){hero.rank=rank;refreshExpeditionHero(w,hero);for(let i=0;i<3;i++)refreshInterceptorStats(w,child);
  const g=heroStats(rank);near(child.weaponDamage,SOURCE_INTERCEPTOR.weapon.attackDamage*1.2*g.damage*1.15*1.15);
  near(child.attackPeriod,SOURCE_INTERCEPTOR.weapon.attackPeriod/g.attackSpeed/1.15/1.15);
 }
 refreshInterceptorStats(w,normalChild);near(normalChild.weaponDamage,SOURCE_INTERCEPTOR.weapon.attackDamage*1.15);near(normalChild.attackPeriod,SOURCE_INTERCEPTOR.weapon.attackPeriod/1.15);
});
