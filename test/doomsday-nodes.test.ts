import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newDoomsdayState} from '../src/simulation/combat/doomsday-state';
import {tickDoomsdayNodes,doomsdayRepaired,doomsdayNodeHit} from '../src/simulation/combat/doomsday-nodes';
import {tickDoomsdayDual} from '../src/simulation/combat/doomsday-dual';
import {acquireDoomsdayBlueprint} from '../src/simulation/combat/doomsday-refits';
import {grantMechanicalPolarization,reconcileMechanicalRecruits,mechanicalMemberCap} from '../src/simulation/combat/doomsday-growth';
import {applyDoomsdayPurchase,claimDoomsdayNode} from '../src/simulation/combat/doomsday';
import {reconcileMechanicalSeats,mechanicalMember} from '../src/simulation/combat/doomsday-roster';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {giantBaseline,tickDoomsdayGiants} from '../src/simulation/combat/doomsday-orange';
import type {DoomsdayId} from '../src/data/terran-doomsday';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);
function make(...cards:DoomsdayId[]){const w=new World({race:'terran',seed:171101,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.entities.clear();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.expedition.doomsday=newDoomsdayState();for(const id of cards)w.expedition.doomsday.ranks[id]=1;return w;}
function target(w:World,x=0,z=5,air=false){const u=w.addUnit(air?'mutalisk':'roach','zerg',x,z);u.hp=u.maxHp=1e7;u.armor=0;u.attributes=[];return u;}
function tick(w:World,n:number,dual=false){for(let i=0;i<n;i++){w.tick++;w.time=w.tick/60;if(dual)tickDoomsdayDual(w);tickWeaponFlights(w,1/60);tickDoomsdayNodes(w);}}
test('P01 rebuilds native and elite caps without granting ranks or stacking growth',()=>{
 const w=make(),u=w.addUnit('tank','terran',0,0,5),base=u.weaponDamage,hp=u.maxHp;w.expedition.doomsday!.ranks['M-P01']=1;w.refreshStats(u);assert.equal(u.rank,5);assert.equal(mechanicalMemberCap(w,u),7);assert.ok(u.weaponDamage>base);assert.ok(u.maxHp>hp);const saved=u.weaponDamage;w.refreshStats(u);close(u.weaponDamage,saved);
 u.eliteId='tank.3';u.rank=7;w.refreshStats(u);assert.ok(Number.isFinite(u.weaponDamage));assert.equal(mechanicalMemberCap(w,u),7);assert.ok(w.cultivationUnits('tank').length===0);
});
test('N03 directly grants mechanical V to VII without P01, excluding biological troops and heroes',()=>{
 const w=make(),u=w.addUnit('tank','terran',0,0,5),marine=w.addUnit('marine','terran',1,0,3);w.acquireHero('raynor');const hero=w.heroEntity('raynor')!;
 assert.ok(claimDoomsdayNode(w,'M-N03'));assert.equal(u.rank,7);assert.equal(mechanicalMemberCap(w,u),7);assert.equal(marine.rank,3);assert.equal(mechanicalMemberCap(w,marine),5);assert.equal(w.soldierCap('marine'),5);assert.equal(hero.rank,1);grantMechanicalPolarization(w);assert.equal(u.rank,7);
 w.expedition.doomsday!.nodeReserves['M-N03']=1;const biological=w.addUnit('marine','terran',2,0,1);reconcileMechanicalRecruits(w);assert.equal(biological.rank,1);assert.equal(w.expedition.doomsday!.nodeReserves['M-N03'],1);
 const recruit=w.addUnit('tank','terran',3,0,1);reconcileMechanicalRecruits(w);assert.equal(recruit.rank,6);assert.equal(w.expedition.doomsday!.nodeReserves['M-N03'],0);reconcileMechanicalRecruits(w);assert.equal(recruit.rank,6);
 const copy=make();copy.restoreRun(w.captureRun());reconcileMechanicalRecruits(copy);assert.equal(copy.entities.get(marine.id)!.rank,3);assert.equal(copy.entities.get(u.id)!.rank,7);assert.equal(copy.entities.get(recruit.id)!.rank,6);
});

test('P03 and N03 work in either order, grant converted troops two ranks once and leave reserves for arrivals',()=>{
 for(const first of ['M-P03','M-N03'] as const){
  const w=make(),marine=w.addUnit('marine','terran',0,0,5);w.expedition.build={counts:{doomsday:3},main:'doomsday',milestones:[{id:'doomsday:3',branch:'doomsday',at:3,offers:['M-N01','M-N02','M-N04'],claimed:'M-N01'}],orange:null};
  if(first==='M-P03')assert.ok(applyDoomsdayPurchase(w,'M-P03','mechanize-first'));
  assert.ok(claimDoomsdayNode(w,'M-N03'));w.expedition.doomsday!.nodeReserves['M-N03']=1;
  if(first==='M-N03'){assert.equal(marine.rank,5);assert.ok(applyDoomsdayPurchase(w,'M-P03','mechanize-later'));}
  assert.equal(marine.rank,7);assert.ok(mechanicalMember(w,marine));assert.equal(w.expedition.doomsday!.nodeReserves['M-N03'],1);
  grantMechanicalPolarization(w);reconcileMechanicalRecruits(w);assert.equal(marine.rank,7);
  const copy=make();copy.restoreRun(w.captureRun());reconcileMechanicalRecruits(copy);assert.equal(copy.entities.get(marine.id)!.rank,7);
 }
});

test('P03 preserves the surplus biological veteran, then grants N03 only when a mechanical seat becomes free',()=>{
 const w=make();const marines=Array.from({length:5},(_,i)=>w.addUnit('marine','terran',i*2,0,5));
 assert.ok(claimDoomsdayNode(w,'M-N03'));w.expedition.build!.main='doomsday';w.phase='reward';
 assert.ok(applyDoomsdayPurchase(w,'M-P03','mechanize-locked-family'));
 assert.equal(marines.filter(u=>mechanicalMember(w,u)).length,4);assert.deepEqual(marines.map(u=>u.rank),[7,7,7,7,5]);
 const veteran=marines[4];assert.equal(veteran.doomsday?.polarized,undefined);
 marines[0].hp=0;reconcileMechanicalSeats(w);assert.ok(mechanicalMember(w,veteran));assert.equal(veteran.rank,7);
 reconcileMechanicalSeats(w);reconcileMechanicalRecruits(w);assert.equal(veteran.rank,7);
});
test('N01 requires effective repair, arms distinct shooters and persists three DOT ticks without refresh acceleration or ghost vulnerability amplification',()=>{
 const w=make('M-N01','M-G04'),worker=w.addUnit('marine','terran',0,0),u=w.addUnit('tank','terran',1,0),second=w.addUnit('marine','terran',2,0),t=target(w,1,4);w.expedition.doomsday!.nodeReserves['M-N01']=1;doomsdayRepaired(w,worker,u,0);assert.equal(u.doomsday?.nanoAmmo,undefined);doomsdayRepaired(w,worker,u,1);assert.equal(u.doomsday?.nanoAmmo,true);assert.equal(w.expedition.doomsday!.nodeReserves['M-N01'],0);assert.equal(w.allies().filter(v=>v.doomsday?.nanoAmmo).length,2);
 w.fire(u,t);assert.equal(w.expedition.doomsday!.dots!.length,1);t.six={weakUntil:w.time+6};const after=t.hp,copy=make();copy.restoreRun(w.captureRun());tick(w,180);tick(copy,180);close(after-t.hp,u.weaponDamage*.3);close(copy.entities.get(t.id)!.hp,t.hp);assert.ok(second.hp>0);
});
test('N02 keeps zero-armor total at 100%, bypasses armor on its fraction and spends enhanced reserve once',()=>{
 const w=make('M-N02'),u=w.addUnit('tank','terran',0,0),t=target(w,0,4);const damage=u.weaponDamage;w.fire(u,t);close(1e7-t.hp,damage);t.armor=10;const before=t.hp;w.expedition.doomsday!.nodeReserves['M-N02']=1;w.fire(u,t);close(before-t.hp,Math.max(.5,damage*.8-10)+damage*.2);assert.equal(w.expedition.doomsday!.nodeReserves['M-N02'],0);
});
test('N06 counts four native rounds, reserves a pair once and resets on moving over 1.5 yards',()=>{
 const w=make('M-N06'),u=w.addUnit('tank','terran',0,0),t=target(w,0,4);w.expedition.doomsday!.nodeReserves['M-N06']=1;for(let i=0;i<3;i++)w.fire(u,t);assert.equal(w.expedition.doomsday!.areas?.length??0,0);w.fire(u,t);assert.equal(w.expedition.doomsday!.areas!.length,2);assert.equal(w.expedition.doomsday!.nodeReserves['M-N06'],0);tickDoomsdayNodes(w);w.fire(u,t);u.x+=2;tickDoomsdayNodes(w);assert.equal(u.doomsday!.station,undefined);
});
test('B07 fires two independent clocks without changing physical posture, including restored timers',()=>{
 const w=make('M-B07'),u=w.addUnit('viking','terran',0,0),air=target(w,0,5,true),ground=target(w,2,4);acquireDoomsdayBlueprint(w,'M-B07');const flying=u.flying;tickDoomsdayDual(w);assert.equal(u.flying,flying);assert.ok(u.doomsday!.dual!.air.nextReadyTick>0);assert.ok(u.doomsday!.dual!.ground.nextReadyTick>0);const copy=make();copy.restoreRun(w.captureRun());tick(w,120,true);tick(copy,120,true);assert.ok(air.hp<1e7&&ground.hp<1e7);close(copy.entities.get(air.id)!.hp,air.hp);close(copy.entities.get(ground.id)!.hp,ground.hp);assert.equal(u.flying,flying);
});
test('N07 requires actual blue flame from a different host and consumes a second legal point once',()=>{
 const w=make('M-G06','M-N07'),blue=w.addUnit('hellion','terran',0,0),tank=w.addUnit('tank','terran',0,-1),t=target(w,0,4);acquireDoomsdayBlueprint(w,'M-G06');tank.mode=tank.desiredMode='siege';w.refreshStats(tank);w.hash.rebuild(w.entities.values());w.expedition.doomsday!.nodeReserves['M-N07']=1;w.fire(blue,t);w.fire(tank,t);assert.equal(w.expedition.doomsday!.areas?.filter(e=>e.kind==='cold').length,2);assert.equal(w.expedition.doomsday!.nodeReserves['M-N07'],0);
});
test('N08 accepts air then ground and two different followers, never the same follower twice',()=>{
 const w=make('M-B07','M-P06','M-N08'),v=w.addUnit('viking','terran',0,0),b=w.addUnit('banshee','terran',1,0),c=w.addUnit('banshee','terran',2,0),air=target(w,0,4,true),t=target(w,0,4);acquireDoomsdayBlueprint(w,'M-B07');acquireDoomsdayBlueprint(w,'M-P06');w.expedition.doomsday!.nodeReserves['M-N08']=1;const p={damage:10,bonuses:[],hits:1,shieldBonus:0,crit:1,enemyFactor:1};doomsdayNodeHit(w,v,air,p,10,true);doomsdayNodeHit(w,v,t,p,10,true);doomsdayNodeHit(w,b,t,p,10,true);const count=w.weaponFlights.length;doomsdayNodeHit(w,b,t,p,10,true);assert.equal(w.weaponFlights.length,count);doomsdayNodeHit(w,c,t,p,10,true);assert.equal(w.expedition.doomsday!.nodeReserves['M-N08'],0);
});
test('N09 freezes only a pair of distinct child hits and restores a single delayed line',()=>{
 const w=make('M-P06','M-N09'),b=w.addUnit('banshee','terran',0,0);target(w,0,4);target(w,1,4);target(w,2,4);acquireDoomsdayBlueprint(w,'M-P06');w.expedition.doomsday!.nodeReserves['M-N09']=1;w.fire(b,[...w.entities.values()].find(t=>t.owner==='zerg')!);tick(w,20);assert.equal(w.expedition.doomsday!.areas?.filter(e=>e.kind==='resonance').length,1);const copy=make();copy.restoreRun(w.captureRun());tick(w,100);tick(copy,100);assert.equal(w.expedition.doomsday!.nodeReserves['M-N09'],0);assert.deepEqual([...copy.entities.values()].map(u=>u.hp),[...w.entities.values()].map(u=>u.hp));
});
test('O01 armor keeps hero identity, wounds and finite shield across repeated refresh and restore',()=>{
 const w=make('M-O01','M-G02');w.acquireHero('raynor');const u=w.heroEntity('raynor')!;assert.ok(u.doomsday?.heroArmor);const max=u.doomsday!.heroArmor!.max;w.hit(u,max/2,[],1,'zerg',0,1);close(u.doomsday!.heroArmor!.remaining,max/2);w.refreshStats(u);close(u.doomsday!.heroArmor!.remaining,max/2);assert.equal(u.heroId,'raynor');assert.ok(u.attributes.includes('Mechanical'));const copy=make();copy.restoreRun(w.captureRun());close(copy.heroEntity('raynor')!.doomsday!.heroArmor!.remaining,max/2);
});
test('O02 nine native rounds produce 36 missiles, three cannons and one independent nuke budget',()=>{
 const w=make('M-O02'),u=w.addUnit('thor','terran',0,0),t=target(w,0,4);acquireDoomsdayBlueprint(w,'M-O02');const ammo=w.expedition.support.ammo,missiles=new Map<number,number>(),events=new Map<number,{kind:string,tick:number}>();let copy:World|undefined;
 for(let i=0;i<540;i++){w.tick=i;w.time=i/60;tickDoomsdayGiants(w);for(const p of w.weaponFlights)if(p.doomsdayDerived?.kind==='barrage')missiles.set(p.id,Math.round(p.start*60));for(const e of w.expedition.doomsday!.areas??[])events.set(e.id,{kind:e.kind,tick:e.dueTick});tickWeaponFlights(w,1/60);tickDoomsdayNodes(w);
  if(copy){copy.tick=i;copy.time=i/60;tickDoomsdayGiants(copy);tickWeaponFlights(copy,1/60);tickDoomsdayNodes(copy);}if(i===318){copy=make();copy.restoreRun(w.captureRun());}
 }
 assert.equal(missiles.size,36);assert.deepEqual([...events.values()].filter(e=>e.kind==='cannon').map(e=>e.tick),[132,312,492]);assert.deepEqual([...events.values()].filter(e=>e.kind==='nuke').map(e=>e.tick),[522]);assert.deepEqual([...missiles.values()].slice(0,4),[0,3,6,9]);assert.equal(w.expedition.support.ammo,ammo);close(u.maxHp,giantBaseline('thor').hp*2.5);close(1e7-t.hp,giantBaseline('thor').dps*2.2*9);close(copy!.entities.get(t.id)!.hp,t.hp);assert.deepEqual(copy!.entities.get(u.id)!.doomsday,u.doomsday);
});
test('O02 death cancels an unlaunched cannon but keeps the four missiles already in flight',()=>{
 const w=make('M-O02'),u=w.addUnit('thor','terran',0,0),t=target(w,0,6);acquireDoomsdayBlueprint(w,'M-O02');for(let i=0;i<=130;i++){w.tick=i;w.time=i/60;tickDoomsdayGiants(w);tickWeaponFlights(w,1/60);tickDoomsdayNodes(w);}assert.equal(u.doomsday!.giant!.pendingCannon,true);u.hp=0;const before=t.hp;for(let i=131;i<=170;i++){w.tick=i;w.time=i/60;tickDoomsdayGiants(w);tickWeaponFlights(w,1/60);tickDoomsdayNodes(w);}assert.ok(t.hp<before);assert.equal(u.doomsday!.giant!.cannons,0);assert.equal(w.expedition.doomsday!.areas!.length,0);
});
test('O03 deduplicates a giant target per row and saves remaining rows after host death',()=>{
 const w=make('M-O03'),u=w.addUnit('tank','terran',0,0),t=target(w,0,7),rear=target(w,0,-7);t.unitRadius=6;u.mode=u.desiredMode='siege';w.refreshStats(u);acquireDoomsdayBlueprint(w,'M-O03');w.fire(u,t);const budget=u.weaponDamage;tickDoomsdayNodes(w);close(1e7-t.hp,budget/3);const copy=make();copy.restoreRun(w.captureRun());u.hp=0;copy.entities.get(u.id)!.hp=0;tick(w,8);tick(copy,8);close(1e7-t.hp,budget);assert.equal(rear.hp,1e7);close(copy.entities.get(t.id)!.hp,t.hp);
});
