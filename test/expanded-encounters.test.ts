import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {spawnFunEncounter,tickExpandedEncounters,tickFunUnit,commitFunMedical,cancelExpandedEncounters,funFlightReady,expandedLabel} from '../src/simulation/encounters/expanded';
import {validateEncounterState} from '../src/simulation/encounters/state';
import {funRelation} from '../src/simulation/encounters/relations';
import {flushEncounterRewards} from '../src/simulation/encounters/runtime';
import {healExpedition,unitData} from '../src/simulation/combat/expedition-combat';
import type {FunKind} from '../src/simulation/encounters/expanded-state';
import {FUN_NYDUS} from '../src/simulation/encounters/expanded-state';
import {createPair,pairFor,tickBroods} from '../src/simulation/zerg-brood';
import {launchWeaponFlight,tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {heldPose,nydusPose} from '../src/render/units/fun-presentation';
import {SC2_UNITS} from '../src/data/sc2-units';
import {validateRunData} from '../src/simulation/persistence/run-fields';
import {RunState} from '../src/simulation/run-state';
import {MAP_THEMES,campaignTerrain,type CampaignTheme} from '../src/data/campaign-map';
import {grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import type {Entity} from '../src/simulation/types';
function world(difficulty:'easy'|'normal'|'hard'|'hell'='hard',stage=10){
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:529,equipmentAccount:newEquipmentAccount(529),difficulty});
 w.start();w.stage=stage;w.prepareStage();w.encounters.enabled=false;
 for(const u of w.allies())u.hp=u.maxHp=100000;
 return w;
}
function ticks(w:World,n=1){for(let i=0;i<n;i++){w.tick++;w.time=w.tick/60;tickExpandedEncounters(w);flushEncounterRewards(w);}}
function start(w:World,kind:FunKind){assert.equal(spawnFunEncounter(w,kind,{x:22,z:0}),true,kind);return (kind==='cruelQueen'?w.encounters.expanded.queen:w.encounters.expanded.short)!;}
const bodies=(w:World,ids:number[])=>ids.map(id=>w.entities.get(id)!);
const items=(w:World)=>Object.values(w.starship.account.items);
function kill(w:World,u:Entity,source?:Entity){w.hit(u,1e12,[],1,source?.owner??'terran',0,1,source?.id);}
const swallowTicks=(_seats:number)=>0; // Immediate eruption swallow; no serial pickup delay.

