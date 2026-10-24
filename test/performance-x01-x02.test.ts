import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SOURCE_EFFECTS,SourceEffectPlayer} from '../src/render/effects/source/player';
import {boneMatrices,sourcePhase,sourcePoseCacheReport} from '../src/render/effects/source/timeline';
import {sourceParticleQuads} from '../src/render/effects/source/particles';
import {sourceRibbonQuads,sourceProjectionQuads} from '../src/render/effects/source/ribbons';
import {SourceEventIndex,firstSourceAttackIds,latestSourceAttacks} from '../src/render/effects/source/event-index';
import type {VisualEvent} from '../src/simulation/types';

test('exact pose cache retains a hot pose across capacity churn and stays bounded',()=>{
 const def=structuredClone(SOURCE_EFFECTS.MedivacHealBeam),phase=sourcePhase(def,.13),hot=boneMatrices(def,phase);
 for(let i=0;i<1100;i++){boneMatrices(def,{...phase,seconds:i+.25});assert.equal(boneMatrices(def,phase),hot);}
 const report=sourcePoseCacheReport(def);assert.equal(report.entries,512);assert.equal(report.misses,1101);assert.equal(report.hits,1100);assert.equal(report.evictions,589);
 assert.deepEqual(boneMatrices(def,{...phase,seconds:.13+Number.EPSILON}).map(m=>m.elements),boneMatrices(structuredClone(def),{...phase,seconds:.13+Number.EPSILON}).map(m=>m.elements));
});

test('same-named clips with different authored tracks never alias a pose',()=>{
 const def=structuredClone(SOURCE_EFFECTS.MedivacHealBeam),a=sourcePhase(def,.12),b=structuredClone(a);
 const ref=def.bones[0].location;b.clip.tracks=b.clip.tracks.filter(t=>t.id!==ref.id);b.clip.tracks.push({id:ref.id,frames:[0],values:[{x:123,y:456,z:789}]} as any);
 const before=boneMatrices(def,a);assert.notDeepEqual(boneMatrices(def,b)[0].elements,before[0].elements);assert.equal(boneMatrices(def,a),before);
});

test('empty and inactive layers never evaluate an unused skeleton',()=>{
 const def=structuredClone(SOURCE_EFFECTS.MedivacHealBeam),camera=new THREE.PerspectiveCamera(),request={key:'empty',model:def.id,age:.4,seed:5,placement:{x:0,y:0,z:0,facing:0}};
 def.particles=[];def.ribbons=[];def.projections=[];Object.defineProperty(def,'bones',{get(){throw Error('Unused skeleton evaluated');}});
 assert.deepEqual(sourceParticleQuads(def,request,camera,()=>0),[]);assert.deepEqual(sourceRibbonQuads(def,request,camera),[]);assert.deepEqual(sourceProjectionQuads(def,request,()=>0),[]);
 def.ribbons=[{bone:0,material_reference_index:0,active:0}];def.projections=[{bone:0,material_reference_index:0,active:1,lifetime_attack:0,lifetime_hold:0,lifetime_decay:0}];
 assert.deepEqual(sourceRibbonQuads(def,request,camera),[]);assert.deepEqual(sourceProjectionQuads(def,request,()=>0),[]);
 const particles=structuredClone(SOURCE_EFFECTS.MedivacHealBeam);for(const p of particles.particles){p.lifespan=0;p.lifespan_randomize=0;p.additional_flags=0;}Object.defineProperty(particles,'bones',{get(){throw Error('No live births');}});
 assert.deepEqual(sourceParticleQuads(particles,{...request,age:0},camera,()=>0),[]);
});

