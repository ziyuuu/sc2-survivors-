import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newDoomsdayState} from '../src/simulation/combat/doomsday-state';
import {acquireDoomsdayBlueprint} from '../src/simulation/combat/doomsday-refits';
import {doomsdayCombat,beginDoomsdayRound} from '../src/simulation/combat/doomsday-combat';
import {doomsdayNodeHit,doomsdaySplitHit,tickDoomsdayNodes} from '../src/simulation/combat/doomsday-nodes';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {tickDoomsdayPassives} from '../src/simulation/combat/doomsday-passives';
import {beginSpecialStage,markSpecialReady,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import type {DoomsdayId} from '../src/data/terran-doomsday';
import {readArchive,writeArchive} from '../src/persistence/archive';
const payload={damage:100,bonuses:[],hits:1,shieldBonus:0,crit:1,enemyFactor:1};
function make(...ids:DoomsdayId[]){const w=new World({race:'terran',seed:171117,waves:false,sandbox:true,terrain:new FlatTerrain(),obstacles:[]});w.start();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.pods=[];w.expedition.ledger=[];w.expedition.doomsday=newDoomsdayState();for(const id of ids)w.expedition.doomsday.ranks[id]=1;return w;}
function target(w:World,x=0,z=6){const t=w.addUnit('roach','zerg',x,z);t.hp=t.maxHp=1e6;t.armor=0;t.attributes=[];return t;}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('actual archive codec accepts safe null-prototype mechanical records and restores frozen cannon rows',()=>{
 const w=make('M-O03'),u=w.addUnit('tank','terran',0,0),t=target(w);u.mode=u.desiredMode='siege';w.refreshStats(u);acquireDoomsdayBlueprint(w,'M-O03');w.fire(u,t);
 const raw=writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}),saved=readArchive(raw).bundle.run!,copy=make();
 assert.equal(Object.getPrototypeOf(saved.state.expedition.doomsday),null);copy.restoreRun(saved);
 for(const p of [w,copy])for(let tick=0;tick<10;tick++){p.tick=tick;p.time=tick/60;tickDoomsdayNodes(p);}
 close(copy.entities.get(t.id)!.hp,t.hp);assert.deepEqual(copy.expedition.doomsday,w.expedition.doomsday);
});

test('checkpoint rejects malformed dual, armor, frozen budgets and forged area identities without replacing the live world',()=>{
 const w=make('M-B07','M-O03'),v=w.addUnit('viking','terran',0,0),u=w.addUnit('tank','terran',0,0),t=target(w);u.mode=u.desiredMode='siege';w.refreshStats(u);acquireDoomsdayBlueprint(w,'M-O03');doomsdayCombat(v).dual={air:{nextReadyTick:90,target:null},ground:{nextReadyTick:50,target:t.id}};w.fire(u,t);
 const snap=w.captureRun(),copy=make(),live=copy.entities;
 const changes=[
  (s:typeof snap)=>{s.state.entities.get(v.id)!.doomsday!.dual!.air.nextReadyTick=-1;},
  (s:typeof snap)=>{s.state.entities.get(u.id)!.doomsday!.heroArmor={max:100,remaining:101};},
  (s:typeof snap)=>{s.state.expedition.doomsday!.areas![0].payload.damage=NaN;},
  (s:typeof snap)=>{s.state.expedition.doomsday!.areas!.push(structuredClone(s.state.expedition.doomsday!.areas![0]));},
  (s:typeof snap)=>{s.state.expedition.doomsday!.areas![0].row=3;},
  (s:typeof snap)=>{s.state.expedition.doomsday!.blueprints!['M-O03']!.family='thor';},
 ];
 for(const change of changes){const s=structuredClone(snap);change(s);assert.throws(()=>copy.restoreRun(s));assert.equal(copy.entities,live);}
 copy.restoreRun(snap);assert.equal(copy.entities.get(v.id)!.doomsday!.dual!.ground.nextReadyTick,50);
});

test('N08 reserves one enhancement across two marked enemies and never spends below zero',()=>{
 const w=make('M-B07','M-N08'),v=w.addUnit('viking','terran',0,0),b=w.addUnit('banshee','terran',1,0),c=w.addUnit('banshee','terran',2,0),air=w.addUnit('mutalisk','zerg',0,5),a=target(w),z=target(w,1,5);acquireDoomsdayBlueprint(w,'M-B07');w.expedition.doomsday!.nodeReserves['M-N08']=1;
 for(const t of [a,z]){doomsdayNodeHit(w,v,air,payload,1,false);doomsdayNodeHit(w,v,t,payload,1,false);}
 assert.equal(Object.values(w.expedition.doomsday!.pincer!).filter(m=>m.enhanced).length,1);
 doomsdayNodeHit(w,b,a,payload,1,true);doomsdayNodeHit(w,c,a,payload,1,true);assert.equal(w.expedition.doomsday!.nodeReserves['M-N08'],0);assert.doesNotThrow(()=>w.captureRun());
});

