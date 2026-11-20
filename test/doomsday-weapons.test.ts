import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newDoomsdayState} from '../src/simulation/combat/doomsday-state';
import {acquireDoomsdayBlueprint} from '../src/simulation/combat/doomsday-refits';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {tickDoomsdayTurrets,doomsdaySlow} from '../src/simulation/combat/doomsday-weapons';
import type {DoomsdayId} from '../src/data/terran-doomsday';
import * as THREE from 'three';
import {SourceCombatEffects} from '../src/render/effects/source-combat-effects';
import type {SourceEffectRequest} from '../src/render/effects/source/types';
import {tickDoomsdayNodes} from '../src/simulation/combat/doomsday-nodes';
import {doomsdayCombat} from '../src/simulation/combat/doomsday-combat';
function make(...ids:DoomsdayId[]){const w=new World({race:'terran',seed:161104,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.entities.clear();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.expedition.doomsday=newDoomsdayState();for(const id of ids)w.expedition.doomsday.ranks[id]=1;return w;}
function target(w:World,x:number,z:number){const u=w.addUnit('roach','zerg',x,z);u.hp=u.maxHp=100000;u.armor=0;u.attributes=[];return u;}
function tick(w:World,n:number){for(let i=0;i<n;i++){w.tick++;w.time+=1/60;tickWeaponFlights(w,1/60);}}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
test('four-part repeat keeps 100 percent native plus three 20 percent packets, each paying armor',()=>{
 const w=make('M-B03'),u=w.addUnit('tank','terran',0,0),t=target(w,0,4);w.expedition.doomsday!.ranks['M-B03']=3;u.shotInterval=1;const base=u.weaponDamage;w.fire(u,t);assert.equal(w.weaponFlights.length,3);close(100000-t.hp,base);tick(w,59);close(100000-t.hp,base*1.6);assert.equal(w.stats.shots,1);
});
test('pending repeats cancel on host death while an already launched missile survives',()=>{
 const w=make('M-B03'),u=w.addUnit('tank','terran',0,0),t=target(w,0,4);u.shotInterval=1;w.fire(u,t);const after=t.hp;u.hp=0;tick(w,100);close(t.hp,after);assert.equal(w.weaponFlights.length,0);
 const flight=make('M-B03'),b=flight.addUnit('banshee','terran',0,0),q=target(flight,0,4);b.shotInterval=1;flight.fire(b,q);b.hp=0;tick(flight,100);close(100000-q.hp,b.weaponDamage*2);
});
test('B05 retargets only unlaunched repeats and freezes their budget across a checkpoint',()=>{
 const w=make('M-B03','M-B05'),u=w.addUnit('tank','terran',0,0),a=target(w,0,4),b=target(w,1,4);u.shotInterval=1;w.fire(u,a);a.hp=0;const copy=make();copy.restoreRun(w.captureRun());tick(w,90);tick(copy,90);close(100000-b.hp,u.weaponDamage*.2);close(copy.entities.get(b.id)!.hp,b.hp);assert.equal(w.stats.shots,1);
});
test('mother missiles split once, prefer other targets and cap isolated return children at two',()=>{
 for(const neighbors of [0,3]){const w=make('M-P06'),u=w.addUnit('banshee','terran',0,0),a=target(w,0,4),others=Array.from({length:neighbors},(_,i)=>target(w,1+i*.8,4));acquireDoomsdayBlueprint(w,'M-P06');w.fire(u,a);tick(w,180);const loss=[a,...others].reduce((n,t)=>n+100000-t.hp,0);close(loss,u.weaponDamage*2*(neighbors?2.2:1.8));assert.equal(Object.keys(w.expedition.doomsday!.splitSpent!).length,1);}
});
test('a lethal mother impact can still split from that impact point towards living neighbors',()=>{
 const w=make('M-P06'),u=w.addUnit('banshee','terran',0,0),a=target(w,0,4),b=target(w,2,4);a.hp=1;acquireDoomsdayBlueprint(w,'M-P06');w.fire(u,a);tick(w,180);assert.equal(a.hp,0);close(100000-b.hp,u.weaponDamage*2*.4);
});
test('B05 separates the native two-hit mother round without inventing another split or native proc',()=>{
 const w=make('M-P06','M-B05'),u=w.addUnit('banshee','terran',0,0),a=target(w,0,.2),b=target(w,1,1);a.hp=1;u.shotInterval=1;acquireDoomsdayBlueprint(w,'M-P06');w.fire(u,a);assert.equal(w.weaponFlights.filter(p=>!p.doomsdayDerived).length,2);assert.ok(w.weaponFlights.some(p=>p.pendingLaunch));tick(w,180);assert.equal(w.stats.shots,1);assert.equal(Object.keys(w.expedition.doomsday!.splitSpent!).length,1);close(100000-b.hp,u.weaponDamage+u.weaponDamage*2*.4);
});
test('blue flame records only the special host and expires exactly 180 ticks after its last real hit',()=>{
 const w=make('M-G06'),blue=w.addUnit('hellion','terran',0,0),plain=w.addUnit('hellion','terran',4,0),a=target(w,0,4),b=target(w,4,4);acquireDoomsdayBlueprint(w,'M-G06');w.hash.rebuild(w.entities.values());w.fire(blue,a);w.fire(plain,b);close(doomsdaySlow(w,a),.7);close(doomsdaySlow(w,b),1);w.tick=179;close(doomsdaySlow(w,a),.7);w.tick=180;close(doomsdaySlow(w,a),1);
});
test('side turret stays silent for a lone frontal target and never steals the native target',()=>{
 const w=make('M-B09'),u=w.addUnit('tank','terran',0,0),main=target(w,0,4);u.attackTarget=main.id;u.attackFacing=0;acquireDoomsdayBlueprint(w,'M-B09');tickDoomsdayTurrets(w);assert.equal(w.weaponFlights.length,0);const side=target(w,4,0);tickDoomsdayTurrets(w);tick(w,30);close(100000-side.hp,u.weaponDamage*.3);assert.equal(main.hp,100000);assert.equal(u.attackTarget,main.id);
});
test('capacitor charges from HP loss, spends once on a native hit and sends independent side packets',()=>{
 const w=make('M-P04'),u=w.addUnit('tank','terran',0,0),main=target(w,0,4),side=target(w,1,4);acquireDoomsdayBlueprint(w,'M-P04');w.hit(u,u.maxHp*.2,[],1,'zerg',0,1);close(u.doomsday!.capacitor!,.2);w.fire(u,main);tick(w,60);close(100000-main.hp,u.weaponDamage*1.8);close(100000-side.hp,u.weaponDamage*.4);assert.equal(u.doomsday!.capacitor,0);
});
test('the third siege round takes max of splash and piercing, at most three rear victims',()=>{
 const w=make('M-P05'),u=w.addUnit('tank','terran',0,0);u.mode=u.desiredMode='siege';w.refreshStats(u);const a=target(w,0,5),rear=[6,7,8,9].map(z=>target(w,0,z));w.hash.rebuild(w.entities.values());w.fire(u,a);w.fire(u,a);const hp=rear.map(t=>t.hp);w.fire(u,a);close(hp[0]-rear[0].hp,u.weaponDamage*.6);close(hp[1]-rear[1].hp,u.weaponDamage*.6);close(hp[2]-rear[2].hp,u.weaponDamage*.6);close(hp[3]-rear[3].hp,0);
});

for(const carrier of ['tank','tank.2','tank.3','fortress'] as const){
 test('M-P05 uses one original siege impact per contact on the native and repeated round: '+carrier,()=>{
  const w=make('M-P05','M-B03'),gun=w.addUnit('tank','terran',0,0);
  if(carrier==='tank.2'||carrier==='tank.3')gun.eliteId=carrier;
  gun.mode=gun.desiredMode='siege';gun.attackFacing=0;
  if(carrier==='fortress'){w.expedition.doomsday!.ranks['M-O03']=1;acquireDoomsdayBlueprint(w,'M-O03');}
  w.refreshStats(gun);doomsdayCombat(gun).tankRounds=2;
  const front=target(w,0,5),rear=[5.65,8.8,10.4].map(z=>target(w,0,z));
  const fourth=target(w,0,12),side=target(w,1.7,5);
  rear[0].maxShield=rear[0].shield=1;
  w.hash.rebuild(w.entities.values());w.visualEvents=[];
  const calls:SourceEffectRequest[]=[],fx=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),{sourceEventIds:new Set()} as any);
  Object.assign(fx.player,{ready:true,begin:()=>{calls.length=0;},end:()=>{},reset:()=>{},add:(r:SourceEffectRequest)=>calls.push(r)});
  w.fire(gun,front);
  let serial=0,contacts=0;
  for(let n=0;n<180;n++){
   const fresh=w.visualEvents.filter(e=>e.serial>serial);
   serial=fresh.at(-1)?.serial??serial;
   const bore=fresh.filter(e=>e.doomsdayEffect==='bore-hit');
   if(bore.length){
    const trail=bore.filter(e=>e.kind==='support-impact'&&e.doomsdayOrigin);
    assert.deepEqual(trail.map(e=>e.targetId),rear.map(v=>v.id));
    assert.ok(!bore.some(e=>e.targetId===fourth.id||e.targetId===side.id));
    fx.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined);
    const blasts=calls.filter(r=>r.model==='SiegeTankSiegedAttackImpact'&&r.age===0);
    for(const victim of [front,...rear]){
     assert.equal(blasts.filter(r=>r.placement.x===victim.x&&r.placement.z===victim.z).length,1);
     assert.equal(fresh.filter(e=>e.kind==='hit'&&e.entityId===victim.id&&e.hitSourceId===gun.id).length,1);
    }
    contacts++;
   }
   tick(w,1);tickDoomsdayNodes(w);
  }
  assert.equal(contacts,2);
  assert.equal(fourth.hp,fourth.maxHp);
  assert.equal(w.stats.shots,1);
 });
}