test('event index matches full-array predicates for reordered, tied, sparse and dense receipts',()=>{
 let random=529;const next=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random;};
 const kinds=['hit','shield-hit','shield-break','attack','projectile-impact','death'] as const;
 for(const count of [0,1,12,1200]){
  const events=Array.from({length:count},(_,i)=>({kind:kinds[next()%kinds.length],serial:next()%1500,entityId:next()%40,hitSourceId:next()%5?next()%40:undefined,targetId:next()%40,time:(next()%7)/60} as VisualEvent));
  const index=new SourceEventIndex(events);
  const first=firstSourceAttackIds(events),latest=latestSourceAttacks(events);
  for(const e of events){
   assert.equal(first.get(e.attackId),events.find(a=>a.attackId===e.attackId));
   assert.equal(latest.get(e.entityId),[...events].reverse().find(a=>a.kind==='attack'&&a.entityId===e.entityId));
   assert.equal(index.attack(e.entityId,e.time),[...events].reverse().find(a=>a.kind==='attack'&&a.entityId===e.entityId&&a.time<=e.time));
   assert.equal(index.duplicate(e),events.some(a=>a.serial<e.serial&&a.time===e.time&&a.entityId===e.entityId&&a.hitSourceId===e.hitSourceId&&['hit','shield-hit','shield-break'].includes(a.kind)));
   assert.equal(index.missile(e),events.some(a=>a.kind==='projectile-impact'&&a.time===e.time&&a.entityId===e.hitSourceId&&a.targetId===e.entityId));
   assert.equal(index.nearbyAttack(e.entityId,e.time),events.some(a=>a.kind==='attack'&&a.entityId===e.entityId&&Math.abs(a.time-e.time)<.04));
  }
 }
 const receipt={kind:'hit',entityId:2,hitSourceId:1,time:1,serial:3} as VisualEvent;
 const late={kind:'attack',entityId:1,time:1,serial:9} as VisualEvent,earlier={...late,time:0,serial:1},future={...late,time:2,serial:10};
 assert.equal(new SourceEventIndex([earlier,receipt,late,future]).attack(1,1),late);
 assert.equal(new SourceEventIndex([]).attack(1,1),undefined);
 const x={...receipt,attackId:'same'},y={...late,attackId:'same'};assert.equal(firstSourceAttackIds([x,y]).get('same'),x);assert.equal(firstSourceAttackIds([]).get('same'),undefined);
});

test('mesh cursors retain first-unused order across models, displacement, shrinking and reset',()=>{
 const player:any=new SourceEffectPlayer(new THREE.Scene(),new THREE.PerspectiveCamera()),def=SOURCE_EFFECTS.MedivacHealBeam,resource={definition:def};
 let serial=0;const released:number[]=[];
 player.makeMesh=()=>({id:++serial,root:new THREE.Group(),mixer:{stopAllAction(){},update(){}},actions:new Map(),surfaces:[],used:false,lastUsed:0});
 player.releaseMesh=(m:any)=>released.push(m.id);
 for(const key of [def.id,def.id+':displacement'])player.meshPools.set(key,[player.makeMesh()]);
 const add=(n:number,displacement=false)=>{for(let i=0;i<n;i++)player.mesh(resource,{key:String(i),model:def.id,age:.2,seed:i,placement:{x:i,y:0,z:0,facing:0}},sourcePhase(def,.2),displacement);};
 player.begin(1);add(5);add(3,true);const order=[...player.meshPools].map(([key,pool]:any)=>[key,pool.map((m:any)=>m.id)]);player.end();
 player.begin(1.1);add(5);add(3,true);assert.deepEqual([...player.meshPools].map(([key,pool]:any)=>[key,pool.map((m:any)=>m.id)]),order);player.end();
 player.begin(5);add(2);add(1,true);player.end();assert.equal(player.meshPools.get(def.id).length,2);assert.equal(player.meshPools.get(def.id+':displacement').length,1);
 player.begin(6);add(4);player.end();assert.equal(player.meshPools.get(def.id).length,4);assert.equal(new Set(player.meshPools.get(def.id).map((m:any)=>m.id)).size,4);
 player.reset();assert.equal(player.meshPools.get(def.id).length,1);assert.equal(player.meshPools.get(def.id+':displacement').length,1);assert.equal(new Set(released).size,released.length);
 player.begin(7);add(2);assert.equal(player.meshPools.get(def.id)[1].root.visible,true);player.end();
});