for(const difficulty of ['easy','normal','hard','hell'] as const)test(difficulty+': white-pack gate or six transformations and once-only elite packages',()=>{
 const w=world(difficulty);if(difficulty==='easy'){assert.equal(spawnFunEncounter(w,'whitePack'),false);return;}const m=start(w,'whitePack'),units=bodies(w,m.actors),first=units[0],old=first.maxHp;
 w.hit(first,1,[],1,'terran',0,1);
 assert.equal(m.phase,'active');assert.ok(units.every(u=>u.enemyTier==='elite'&&u.fun?.mode==='morph'));assert.equal(first.hp,first.maxHp-1);assert.notEqual(old,first.maxHp);
 const before={x:first.x,z:first.z};assert.equal(tickFunUnit(w,first,1/60),true);assert.deepEqual({x:first.x,z:first.z},before);
 for(const u of units)kill(w,u);flushEncounterRewards(w);
 assert.equal(items(w).length,m.plans.reduce((n,p)=>n+p.items.length,0));assert.equal(m.plans.length,6);
 const rng=w.starship.account.rng;for(const u of units)kill(w,u);flushEncounterRewards(w);assert.equal(w.starship.account.rng,rng);
 assert.equal(w.pickups.length,0);ticks(w);assert.equal(w.encounters.expanded.short,null);
});
test('white route moves without combat; no provocation expires at sixty seconds and normal stage transitions expire offered packs',()=>{
 const w=world(),m=start(w,'whitePack'),u=bodies(w,m.actors)[0],p={x:u.x,z:u.z};tickFunUnit(w,u,1);assert.notDeepEqual({x:u.x,z:u.z},p);assert.equal(u.windup,0);ticks(w,3600);assert.equal(w.encounters.expanded.short,null);assert.equal(items(w).length,0);
});
test('devourer reserves floor(ordinary formal seats/3), excludes elites/heroes, holds exact IDs and capacity, rescue preserves absolute pools',()=>{
 const w=world();for(let i=0;i<8;i++)w.addUnit('marine','terran',i*2,6);
 const elite=w.addUnit('marine','terran',0,9);elite.eliteId='marine.1';
 const count=w.familySeatCount('marine'),m=start(w,'devourer');assert.equal(m.held.length,3);assert.ok(m.held.every(s=>!s.ids.includes(elite.id)));
 validateEncounterState(structuredClone(w.encounters),structuredClone(w.entities));
 ticks(w,swallowTicks(m.held.length));assert.equal(m.phase,'rescue');assert.equal(w.familySeatCount('marine'),count);
 const held=m.held.flatMap(s=>s.ids).map(id=>w.entities.get(id)!);assert.ok(held.every(u=>u.heldBy===m.id&&!w.allies().includes(u)));
 const pools=held.map(u=>({id:u.id,hp:u.hp,shield:u.shield,rank:u.rank}));
 w.hash.rebuild(w.entities.values());let seen=0;w.hash.query(held[0],100,b=>{if(b.heldBy)seen++;});assert.equal(seen,0);
 w.hit(held[0],1e6,[],1,'zerg');assert.equal(held[0].hp,pools[0].hp);
 validateEncounterState(structuredClone(w.encounters),structuredClone(w.entities));
 kill(w,bodies(w,m.actors)[0]);ticks(w);
 assert.equal(w.encounters.expanded.short,null);
 for(const p of pools){const u=w.entities.get(p.id)!;assert.equal(u.heldBy,undefined);assert.equal(u.hp,p.hp);assert.equal(u.shield,p.shield);assert.equal(u.rank,p.rank+1);}
 assert.equal(w.familySeatCount('marine'),count);
});
test('devourer deadline begins with the eruption and guards never exceed sixteen',()=>{
 const w=world();for(let i=0;i<5;i++)w.addUnit('marine','terran',i*2,6);
 const m=start(w,'devourer');ticks(w,swallowTicks(m.held.length));assert.equal(m.phase,'rescue');assert.equal(m.clock,0);ticks(w,1799);assert.equal(bodies(w,m.held.flatMap(s=>s.ids)).every(u=>u.hp>0),true);assert.equal(m.guards.length,16);
 const ids=m.held.flatMap(s=>s.ids);ticks(w);assert.equal(m.phase,'departing');assert.ok(ids.every(id=>w.entities.get(id)!.hp<=0));ticks(w,FUN_NYDUS.birthTicks);assert.equal(w.encounters.expanded.short,null);assert.equal(bodies(w,m.guards).filter(u=>u.hp>0).length,16);
});
test('successful cancellation returns swallowed bodies without promotion; failure uses native death',()=>{
 for(const reason of ['success','failure'] as const){
  const w=world();for(let i=0;i<5;i++)w.addUnit('marine','terran',i*2,6);const m=start(w,'devourer');ticks(w,swallowTicks(m.held.length));const ids=m.held.flatMap(s=>s.ids),ranks=ids.map(id=>w.entities.get(id)!.rank);
  cancelExpandedEncounters(w,reason);assert.equal(w.encounters.expanded.short,null);
  ids.forEach((id,i)=>{const u=w.entities.get(id)!;assert.equal(u.heldBy,undefined);if(reason==='success'){assert.ok(u.hp>0);assert.equal(u.rank,ranks[i]);}else assert.equal(u.hp,0);});
 }
});
test('six flying roaches require native anti-air, receive both-plane basic weapons, drop one collectible family entitlement',()=>{
 const w=world(),m=start(w,'flyingRoaches'),units=bodies(w,m.actors);
 assert.equal(units.length,6);assert.ok(units.every(u=>u.flying&&unitData(u).targetType==='both'));
 units.forEach(u=>kill(w,u));ticks(w);assert.equal(w.encounters.expanded.elytra.length,1);assert.equal(items(w).length,0);
 w.anchor={...w.anchor,...m.point};ticks(w);assert.equal(w.encounters.expanded.elytra.length,0);assert.equal(w.encounters.expanded.wingFamilies.size,1);
 const family=[...w.encounters.expanded.wingFamilies][0];assert.equal(family,'marine');
 const future=w.addUnit('marine','terran',2,2);w.refreshStats(future);assert.equal(future.winged,true);assert.equal(future.flying,true);
 cancelExpandedEncounters(w,'success');assert.equal(w.encounters.expanded.wingFamilies.has('marine'),true);
});
test('wing entitlement covers melee families and requires actual landing for ground strikes',()=>{
 const w=world(),u=w.addUnit('zealot','terran',4,4),target=w.addUnit('roach','zerg',5.5,4);
 w.encounters.expanded.wingFamilies.add('zealot');w.refreshStats(u);u.attackTarget=target.id;
 assert.equal(unitData(u).targetType,'both');assert.equal(funFlightReady(u,target),false);
 for(let i=0;i<37;i++)tickFunUnit(w,u,1/60);
 assert.equal(u.wingHeight,0);assert.equal(u.flying,false);assert.equal(funFlightReady(u,target),true);
 target.flying=true;tickFunUnit(w,u,1/60);assert.equal(u.flying,false);w.refreshStats(u);assert.equal(u.flying,false);
 for(let i=0;i<37;i++)tickFunUnit(w,u,1/60);assert.equal(u.wingHeight,1);assert.equal(u.flying,true);
});
test('cruel queen targets ordinary enemies only, cannot be attacked before 300 kills, changes phases at 600/999 and grants one item',()=>{
 const w=world(),m=start(w,'cruelQueen'),q=bodies(w,m.actors)[0],friend=w.allies()[0],enemy=w.addUnit('zergling','zerg',23,0);
 assert.equal(w.targetAllowed(q,friend),false);assert.equal(w.targetAllowed(q,enemy),true);assert.equal(w.targetAllowed(enemy,q),false);assert.equal(w.targetAllowed(friend,q),false);
 const hp=q.hp;kill(w,q,friend);assert.equal(q.hp,hp);
 for(let i=0;i<300;i++){const e=w.addUnit('zergling','zerg',24,0);kill(w,e,q);}
 assert.equal(m.kills,300);assert.equal(w.targetAllowed(friend,q),true);
 for(let i=300;i<600;i++){const e=w.addUnit('zergling','zerg',24,0);kill(w,e,q);}
 assert.equal(m.tier,1);assert.equal(q.maxHp,m.base!.hp*4);
 for(let i=600;i<999;i++){const e=w.addUnit('zergling','zerg',24,0);kill(w,e,q);}
 assert.equal(m.tier,2);assert.equal(q.maxHp,m.base!.hp*8);
 kill(w,q,friend);flushEncounterRewards(w);assert.equal(items(w).length,1);assert.equal(w.heroes.has(m.hero!),true);
 kill(w,q,friend);flushEncounterRewards(w);assert.equal(items(w).length,1);
});
test('early queen death queues exactly 24/8/8 and respects the world capacity',()=>{
 const w=world(),m=start(w,'cruelQueen'),q=bodies(w,m.actors)[0];m.kills=300;kill(w,q);assert.equal(m.queue.length,40);
 assert.equal(m.queue.filter(x=>x.type==='zergling').length,24);assert.equal(m.queue.filter(x=>x.type==='roach').length,8);assert.equal(m.queue.filter(x=>x.type==='baneling').length,8);
 ticks(w,120);assert.equal(m.queue.length,0);assert.ok(w.enemyCount()<=300);flushEncounterRewards(w);assert.equal(items(w).length,1);
});

