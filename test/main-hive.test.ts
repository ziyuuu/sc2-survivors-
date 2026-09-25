import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {MAIN_HIVE_EVENTS,tickMainHive} from '../src/simulation/combat/main-hive';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {CAMPAIGN18_WEIGHTS} from '../src/data/campaign18';
const DT=1/60;
function make(stage=18){const w=new World({race:'terran',sandbox:true,terrain:false,obstacles:[],waves:false,seed:421});w.start();w.stage=stage;w.stageElapsed=0;w.stageStartedAt=0;w.prepareStage();w.entities.clear();if(w.hive){w.hive.x=0;w.hive.z=0;}return w;}
function unit(w:World,x=0,z=10,flying=false){const u=w.addUnit('marine','terran',x,z);u.hp=u.maxHp=1000;u.armor=0;u.shield=u.maxShield=0;u.flying=flying;return u;}
function tick(w:World,at:number,dt=DT){w.time=at;w.tick=Math.round(at/DT);w.stageElapsed=at;tickMainHive(w,dt);}
function seek(w:World,at:number){w.campaign18Runtime!.mainCombat!.nextEvent=MAIN_HIVE_EVENTS.findIndex(e=>e.at===at);}
function restore(w:World){const saved=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!;const copy=make(w.stage);copy.restoreRun(saved);return copy;}

