import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Mesh,MeshBasicMaterial} from 'three';
import {ArmedCombatViews} from '../src/render/effects/armed-combat-views';
import {grantArmedShield} from '../src/simulation/combat/armed-fields';
import {World} from '../src/simulation/world';
import {ARMED_CARD_BY_ID as C} from '../src/data/terran-armed-support';
import {tickArmedRaider,detonateArmedRaider,raiderEntryClearance} from '../src/simulation/combat/armed-raiders';
import {reserveArmedDispatch,armedStageKey,clearArmedStage} from '../src/simulation/combat/armed-support';
import {tickArmedPlanetary} from '../src/simulation/combat/armed-planetary';
import {uniquePrimary,tickUnique} from '../src/simulation/combat/unique-support';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {planNukeVolley,commitArmedNuke} from '../src/simulation/combat/armed-nukes';
import {armedScenario} from '../preview/armed-support-showcase-20261111/scenarios';

function make(){const w=new World({race:'terran',seed:91113,waves:false,sandbox:true,terrain:new FlatTerrain(),obstacles:[]});w.start();w.missions.enabled=w.encounters.enabled=w.starship.enabled=false;for(const u of w.allies())u.stoppedUntil=1000;return w;}
function enemy(w:World,x:number,z:number){const e=w.addUnit('roach','zerg',x,z);e.maxHp=e.hp=10000;e.armor=0;e.moveSpeed=e.weaponDamage=0;return e;}
test('counterattack shields share prepared geometry and keep the flash on the actual recipient',()=>{
 const w=make(),scene=new Scene(),view=new ArmedCombatViews(scene),template=view.shieldTemplate();
 const a=w.addUnit('marine','terran',1,1),b=w.addUnit('marine','terran',3,1);
 grantArmedShield(w,a,'O01',60,300);grantArmedShield(w,b,'O01',60,300);
 w.advance(.4);w.visual('shield-hit',a);view.update(w,()=>true,()=>0);
 const shell=(id:number)=>scene.getObjectByName('shield:'+id)!.children[0] as Mesh;
 assert.equal(shell(a.id).geometry,shell(b.id).geometry);
 assert.equal(shell(a.id).geometry,(template.children[0] as Mesh).geometry);
 assert.notEqual(shell(a.id).material,shell(b.id).material);
 assert.ok((shell(a.id).material as MeshBasicMaterial).opacity>(shell(b.id).material as MeshBasicMaterial).opacity);
 let released=0;shell(a.id).geometry.addEventListener('dispose',()=>released++);
 w.expedition.support.armed!.unitStatus[a.id].cardShields=[];
 view.update(w,()=>true,()=>0);assert.equal(released,0);assert.ok(shell(b.id));
 view.reset(true);assert.equal(released,0);assert.equal(view.shieldTemplate(),template);assert.equal(scene.children.length,0);
 view.reset();assert.equal(released,1);
});
test('every G05 vehicle gets a real approach even with an occupied flank and a save between arrivals',()=>{
 const w=armedScenario('G05').world,starts=new Map<number,{x:number;z:number;time:number}>(),add=w.addUnit;
 w.paused=false;
 w.addUnit=function(...args){
  const unit=add.apply(this,args);
  if(args[0]==='hellion'&&args[1]==='terran'){
   assert.ok(raiderEntryClearance(this,unit.unitRadius)(unit));
   starts.set(unit.id,{x:unit.x,z:unit.z,time:this.time});
  }
  return unit;
 };
 for(let i=0;i<33;i++)w.step();
 assert.equal(starts.size,1);
 const copy=armedScenario('G05').world;copy.restoreRun(w.captureRun());copy.paused=false;
 for(let i=33;i<200;i++){w.step();copy.step();}
 const blasts=(world:World)=>world.visualEvents.filter(e=>e.supportVisual==='raider-blast').map(e=>({id:e.entityId,x:e.x,z:e.z,time:e.time}));
 assert.deepEqual(blasts(copy),blasts(w));
 assert.equal(starts.size,3);assert.equal(blasts(w).length,3);
 for(const [id,start] of starts){
  const hits=blasts(w).filter(e=>e.id===id);assert.equal(hits.length,1);
  assert.ok(hits[0].time-start.time>1);
  assert.ok(Math.hypot(hits[0].x-start.x,hits[0].z-start.z)>8);
 }
 assert.deepEqual(w.expedition.support.armed!.raiderReceipts,copy.expedition.support.armed!.raiderReceipts);
});
test('user-protected reactive and node CDs retain their exact previous values',()=>{
 for(const [id,seconds]of Object.entries({W03:.25,G03:30,W09:18,G07:.25,G08:.25,B01:36,B09:60,N06:10,N07:6,N08:14,N09:8,O01:240}))assert.equal(C[id as keyof typeof C].params.cd,seconds,id);
});
test('every system nuke including the centre uses a virtual receipt, never the enemy identity',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.P01=1;const e=enemy(w,0,6),plan=planNukeVolley({origin:'P01',scorched:false,dense:false,tick:0,center:e,bearing:0,legalTargets:4,budget:2400,radius:6},()=>true);assert.deepEqual(Object.keys(plan.points[0]).sort(),['x','z']);assert.ok(commitArmedNuke(w,'P01',e));w.advance(1);const events=w.visualEvents.filter(e=>e.kind==='strategic-impact');assert.ok(events.length>=3);assert.ok(events.every(e=>e.entityId===0&&e.race==='terran'&&!e.heroId&&!e.eliteId));assert.ok(e.hp<10000);
});
test('G05 follows real ground movement into contact, detonates once and restores its detonation receipt',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.G05=1;const e=enemy(w,0,7);reserveArmedDispatch(w,'G05');w.advance(.6);const cars=w.allies().filter(u=>u.armed?.cardId==='G05');assert.equal(cars.length,3);const car=cars[0],distance=Math.hypot(e.x-car.x,e.z-car.z);let t=0;for(;t<360&&car.hp>0;t++){w.tick++;w.time=w.tick/60;tickArmedRaider(w,car,1/60);}assert.equal(car.hp,0);assert.ok(t<360);assert.ok(distance>2);assert.equal(a.raiderReceipts!.filter(r=>r===`${car.id}:${car.bornAt}`).length,1);assert.ok(e.hp<10000);const before=e.hp;detonateArmedRaider(w,car);assert.equal(e.hp,before);const copy=make();copy.restoreRun(w.captureRun());copy.paused=false;const body=copy.entities.get(car.id)!;detonateArmedRaider(copy,body);assert.equal(copy.entities.get(e.id)!.hp,before);
});
test('stage retirement cancels raiders without detonating on the next battlefield',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.G05=1;const e=enemy(w,0,8);reserveArmedDispatch(w,'G05');w.advance(.6);const before=e.hp;clearArmedStage(w);assert.equal(e.hp,before);assert.equal(w.visualEvents.filter(e=>e.supportVisual==='raider-blast').length,0);
});
test('G07 prefers a longer distinct chain and avoids a recently used pair while alternatives exist',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.G07=1;w.expedition.support.unique.levels['terran.ricochet']=1;const u=w.allies()[0],first=enemy(w,0,5),near=enemy(w,1,5),far=enemy(w,4,5);w.random=()=>0;uniquePrimary(w,u,first,100);const p=w.expedition.support.unique.packets[0];assert.equal(p.target,far.id);assert.ok(p.at-p.start>=.12);w.time=p.at;tickUnique(w);assert.equal(far.hp,9970);const next=w.expedition.support.unique.packets.find(p=>p.kind==='ricochet')!;assert.ok(next);assert.equal(new Set(next.seen).size,next.seen!.length);assert.notEqual(next.target,first.id);w.tick=15;w.time=.25;u.shotSequence=(u.shotSequence??0)+1;uniquePrimary(w,u,first,100);assert.ok(w.expedition.support.unique.packets.some(p=>p.from.x===first.x&&p.target===near.id));
});
test('P05 lands four unarmed SupplyDepot devices with the original aura and survives a checkpoint',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.P05=1;enemy(w,0,8);assert.ok(reserveArmedDispatch(w,'P05'));w.advance(.9);assert.equal(w.fortifications.size,4);assert.ok([...w.fortifications.values()].every(f=>f.kind==='supply_depot'));const copy=make();copy.restoreRun(w.captureRun());assert.ok([...copy.fortifications.values()].every(f=>f.kind==='supply_depot'));
});
test('O03 sweeps for two seconds with eight saved pulses, fixed total budget and one garrison',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.O03=1;const e=enemy(w,0,6);w.tick=120;w.time=2;a.hold={point:{x:0,z:0},sinceTick:0,stageKey:armedStageKey(w)};assert.ok(reserveArmedDispatch(w,'O03'));w.advance(.4);const d=a.deployments[0],fort=w.fortifications.get(d.id)!;d.charges=1;e.x=fort.x;e.z=fort.z+6;e.armor=0;fort.nextActionAt=1000;tickArmedPlanetary(w);assert.ok(d.sweep);assert.equal(d.sweep!.endTick-d.sweep!.startedTick,120);assert.equal(d.passengers.length,3);assert.equal(d.charges,0);const started=w.tick,before=e.hp;for(let i=1;i<=4;i++){w.tick=started+i*15;w.time=w.tick/60;tickArmedPlanetary(w);}assert.ok(e.hp<before);assert.equal(d.sweep!.nextIndex,4);const copy=make();copy.restoreRun(w.captureRun());copy.paused=false;const saved=copy.entities.get(e.id)!.hp;tickArmedPlanetary(copy);assert.equal(copy.entities.get(e.id)!.hp,saved);for(let i=5;i<=8;i++){for(const world of [w,copy]){world.tick=started+i*15;world.time=world.tick/60;tickArmedPlanetary(world);}}assert.equal(d.sweep,undefined);assert.equal(copy.expedition.support.armed!.deployments[0].sweep,undefined);assert.equal(before-e.hp,640);assert.equal(copy.entities.get(e.id)!.hp,e.hp);assert.equal(d.passengers.length,3);
});
