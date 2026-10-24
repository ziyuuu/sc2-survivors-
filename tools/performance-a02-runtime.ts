import type {boot} from '../src/app/bootstrap';
import {installPerformanceB02} from './performance-b02-runtime';
import {stats} from './performance-a02-stats.mjs';
import {HEROES,HERO_IDS_BY_RACE} from '../src/data/heroes';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
import {initializeCarrierSubsystem} from '../src/simulation/combat/carriers';
import * as Economy from '../src/simulation/expedition-economy';
const probe:any=(globalThis as any).__A02Stats=stats();

/** Measurement-only surface, excluded from ordinary src/main. */
export function installPerformanceA02(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceB02(app);
 const w:any=app.world,v:any=app.view,b:any=(window as any).__B02__;
 const nativeRender=v.render;
 const wrap=(obj:any,key:string,name:string)=>{
  const fn=obj[key];if(typeof fn!=='function'||fn.a02Wrapped)return;
  const replacement=function(this:any,...args:any[]){return probe.active?probe.measure(name,()=>fn.apply(this,args)):fn.apply(this,args);};
  (replacement as any).a02Wrapped=true;(replacement as any).a02Native=fn;obj[key]=replacement;
 };
 function capacityMaterial(mat:any,name:string){
  if(!mat||mat.a02Wrapped)return;mat.a02Wrapped=true;
  const draw=mat.draw;mat.draw=function(key:string,tint:number,opacity:number,...args:any[]){
   const batch=this.batches.get(key),before=batch?.count??0,capacity=batch?.mesh.instanceMatrix.count??0;
   const result=draw.call(this,key,tint,opacity,...args);
   if(probe.active&&batch&&opacity>.001)probe.capacity(name+'.'+key,batch.count-before,Number(before>=capacity),batch.count,capacity);
   return result;
  };
  if(mat.stroke){
   const stroke=mat.stroke;mat.stroke=function(points:any[],widths:number[],tint:number,opacity=1,...args:any[]){
    const before=this.sheetVertices,indices=this.sheetIndices,result=stroke.call(this,points,widths,tint,opacity,...args);
    if(probe.active&&this.sheet&&points.length>=2&&opacity>.001)probe.capacity(name+'.stroke',Number(this.sheetVertices>before),Number(before+points.length*2>16384||indices+(points.length-1)*6>49152),this.sheetVertices,16384);
    return result;
   };
  }
 }
 function installCounters(){
  wrap(v,'cameraFrame','camera.frame');wrap(v.protossHeroes,'beginFrame','protoss.beginFrame');
  wrap(v.protossHeroes,'childPresentation','protoss.childPresentation');
  wrap(v.confirmedHeroes,'render','confirmed.render');wrap(v.protossHeroes,'render','protoss.render');wrap(v.zergHeroes,'render','zerg.render');
  for(const [hero,attack]of v.confirmedHeroes.attacks){
   const frame=attack.simulation;if(!frame.a02Wrapped){
    frame.a02Wrapped=true;
    for(const key of ['packets','dots','lines']){
     const descriptor=Object.getOwnPropertyDescriptor(frame,key)!;
     Object.defineProperty(frame,key,{...descriptor,get(){return probe.active?probe.measure('confirmed.'+hero+'.'+key,()=>descriptor.get!.call(frame)):descriptor.get!.call(frame);}});
    }
    wrap(frame,'takeEvents','confirmed.'+hero+'.events');
   }
   capacityMaterial(attack.materials,'confirmed.'+hero);
  }
  for(const [hero,skill]of v.confirmedHeroes.skills)if(!skill.a02Counted){
   skill.a02Counted=true;const render=skill.render;skill.render=function(){
    const result=render.call(this);
    if(probe.active)for(const [shape,batch]of this.batches)probe.capacity('skill.'+hero+'.'+shape,batch.count,0,batch.count,batch.mesh.instanceMatrix.count);
    return result;
   };
  }
  capacityMaterial(v.protossHeroes.material,'protoss');capacityMaterial(v.zergHeroes.material,'zerg');
  for(const [id,mixer]of v.fortMixers)wrap(mixer,'update','fort.'+id+'.mixer');
  const protoss=v.protossHeroes;
  if(!protoss.a02BodiesWrapped){protoss.a02BodiesWrapped=true;const body=protoss.body;
   protoss.body=function(p:any,scale:any,color:any,shell=false){
    const key=shell?'shieldCount':'coreCount',mesh=shell?this.shields:this.cores,before=this[key],result=body.call(this,p,scale,color,shell);
    if(probe.active&&mesh)probe.capacity('protoss.'+(shell?'shells':'cores'),this[key]-before,Number(before>=mesh.instanceMatrix.count),this[key],mesh.instanceMatrix.count);return result;
   };
  }
  const zerg=v.zergHeroes;
  if(!zerg.a02BodiesWrapped){zerg.a02BodiesWrapped=true;const skin=zerg.skin,body=zerg.body;
   zerg.skin=function(...args:any[]){const before=this.membraneCount,result=skin.apply(this,args);if(probe.active&&this.membrane)probe.capacity('zerg.membrane',this.membraneCount-before,Number(before>=256),this.membraneCount,256);return result;};
   zerg.body=function(batches:any[],...args:any[]){const before=batches.map(b=>b.count),result=body.call(this,batches,...args);if(probe.active)batches.forEach((batch,i)=>probe.capacity('zerg.'+(batches===this.bodies?'bodies':'spines')+'.'+i,batch.count-before[i],Number(before[i]>=batch.mesh.instanceMatrix.count),batch.count,batch.mesh.instanceMatrix.count));return result;};
  }
 }
 const draw=(dt=1/60)=>{installCounters();return nativeRender.call(v,dt,1);};
 const stop=()=>{b.freeze();v.render=()=>{};};
 const resume=()=>{v.render=nativeRender;};
 const prepare=async()=>{resume();await b.prepare();installCounters();stop();};
 const snapshot=()=>({world:b.snapshot(),camera:v.camera.matrixWorld.toArray(),epoch:v.contextEpoch,
  protoss:v.protossHeroes.report(),zerg:v.zergHeroes.report(),confirmed:v.confirmedHeroes.report(),
  forts:[...v.fortMixers].map(([id,m]:any)=>({id,time:m.time,visible:v.fortViews.get(id)?.visible,actions:m._actions.map((a:any)=>({clip:a.getClip().name,time:a.time,running:a.isRunning()}))})),
 });
 const reset=async(race:string)=>{
  stop();w.resetRun();w.starship.account=newEquipmentAccount(529);if(!w.selectRace(race))throw Error('race rejected');v.resetRun();if(!w.start())throw Error('start rejected');
  w.stage=15;w.difficulty='hell';w.stageStartedAt=w.time;w.stageElapsed=0;w.prepareStage();
  w.entities.clear();w.heroes.clear();w.expedition.zerglingPairs=[];w.pods=[];w.pickups=[];w.rewardDrops=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.effects=[];w.visualEvents=[];w.weaponFlights=[];w.swarm.pending=[];
  w.autoWaves=false;w.ambientBacklog=[];w.waves=[];w.specialPlan=[];w.eventPlan=[];w.nextWave=Infinity;w.nextExpansionAt=Infinity;
  for(const group of w.expedition.building?.groups??[])group.enabled=false;w.expedition.ledger=[];w.expedition.pendingFreeDeliveries=[];w.expedition.pendingReceipt=null;
  w.paused=false;setDiagnosticHealthLock(w,true);v.setCameraMode('fixed');v.setCameraPitch(50);v.setCameraZoom(.9);
 };
 const heroScene=async(race:string,offset=0,enemies=32)=>{
  await reset(race);const ids=(HERO_IDS_BY_RACE as any)[race].slice(offset,offset+3);
  for(const [i,id]of ids.entries()){
   for(let rank=0;rank<5;rank++)if(!w.acquireHero(id))throw Error('hero acquisition rejected '+id+' rank '+rank);
   const hero=w.heroEntity(id);hero.x=w.anchor.x+(i-1)*3;hero.z=w.anchor.z;hero.prev={x:hero.x,z:hero.z};hero.energy=hero.maxEnergy;hero.hp=hero.maxHp*.6;
  }
  const ally=w.addUnit(w.expedition.familySlots[0],'terran',w.anchor.x,w.anchor.z-1);ally.hp=ally.maxHp*.5;
  for(let i=0;i<enemies;i++){const e=w.addUnit(i%3?'roach':'hydralisk','zerg',w.anchor.x+(i<3?(i-1)*3:(i%8-3.5)*1.3),w.anchor.z+(i<3?1.5:5+Math.floor(i/8)*1.3),1,'regular',15);e.hp=e.maxHp=1e6;e.moveSpeed=0;}
  initializeCarrierSubsystem(w);w.hash.rebuild(w.entities.values());await prepare();
  v.cameraController.update({x:w.anchor.x,y:v.ground(w.anchor),z:w.anchor.z},100,false);
  draw();const casts=ids.map((id:string)=>({id,result:w.castHero(id,w.starship.battleView?.())}));draw();
  return {race,ids,casts,enemies:w.enemyCount(),allies:w.allies().length,heroRanks:[...w.heroes],recipe:w.runConfig.campaignMap};
 };
 const frames=async(count=120,steps=1)=>{
  probe.start();const peaks:any={packets:0,dots:0,lines:0,casts:0,children:0};const startTick=w.tick;
  for(let i=0;i<count;i++){
   for(let n=0;n<steps;n++)w.step();
   draw();peaks.packets=Math.max(peaks.packets,w.heroAttacks.packets.length);peaks.dots=Math.max(peaks.dots,w.heroAttacks.dots.length);peaks.lines=Math.max(peaks.lines,w.heroAttacks.lines.length);peaks.casts=Math.max(peaks.casts,w.heroCasts.length);peaks.children=Math.max(peaks.children,[...w.entities.values()].filter((u:any)=>u.summonKind==='interceptor').length);
   await new Promise(requestAnimationFrame);
  }
  return {...probe.stop(),peaks,startTick,endTick:w.tick,frames:count,stepsPerFrame:steps,snapshot:snapshot()};
 };
 const fortScene=async(outside=false)=>{
  await reset('terran');w.addUnit('marine','terran',w.anchor.x,w.anchor.z);
  w.placeEndlessFortifications();await prepare();
  if(outside)for(const fort of w.fortifications.values()){fort.x+=80;fort.z+=80;}
  draw();installCounters();
  return {outside,forts:snapshot().forts};
 };
 const cameraBench=(mode:string,calls=80)=>{
  probe.active=false;v.setCameraMode(mode);
  const fn=v.cameraFrame.a02Native??v.cameraFrame;
  for(let i=0;i<20;i++)fn.call(v);
  const samples=[];for(let round=0;round<9;round++){const start=performance.now();for(let i=0;i<calls;i++)fn.call(v);samples.push((performance.now()-start)/calls);}
  const frame=fn.call(v);return {mode,calls,samples,bodyCount:frame?.bodies.length??0,occluded:frame?.occluded,active:frame?.active,entities:w.entities.size,viewport:[v.viewportWidth,v.viewportHeight],time:w.time,tick:w.tick};
 };
 const capacityBoundaries=()=>{
  probe.start();const worldBefore=b.snapshot(),rows=[];
  const matrices=[['protoss',v.protossHeroes.material],['zerg',v.zergHeroes.material],...Array.from(v.confirmedHeroes.attacks,([id,a]:any)=>['confirmed.'+id,a.materials])] as any[];
  for(const [name,mat]of matrices){
   mat.begin(0);
   for(const [key,batch]of mat.batches){const cap=batch.mesh.instanceMatrix.count;batch.count=cap-1;
    mat.sprite(key,{x:0,y:0,z:0},1,0xffffff,1);const full=batch.count;
    mat.sprite(key,{x:0,y:0,z:0},1,0xffffff,1);rows.push({name:name+'.'+key,capacity:cap,full,afterOverflow:batch.count});
   }
   mat.begin(0);mat.end();
  }
  const mat=v.protossHeroes.material,points=Array.from({length:8192},(_,i)=>({x:i/100,y:1,z:0}));
  mat.begin(0);mat.stroke(points,points.map(()=>.1),0xffffff);
  const full=mat.sheetVertices;mat.stroke(points.slice(0,2),[.1,.1],0xffffff);
  rows.push({name:'protoss.stroke',capacity:16384,full,afterOverflow:mat.sheetVertices});
  mat.begin(0);mat.stroke(points.slice(0,2),[.1,.1],0xffffff);rows.push({name:'protoss.stroke-after-reset',full:mat.sheetVertices});mat.begin(0);mat.end();
  const counters=probe.stop();draw();
  const dynamic=[];
  for(const [hero,skill]of v.confirmedHeroes.skills){
   const batch=skill.batches.get('orb'),capacity=batch.mesh.instanceMatrix.count;batch.count=capacity;
   skill.orb({x:0,y:0,z:0},.1,0xffffff);
   dynamic.push({hero,beforeCapacity:capacity,afterCapacity:batch.mesh.instanceMatrix.count,count:batch.count});
   batch.count=0;batch.mesh.count=0;
  }
  draw();
  return {rows,counters,dynamic,worldExact:worldBefore===b.snapshot()};
 };
 (window as any).A02={...app,probe,draw,stop,resume,prepare,reset,heroScene,fortScene,cameraBench,capacityBoundaries,frames,snapshot,installCounters,HEROES,HERO_IDS_BY_RACE,Economy};
}