test('three phases use separated warnings without healing the damaged main hive',()=>{
 const w=make();unit(w);const state=w.campaign18Runtime!.mainCombat!,hive=w.hive!,hp=hive.hp-=123;
 tick(w,4);assert.equal(state.casts[0].kind,'fan');assert.equal(w.campaign18Runtime!.mainPhase,0);assert.equal(state.casts[0].at-state.casts[0].warningAt,1.5);
 seek(w,45);state.casts=[];tick(w,45);assert.equal(state.casts[0].kind,'bile');assert.equal(w.campaign18Runtime!.mainPhase,1);
 seek(w,100);state.casts=[];tick(w,100);assert.equal(state.casts[0].kind,'line');assert.equal(w.campaign18Runtime!.mainPhase,2);assert.equal(hive.hp,hp);
 for(let i=1;i<MAIN_HIVE_EVENTS.length;i++)assert.ok(MAIN_HIVE_EVENTS[i].at-MAIN_HIVE_EVENTS[i-1].at>=2);
 assert.ok(MAIN_HIVE_EVENTS.every(e=>e.at>=0&&e.at+1.5<150));
});
test('hidden units and hidden squad anchors cannot steer warnings; an actual scan can expose them',()=>{
 const a=make(),b=make();const hiddenA=unit(a,12,4),hiddenB=unit(b,-18,-6);hiddenA.cloaked=hiddenB.cloaked=true;a.anchor.x=12;a.anchor.z=4;b.anchor.x=-18;b.anchor.z=-6;
 tick(a,4);tick(b,4);assert.deepEqual(a.campaign18Runtime!.mainCombat!.casts,b.campaign18Runtime!.mainCombat!.casts);
 a.expedition!.detectionFields.push({id:999,team:'enemy',x:hiddenA.x,z:hiddenA.z,radius:12,until:20});tick(a,12);const aimed=a.campaign18Runtime!.mainCombat!.casts.find(c=>c.warningAt===12)!;assert.deepEqual(aimed.point,{x:12,z:4});
});
test('bile resolves after exactly 1.5 seconds at its warned position and can be dodged',()=>{
 const w=make(),target=unit(w,0,10);seek(w,45);tick(w,45);const cast=w.campaign18Runtime!.mainCombat!.casts[0];assert.deepEqual(cast.point,{x:0,z:10});
 tick(w,46.49);assert.equal(target.hp,1000);target.x=8;const other=unit(w,0,10),air=unit(w,0,10,true);other.cloaked=true;
 tick(w,46.5);assert.equal(target.hp,1000);assert.equal(air.hp,1000);assert.equal(other.hp,1000-cast.damage);assert.equal(other.cloaked,true);assert.equal(w.campaign18Runtime!.mainCombat!.casts.length,0);
 tick(w,46.6);assert.equal(other.hp,1000-cast.damage);
});
test('final line keeps its warned direction and hits each intersecting ground or air body once',()=>{
 const w=make(),target=unit(w,0,10),air=unit(w,0,16,true),offAxis=unit(w,4,16);seek(w,100);tick(w,100);const cast=w.campaign18Runtime!.mainCombat!.casts[0];target.x=8;
 tick(w,101.49);assert.equal(air.hp,1000);tick(w,101.5);assert.equal(target.hp,1000);assert.equal(offAxis.hp,1000);assert.equal(air.hp,1000-cast.damage);tick(w,101.6);assert.equal(air.hp,1000-cast.damage);
});
test('fan travels slowly after its warning and one volley cannot hit a body five times',()=>{
 const w=make(),target=unit(w,0,10);tick(w,4);const cast=w.campaign18Runtime!.mainCombat!.casts[0];tick(w,5.49);assert.equal(w.campaign18Runtime!.mainCombat!.missiles.length,0);
 tick(w,5.5);const state=w.campaign18Runtime!.mainCombat!;assert.equal(state.missiles.length,5);assert.equal(target.hp,1000);assert.ok(Math.abs(Math.hypot(state.missiles[2].x,state.missiles[2].z)-5*DT)<1e-8);
 for(let at=5.5+DT;at<=7.6;at+=DT)tick(w,at);assert.equal(target.hp,1000-cast.damage);
 // Move a previously hit body into another ray of this same volley: shared hit tracking survives.
 const ray=state.missiles[0];target.x=ray.x;target.z=ray.z;tick(w,7.62);assert.equal(target.hp,1000-cast.damage);
});
test('pending warning and moving fan survive portable archive round trips without replay or duplicate hits',()=>{
 const w=make(),target=unit(w,0,10);tick(w,4);const warned=restore(w);assert.equal(warned.paused,true);const before=JSON.stringify(warned.campaign18Runtime!.mainCombat);for(let i=0;i<90;i++)warned.step();assert.equal(JSON.stringify(warned.campaign18Runtime!.mainCombat),before);assert.equal(warned.time,4);
 tick(w,5.5);tick(warned,5.5);assert.deepEqual(warned.campaign18Runtime!.mainCombat,w.campaign18Runtime!.mainCombat);
 for(let at=5.5+DT;at<=7.6;at+=DT)tick(w,at);const moving=restore(w),missiles=moving.campaign18Runtime!.mainCombat!.missiles;assert.ok(missiles[0].hitIds.includes(target.id));assert.strictEqual(missiles[0].hitIds,missiles[4].hitIds);
 for(let at=7.62;at<10;at+=DT){tick(w,at);tick(moving,at);}assert.equal(moving.entities.get(target.id)!.hp,w.entities.get(target.id)!.hp);assert.deepEqual(moving.campaign18Runtime!.mainCombat,w.campaign18Runtime!.mainCombat);
});
test('destroying the hive cancels attacks that have not fired and stops finite production without replacement',()=>{
 const w=make(),target=unit(w,0,10),id=w.hive!.id;seek(w,45);tick(w,45);assert.equal(w.campaign18Runtime!.mainCombat!.casts.length,1);w.hive!.hp=0;w.time=w.stageElapsed=46.5;(w as any).updateHives();assert.equal(target.hp,1000);assert.deepEqual(w.campaign18Runtime!.mainCombat!.casts,[]);assert.ok(w.campaign18Runtime!.hiveBatches.every(b=>b.types.length===0));
 w.prepareStage();assert.equal(w.hive!.id,id);assert.equal(w.hive!.hp,0);tick(w,100);assert.deepEqual(w.campaign18Runtime!.mainCombat!.casts,[]);
});
test('missing combat state in an intermediate save beyond the last event does not replay old attacks',()=>{
 const w=make();unit(w);delete w.campaign18Runtime!.mainCombat;tick(w,149);assert.equal(w.campaign18Runtime!.mainCombat!.nextEvent,MAIN_HIVE_EVENTS.length);assert.deepEqual(w.campaign18Runtime!.mainCombat!.casts,[]);
});
test('each stage from four has one ordinary first-wave scout without adding bodies or threat',()=>{
 for(let stage=3;stage<=18;stage++){const w=make(stage),wave=(w as any).waves[0] as {types:(keyof typeof CAMPAIGN18_WEIGHTS)[]},expected=wave.types.reduce((n,t)=>n+CAMPAIGN18_WEIGHTS[t],0);w.spawnWave();const pending=(w as any).ambientBacklog as {type:keyof typeof CAMPAIGN18_WEIGHTS;detector?:boolean}[],released=[...w.entities.values()].filter(u=>u.owner==='zerg');assert.equal(pending.length+released.length,wave.types.length);assert.equal(pending.filter(e=>e.detector).length+released.filter(u=>u.detector).length,stage>=4?1:0);assert.equal(pending.reduce((n,e)=>n+CAMPAIGN18_WEIGHTS[e.type],0)+released.reduce((n,u)=>n+CAMPAIGN18_WEIGHTS[u.unitType as keyof typeof CAMPAIGN18_WEIGHTS],0),expected);
  const copy=restore(w);assert.equal([...copy.entities.values()].filter(u=>u.detector).length,released.filter(u=>u.detector).length);const before=pending.filter(e=>e.detector).length+released.filter(u=>u.detector).length;w.spawnWave();assert.equal((w as any).ambientBacklog.filter((e:any)=>e.detector).length+[...w.entities.values()].filter(u=>u.detector).length,before);
 }
});
