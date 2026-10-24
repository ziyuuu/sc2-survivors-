import fs from 'node:fs/promises';import assert from 'node:assert/strict';import * as THREE from 'three';
import * as before from '../reports/local/performance-x01-x02-20261020/baseline-numeric.mjs';
import * as after from '../reports/local/performance-x01-x02-20261020/candidate-numeric.mjs';
import {SourceEventIndex} from '../src/render/effects/source/event-index';
import type {VisualEvent} from '../src/simulation/types';
const report:any={method:'CPU-only component measurements. Real player mesh selection with stubbed already-created GPU objects; includes placement and action loop. Event indexing includes construction each frame. Not FPS or GPU evidence.',pools:[],events:[],poses:[]};
const time=(f:()=>void,n:number)=>{const start=performance.now();for(let i=0;i<n;i++)f();return (performance.now()-start)/n;};
function pool(api:any,count:number){const p:any=new api.SourceEffectPlayer(new THREE.Scene(),new THREE.PerspectiveCamera()),def=api.SOURCE_EFFECTS.MedivacHealBeam,resource={definition:def},phase=api.sourcePhase(def,.4);let reads=0,serial=0;
 p.makeMesh=()=>({id:serial++,root:new THREE.Group(),mixer:{stopAllAction(){},update(){}},surfaces:[],actions:new Map(),used:false,lastUsed:0});p.releaseMesh=()=>{};
 const items=Array.from({length:count},()=>p.makeMesh()),proxy=new Proxy(items,{get(target,key,receiver){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,receiver);}});p.meshPools.set(def.id,proxy);
 const requests=Array.from({length:count},(_,i)=>({key:String(i),model:def.id,age:.4,seed:i,placement:{x:i,y:0,z:0,facing:.7}}));
 const frame=()=>{p.begin(1);reads=0;for(const r of requests)p.mesh(resource,r,phase);};frame();const lookupReads=reads;
 const state=items.map(m=>({id:m.id,matrix:m.root.matrix.elements,used:m.used,visible:m.root.visible}));p.meshPools.set(def.id,items); // Count separately; the timer never runs through a Proxy.
 for(let i=0;i<10;i++)frame();const ms=time(frame,80);return {count,lookupReads,ms,state};
}
for(let round=0;round<3;round++)for(const count of [8,200]){let a,b;if(round%2){b=pool(after,count);a=pool(before,count);}else{a=pool(before,count);b=pool(after,count);}assert.deepEqual(a.state,b.state);report.pools.push({round,count,before:{reads:a.lookupReads,ms:a.ms},after:{reads:b.lookupReads,ms:b.ms}});}
for(const count of [24,1200]){
 const events:VisualEvent[]=Array.from({length:count},(_,i)=>({serial:i+1,time:Math.floor(i/100)/60,entityId:i%3?i%30+100:i%30,hitSourceId:i%30,targetId:i%30+100,kind:i%6===0?'attack':i%6===1?'hit':i%6===2?'shield-hit':i%6===3?'projectile-impact':i%6===4?'shield-break':'death'} as VisualEvent));
 const old=()=>events.map(e=>[events.slice().reverse().find(a=>a.kind==='attack'&&a.entityId===e.hitSourceId&&a.time<=e.time)?.serial,events.some(a=>a.serial<e.serial&&a.time===e.time&&a.entityId===e.entityId&&a.hitSourceId===e.hitSourceId&&['hit','shield-hit','shield-break'].includes(a.kind)),events.some(a=>a.kind==='projectile-impact'&&a.time===e.time&&a.entityId===e.hitSourceId&&a.targetId===e.entityId),events.some(a=>a.kind==='attack'&&a.entityId===e.entityId&&Math.abs(a.time-e.time)<.04)]);
 const current=()=>{const index=new SourceEventIndex(events);return events.map(e=>[index.attack(e.hitSourceId!,e.time)?.serial,index.duplicate(e),index.missile(e),index.nearbyAttack(e.entityId,e.time)]);};
 assert.deepEqual(current(),old());for(let i=0;i<10;i++){old();current();}for(let round=0;round<3;round++){let a,b;if(round%2){b=time(current,20);a=time(old,20);}else{a=time(old,20);b=time(current,20);}report.events.push({count,round,beforeMs:a,afterMs:b});}
}
for(let round=0;round<3;round++){
 const records=[];for(const [label,api]of [['before',before],['after',after]] as const){const def=structuredClone(api.SOURCE_EFFECTS.BanelingDeath),phase=api.sourcePhase(def,.13),hot=api.boneMatrices(def,phase);let lost=0;const start=performance.now();for(let i=0;i<2000;i++){api.boneMatrices(def,{...phase,seconds:i+.1});if(api.boneMatrices(def,phase)!==hot)lost++;}records.push({label,ms:performance.now()-start,hotIdentityChanges:lost,...api.sourcePoseCacheReport?{cache:api.sourcePoseCacheReport(def)}:{}});}report.poses.push({round,records});
}
report.pass=true;await fs.writeFile('reports/local/performance-x01-x02-20261020/component-measurements.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