test('N09 finds the earliest eligible pair among three child impacts and preserves an occupied reserve',()=>{
 const w=make('M-P06','M-N09'),u=w.addUnit('banshee','terran',0,0),a=target(w,-5,5),b=target(w,2,5),c=target(w,3,5);acquireDoomsdayBlueprint(w,'M-P06');w.expedition.doomsday!.nodeReserves['M-N09']=1;
 for(const t of [a,b,c])doomsdaySplitHit(w,u,t,`${u.id}:${u.bornAt}:1`,payload,1);
 const line=w.expedition.doomsday!.areas![0];assert.deepEqual(line.line?.from,{x:b.x,z:b.z});assert.deepEqual(line.line?.to,{x:c.x,z:c.z});assert.equal(line.line?.width,1.6);
 const copy=make();copy.restoreRun(w.captureRun());for(const p of [w,copy]){p.tick=30;p.time=.5;tickDoomsdayNodes(p);}assert.equal(w.expedition.doomsday!.nodeReserves['M-N09'],0);assert.deepEqual([...w.entities.values()].map(t=>t.hp),[...copy.entities.values()].map(t=>t.hp));
});

test('O03 death before a repeated row launch cancels the whole repeat, while the native three rows finish once',()=>{
 const w=make('M-O03','M-B03'),u=w.addUnit('tank','terran',0,0),t=target(w);t.unitRadius=6;u.mode=u.desiredMode='siege';w.refreshStats(u);acquireDoomsdayBlueprint(w,'M-O03');w.fire(u,t);const budget=u.weaponDamage;tickDoomsdayNodes(w);u.hp=0;
 const copy=make();copy.restoreRun(w.captureRun());for(const p of [w,copy])for(let i=1;i<=120;i++){p.tick=i;p.time=i/60;tickDoomsdayNodes(p);}
 close(1e6-t.hp,budget);close(copy.entities.get(t.id)!.hp,t.hp);assert.equal(w.expedition.doomsday!.areas!.length,0);
});

test('O01 nano shield can regenerate and receive engineering repairs without refilling the finite hero armor',()=>{
 const w=make('M-O01','M-G02','M-G04');w.acquireHero('raynor');const u=w.heroEntity('raynor')!,worker=w.addUnit('marine','terran',u.x+1,u.z);u.doomsday!.heroArmor!.remaining=0;u.doomsday!.nano!.remaining=0;u.doomsday!.nano!.regenTick=240;u.hp-=20;const hp=u.hp;
 for(let i=241;i<=300;i++){w.tick=i;tickDoomsdayPassives(w,1/60);}assert.ok(u.hp>hp);close(u.doomsday!.nano!.remaining,u.doomsday!.nano!.max*.1);assert.equal(u.doomsday!.heroArmor!.remaining,0);assert.ok(worker.hp>0);
});

test('special stage leaves parent field attacks parked and carries finite shields and spent cooldowns back by identity',()=>{
 const w=make('M-O01','M-B07','M-N09');w.stage=4;w.acquireHero('raynor');const h=w.heroEntity('raynor')!,v=w.addUnit('viking','terran',0,0);acquireDoomsdayBlueprint(w,'M-B07');w.addUnit('marine','terran',1,0);w.addUnit('tank','terran',-1,0);const s=w.expedition.doomsday!;s.nodeReserves['M-N09']=1;const a=target(w,0,5),b=target(w,1,5);doomsdaySplitHit(w,v,a,`${v.id}:${v.bornAt}:1`,payload,1);doomsdaySplitHit(w,v,b,`${v.id}:${v.bornAt}:1`,payload,1);
 doomsdayCombat(v).dual={air:{nextReadyTick:240,target:a.id},ground:{nextReadyTick:200,target:b.id}};h.doomsday!.heroArmor!.remaining=17;const parent=s.areas;
 assert.equal(beginSpecialStage(w,'resources','fixture'),true);assert.equal(markSpecialReady(w),true);assert.equal(w.expedition.doomsday!.areas!.length,0);assert.equal(w.expedition.doomsday!.parkedResonanceReservations,1);const childHero=w.heroEntity('raynor')!;assert.equal(childHero.doomsday!.heroArmor!.remaining,17);childHero.doomsday!.heroArmor!.remaining=9;
 w.time+=1;w.tick+=60;w.specialStages.active!.clock=60;finishSpecialStage(w,'timeout');assert.equal(w.expedition.doomsday!.areas,parent);assert.equal(h.doomsday!.heroArmor!.remaining,9);assert.equal(v.doomsday!.dual!.air.nextReadyTick,180);assert.equal(v.doomsday!.dual!.air.target,null);assert.doesNotThrow(()=>w.captureRun());
});