test('queen neither targets nor gains growth from elites, bosses, density companions or buildings',()=>{
 const w=world(),m=start(w,'cruelQueen'),q=bodies(w,m.actors)[0];
 const elite=w.spawnSpecial('roach','elite',{x:28,z:0})!,boss=w.spawnSpecial('queen','boss',{x:30,z:0})!,weak=w.addUnit('zergling','zerg',29,4);weak.enemySpawn!.density=.3;
 for(const u of [elite,boss,weak]){assert.equal(w.targetAllowed(q,u),false);kill(w,u,q);}
 assert.equal(m.kills,0);
 assert.equal(funRelation(w,q,{id:-99,owner:'zerg',x:29,z:5,hp:100,maxHp:100,armor:0,flying:false,attributes:['Structure'],unitRadius:1}),false);
 const ordinary=w.addUnit('zergling','zerg',28,5);kill(w,ordinary,q);assert.equal(m.kills,1);
});

for(const difficulty of ['easy','normal','hard','hell'] as const)test(difficulty+': infection gate or ordinary baneling explosion profile',()=>{
 const w=world(difficulty);if(difficulty==='easy'||difficulty==='normal'){assert.equal(spawnFunEncounter(w,'infectedTerrans'),false);return;}w.expedition.race='zerg';const m=start(w,'infectedTerrans'),u=bodies(w,m.actors)[0],a=w.allies()[0];
 const b=w.addUnit('baneling','zerg',u.x,u.z,1,'regular',m.stage,m.stamp);a.x=u.x+1;a.z=u.z;a.prev={x:a.x,z:a.z};
 w.hash.rebuild([...w.entities.values()]);const packets:{damage:number;bonus:unknown}[]=[];
 w.hit=((body,damage,bonus)=>{if(body.id===a.id)packets.push({damage,bonus:structuredClone(bonus)});}) as typeof w.hit;
 w.fire(b,a);assert.equal(packets.length,1);const expected=packets.pop();
 u.fun!.mode='charging';u.fun!.faction='hostile';u.fun!.until=w.time-1;tickFunUnit(w,u,1/60);
 assert.equal(packets.length,1);assert.deepEqual(packets[0],expected);
});
for(const race of ['terran','zerg','protoss'] as const)test(race+': ten infected marines can be killed and each guarantees offensive equipment',()=>{
 const w=world();w.expedition.race=race;if(race==='terran')w.addUnit('medivac','terran',0,4);
 const m=start(w,'infectedTerrans'),units=bodies(w,m.actors);assert.equal(units.length,10);
 for(const u of units)kill(w,u);flushEncounterRewards(w);assert.equal(items(w).length,10);assert.ok(items(w).every(i=>i.slot.startsWith('offense')));
 for(const u of units)kill(w,u);flushEncounterRewards(w);assert.equal(items(w).length,10);
});
test('actual Terran medical output cleanses at 30% maximum and produces a ninety-second ally, without double reward at death',()=>{
 const w=world(),healer=w.addUnit('medivac','terran',0,4),m=start(w,'infectedTerrans'),u=bodies(w,m.actors)[0];
 for(const other of bodies(w,m.actors).slice(1)){other.x=60;other.z=60;}healer.x=u.x;healer.z=u.z+1;healer.healRate=u.maxHp;healer.energy=1e6;
 for(let i=0;i<30&&u.fun!.mode!=='friend';i++)healExpedition(w,healer,.1);
 assert.equal(u.fun!.mode,'friend');assert.equal(u.owner,'terran');assert.equal(u.fun!.until,w.time+90);assert.ok(expandedLabel(w).includes('待处理 9'));flushEncounterRewards(w);assert.equal(items(w).length,1);
 const enemy=w.addUnit('roach','zerg',u.x+1,u.z);kill(w,u,enemy);flushEncounterRewards(w);assert.equal(items(w).length,1);
});
test('infected marines start twelve seconds on proximity, swell for 1.5 seconds and use a bounded charge',()=>{
 const w=world();w.expedition.race='zerg';const m=start(w,'infectedTerrans'),u=bodies(w,m.actors)[0];ticks(w,120);assert.equal(m.phase,'offered');
 w.anchor.x=u.x;w.anchor.z=u.z;ticks(w);assert.equal(m.phase,'active');ticks(w,719);assert.equal(u.fun!.mode,'passive');ticks(w);assert.equal(u.fun!.mode,'swelling');
 tickFunUnit(w,u,1/60);assert.equal(u.fun!.mode,'swelling');w.time+=1.5;tickFunUnit(w,u,1/60);assert.equal(u.fun!.mode,'charging');w.time+=8;tickFunUnit(w,u,1/60);flushEncounterRewards(w);assert.equal(u.hp,0);assert.equal(items(w).length,1);
});
test('corrupted protoss has bug hostility, 20 initial bodies, a 40 total cap and one final package',()=>{
 const w=world(),m=start(w,'corruptedProtoss'),p=bodies(w,m.actors)[0],enemy=w.addUnit('roach','zerg',p.x+1,p.z),friend=w.allies()[0];
 assert.equal(w.targetAllowed(p,enemy),true);assert.equal(w.targetAllowed(enemy,p),true);assert.equal(w.targetAllowed(p,friend),false);
 ticks(w,1200);assert.equal(m.actors.length,20);assert.equal(m.corrupt!.spawned,20);
 for(let wave=0;wave<2;wave++){for(const u of bodies(w,m.actors).slice(0,11))kill(w,u);ticks(w,301);assert.equal(m.actors.length,wave===0?20:18);}
 assert.equal(m.corrupt!.spawned,40);ticks(w,600);assert.equal(m.actors.length,18);assert.equal(items(w).length,0);
 for(const u of bodies(w,m.actors))kill(w,u);ticks(w);assert.equal(w.encounters.expanded.short,null);assert.equal(items(w).length,m.plans[0].items.length);
});
test('thirty parasites attach at most ten bodies and hatch only five elite plus five ordinary bodies across the whole event',()=>{
 const w=world();for(let i=0;i<12;i++)w.addUnit('marine','terran',i*2,6);
 const m=start(w,'parasites'),parasites=bodies(w,m.actors);assert.equal(parasites.length,30);
 for(let i=0;i<10;i++){const infected=new Set([...w.encounters.expanded.infections.values()].flatMap(x=>x.ids)),target=w.allies().find(u=>!infected.has(u.id))!;const p=parasites[i];p.x=target.x;p.z=target.z;tickFunUnit(w,p,1/60);}
 assert.equal(m.claimed,10);assert.equal(w.encounters.expanded.infections.size,10);ticks(w);assert.equal(m.actors.filter(id=>(w.entities.get(id)?.hp??0)>0).length,0);
 ticks(w,650);assert.equal(w.encounters.expanded.infections.size,0);assert.equal(m.eliteChildren,5);assert.equal(m.ordinaryChildren,5);assert.equal(m.guards.length,10);
 assert.equal(bodies(w,m.guards).filter(u=>u.enemyTier==='elite').length,5);assert.ok(w.allies().length>=1);
});
test('paired bodies remain one devourer roster seat, promote exactly once and cannot regrow inside the mouth',()=>{
 const w=world();for(const u of w.allies())w.entities.delete(u.id);
 for(let i=0;i<9;i++)createPair(w,{x:i*3-12,z:8},2);
 const m=start(w,'devourer');assert.equal(m.held.length,3);assert.ok(m.held.every(s=>s.ids.length===2));
 ticks(w,1);
 const first=w.entities.get(m.held[0].ids[0])!;assert.ok(first.heldBy);assert.ok(heldPose(w,first));assert.equal(nydusPose(w,w.entities.get(m.actors[0])!)?.clip,'Birth');
 ticks(w,m.held.length*FUN_NYDUS.pickupTicks);assert.equal(heldPose(w,first),null);
 const held=m.held.flatMap(s=>s.ids).map(id=>w.entities.get(id)!),pools=held.map(u=>[u.hp,u.shield]),count=w.familySeatCount('zergling');
 assert.equal(count,9);assert.equal(w.ordinaryUnits('zergling').length,6);assert.equal(w.familyBodies('zergling').length,18);
 const pair=pairFor(w,first)!;const other=w.entities.get(pair.members.find(id=>id!==first.id)!)!;other.hp=0;pair.regrowAt=w.tick;const before=w.entities.size;tickBroods(w);assert.equal(w.entities.size,before);other.hp=other.maxHp;
 kill(w,w.entities.get(m.actors[0])!);ticks(w);
 assert.equal(w.familySeatCount('zergling'),9);assert.ok(held.every(u=>u.rank===3&&!u.heldBy));assert.deepEqual(held.map(u=>[u.hp,u.shield]),pools);
});
test('parasites count both members of twin pairs against the ten-body and five-plus-five global budget',()=>{
 const w=world();for(const u of w.allies())w.entities.delete(u.id);for(let i=0;i<7;i++)createPair(w,{x:i*4-12,z:5});
 const m=start(w,'parasites'),parasites=bodies(w,m.actors);
 for(let i=0;i<5;i++){const ids=new Set([...w.encounters.expanded.infections.values()].flatMap(x=>x.ids)),target=w.allies().find(u=>!ids.has(u.id))!;Object.assign(parasites[i],{x:target.x,z:target.z});tickFunUnit(w,parasites[i],1/60);}
 assert.equal(m.claimed,10);assert.equal(w.encounters.expanded.infections.size,5);assert.equal([...w.encounters.expanded.infections.values()].flatMap(x=>x.ids).length,10);
 ticks(w,650);assert.equal(m.eliteChildren,5);assert.equal(m.ordinaryChildren,5);assert.equal(m.guards.length,10);assert.equal(w.allies().length,4);
});
test('native ranged packets retain third-party relations after the source is reclaimed and across DTO clone',()=>{
 const w=world(),m=start(w,'corruptedProtoss'),s=bodies(w,m.actors).find(u=>u.unitType==='stalker')!,enemy=w.addUnit('roach','zerg',s.x+1,s.z);
 enemy.hp=enemy.maxHp=10000;s.weaponDamage=80;assert.equal(w.targetAllowed(s,enemy),true);assert.equal(launchWeaponFlight(w,s,enemy,[],0,1),true);
 const original=structuredClone(w.weaponFlights);w.entities.delete(s.id);w.weaponFlights=structuredClone(original);w.time+=.2;tickWeaponFlights(w,.2);
 assert.ok(enemy.hp<10000);assert.equal(w.weaponFlights.length,0);
 const queenWorld=world(),queen=start(queenWorld,'cruelQueen'),q=bodies(queenWorld,queen.actors)[0],victim=queenWorld.addUnit('zergling','zerg',q.x+1,q.z);
 q.weaponDamage=10000;victim.hp=1;launchWeaponFlight(queenWorld,q,victim,[],0,1);queenWorld.time+=.1;tickWeaponFlights(queenWorld,.1);assert.equal(queen.kills,1);
});
test('every formal ground combat family receives current and future wing entitlement without altering basic stats',()=>{
 const w=world(),enemy=w.addUnit('roach','zerg',5,5);enemy.flying=true;const checked:string[]=[];
 for(const [name,data] of Object.entries(SC2_UNITS)){
  if(data.flying||data.attackDamage<=0||data.targetType==='none')continue;
  const type=name as Entity['unitType'],u=w.addUnit(type,'terran',0,0);w.refreshStats(u);const before=[u.weaponDamage,u.attackRange,u.shotInterval,u.moveSpeed,u.maxHp,u.armor];
  w.encounters.expanded.wingFamilies.add(type);w.refreshStats(u);assert.equal(u.winged,true,name);assert.equal(w.targetAllowed(u,enemy),true,name);assert.deepEqual([u.weaponDamage,u.attackRange,u.shotInterval,u.moveSpeed,u.maxHp,u.armor],before,name);checked.push(name);
 }
 assert.ok(checked.length>=15);
});
test('the full native step resolves third-party ranged combat and validates its saved DTO',()=>{
 const w=world(),m=start(w,'corruptedProtoss'),s=bodies(w,m.actors).find(u=>u.unitType==='stalker')!,a=w.allies()[0];a.x=s.x+2;a.z=s.z;a.prev={x:a.x,z:a.z};a.weaponDamage=0;
 for(const u of bodies(w,m.actors))if(u.id!==s.id){u.x+=30;u.z+=20;}
 const e=w.addUnit('roach','zerg',s.x-2,s.z);e.hp=e.maxHp=50000;e.weaponDamage=0;e.moveSpeed=0;const hp=a.hp+e.hp;w.advance(3);assert.ok(a.hp+e.hp<hp);assert.ok(s.shotSequence>0);
 const dto=structuredClone(w.snapshotData());validateRunData(dto,new RunState());
});
test('held bodies remain unchanged during native fixed steps; legal guards emit from the mouth and keep ordinary resource receipts',()=>{
 const w=world();for(let i=0;i<8;i++)w.addUnit('marine','terran',i*2-7,6);
 const m=start(w,'devourer'),pit=bodies(w,m.actors)[0],oldHp=pit.hp;w.hit(pit,100,[],1,'terran',0,1,undefined,true);assert.ok(pit.hp<oldHp);
 ticks(w,swallowTicks(m.held.length));const held=bodies(w,m.held.flatMap(s=>s.ids));for(const u of w.allies())u.nextShotAt=Infinity;
 const state=()=>held.map(u=>({id:u.id,hp:u.hp,shield:u.shield,x:u.x,z:u.z,rank:u.rank})),before=state();w.advance(2);assert.deepEqual(state(),before);
 ticks(w,m.next-m.clock+1);assert.equal(nydusPose(w,pit)?.clip,'Spell');ticks(w,36);assert.equal(m.guards.length,4);assert.ok(bodies(w,m.guards).every(u=>u.funTransit));
 const guard=bodies(w,m.guards)[0],drop=w.pickups.length;kill(w,guard);assert.equal(w.pickups.length,drop+1);kill(w,guard);assert.equal(w.pickups.length,drop+1);
});
for(const theme of Object.keys(MAP_THEMES) as CampaignTheme[])test(theme+': seven encounter populations fit real terrain and rescue returns legal bodies',()=>{
 for(const kind of ['whitePack','devourer','flyingRoaches','cruelQueen','infectedTerrans','corruptedProtoss','parasites'] as const){
  const w=new World({difficulty:'hard',terrain:campaignTerrain({version:3,seed:529,theme}),waves:false,equipmentAccount:newEquipmentAccount(529),seed:529});w.start();w.stage=10;w.prepareStage();w.encounters.enabled=false;
  for(const [id,u]of w.entities)if(u.owner==='zerg')w.entities.delete(id);
  for(let i=0;i<6;i++){const p=w.freePosition('marine',w.anchor,1,12);assert.ok(p);w.addUnit('marine','terran',p.x,p.z);}
  const p=w.freePosition('medivac',w.anchor,1,8);assert.ok(p);w.addUnit('medivac','terran',p.x,p.z);
  let placed=false;for(let n=0;n<4&&!placed;n++)placed=spawnFunEncounter(w,kind);assert.ok(placed,theme+':'+kind);
  const m=(kind==='cruelQueen'?w.encounters.expanded.queen:w.encounters.expanded.short)!;
  for(const u of bodies(w,m.actors))if(!u.flying)assert.ok(w.terrain!.canOccupy(u,u.unitRadius),theme+':'+kind+':'+u.unitType);
  if(kind==='devourer'){ticks(w,swallowTicks(m.held.length));const held=bodies(w,m.held.flatMap(s=>s.ids));kill(w,bodies(w,m.actors)[0]);ticks(w);assert.ok(held.every(u=>!u.heldBy&&w.terrain!.canOccupy(u,u.unitRadius)));}
 }
});
for(const [difficulty,quality]of [['easy',1],['normal',2],['hard',3],['hell',4]] as const)test(difficulty+': equipment growth respects the encounter gate and legal reward context',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:529,equipmentAccount:newEquipmentAccount(529),difficulty});
 for(const slot of ATTRIBUTE_SLOTS){const r=grantEquipment(w.starship.account,{template:'attribute.'+quality,race:'terran',slot},difficulty+':'+slot,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);}
 w.start();w.stage=10;w.prepareStage();w.encounters.enabled=false;for(let i=0;i<6;i++)w.addUnit('marine','terran',i-3,2,3);
 if(difficulty==='easy'){assert.equal(spawnFunEncounter(w,'whitePack'),false);assert.ok(w.starship.totals.dps+w.starship.totals.attackSpeed>0);return;}const m=start(w,'whitePack'),u=bodies(w,m.actors)[0],a=w.allies()[0];w.hit(u,1,[],1,'terran',0,1,a.id);
 const damage=a.weaponDamage;assert.ok(w.starship.totals.dps+w.starship.totals.attackSpeed>0);for(const actor of bodies(w,m.actors)){actor.x=w.anchor.x+3;actor.z=w.anchor.z+2;actor.prev={x:actor.x,z:actor.z};}w.advance(2);
 assert.ok(w.visualEvents.some(e=>e.kind==='attack'));assert.ok(Number.isFinite(damage)&&damage>0);assert.ok(m.plans.every(p=>p.context.difficulty===difficulty));assert.ok(w.enemyCount()<=300);
});
test('healing does not cleanse a parasite; pause and reward screens freeze all event counters, state clone validates',()=>{
 const w=world();for(let i=0;i<3;i++)w.addUnit('marine','terran',i,6);const m=start(w,'parasites'),p=bodies(w,m.actors)[0],target=w.allies()[0];p.x=target.x;p.z=target.z;tickFunUnit(w,p,1/60);
 const infection=structuredClone(w.encounters.expanded.infections);commitFunMedical(w,w.addUnit('medivac','terran',0,2),target,1e9);assert.deepEqual(w.encounters.expanded.infections,infection);
 const state=structuredClone(w.encounters);w.paused=true;ticks(w,30);assert.deepEqual(w.encounters,state);w.paused=false;w.phase='reward';ticks(w,30);assert.deepEqual(w.encounters,state);
 validateEncounterState(structuredClone(w.encounters),structuredClone(w.entities));
});

