import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {lowDangerState,lowDangerContains} from '../src/render/effects/low-danger-state';
import {LowDangerEffects} from '../src/render/effects/low-danger-effects';
import {hasCombatPreferences,loadCombatDetail,saveCombatDetail} from '../src/render/settings/quality';
import {World} from '../src/simulation/world';

const fixture=()=>{const w=new World({seed:529});w.time=5;return w;};
const cast=(kind:any,id=1)=>({id,kind,source:99,tier:'boss' as const,origin:{x:0,z:0},point:{x:3,z:4},points:[{x:3,z:4},{x:5,z:6}],angle:0,at:6,damage:30,count:3,range:10,radius:1,level:1,percent:0});
test('low, medium and high persist without changing unrelated stored preferences',()=>{
 const saved=new Map<string,string>(),storage={getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>{saved.set(k,v);}};
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
 try{assert.equal(hasCombatPreferences(storage),false);assert.equal(loadCombatDetail(),'full');saved.set('camera','manual');assert.equal(hasCombatPreferences(storage),false);for(const p of ['low','medium','full'] as const){saveCombatDetail(p);assert.equal(loadCombatDetail(),p);assert.equal(saved.get('camera'),'manual');}assert.equal(hasCombatPreferences(storage),true);saved.set('sc2.combatDetail','bad');assert.equal(loadCombatDetail(),'full');}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete (globalThis as any).localStorage;}
});
test('all six enemy warnings use native points, ranges and widths without mutating state',()=>{
 const w=fixture();w.enemySpecials.casts=['charge','cone','fan','bile','spikes','acid'].map((kind,i)=>cast(kind,i+1));const original=structuredClone(w.enemySpecials.snapshot()),warnings=lowDangerState(w);assert.equal(warnings.length,11);assert.deepEqual(w.enemySpecials.snapshot(),original);
 const acid=warnings.find(p=>p.key==='enemy:6')!;assert.equal(lowDangerContains(acid,{x:4,z:4}),true);assert.equal(lowDangerContains(acid,{x:4.01,z:4}),false);
 const cone=warnings.find(p=>p.kind==='cone')!;assert.equal(lowDangerContains(cone,{x:0,z:10}),true);assert.equal(lowDangerContains(cone,{x:0,z:-1}),false);assert.equal(lowDangerContains(cone,{x:6,z:6}),false);
 const lane=warnings.find(p=>p.key==='enemy:5:1')!;assert.equal(lowDangerContains(lane,{x:1,z:5}),true);assert.equal(lowDangerContains(lane,{x:1.01,z:5}),false);
 assert.equal(lowDangerContains(lane,{x:0,z:10.01}),false);assert.equal(lowDangerContains(lane,{x:0,z:-.01}),false);
 w.time=7;assert.equal(lowDangerState(w).length,0);
});
test('native acid expiry, moving charges, ordinary bile and main-hive missiles remain visible after cast removal',()=>{
 const w=fixture(),u=w.addUnit('ultralisk','zerg',2,3,1);w.enemySpecials.charges.set(u.id,{angle:Math.PI/2,remaining:8,damage:5,hits:new Set(),level:1,percent:0});
 w.enemySpecials.acidZones=[{source:u.id,point:{x:2,z:2},radius:3,damage:2,nextTick:6,ticks:2}];w.corrosionZones=[{source:u.id,points:[{x:4,z:4}],damage:2,until:6,nextTick:5.5}];w.effects=[{id:1,kind:'bile',x:0,z:0,end:{x:6,z:6},until:6,radius:1,owner:'zerg',source:u.id}];
 let warnings=lowDangerState(w);assert.equal(warnings.length,4);assert.equal(warnings.find(p=>p.key.startsWith('charge:'))!.radius,u.unitRadius+.15);u.x=4;warnings=lowDangerState(w);assert.equal(warnings.find(p=>p.key.startsWith('charge:'))!.point.x,4);
 w.enemySpecials.charges.clear();w.enemySpecials.acidZones[0].ticks=0;w.time=7;assert.equal(lowDangerState(w).length,0);
 (w as any).campaign18Runtime={mainCombat:{casts:[{...cast('fan',9),warningAt:7,at:8}],missiles:[{id:99,x:1,z:2,angle:0,remaining:5}]}};
 warnings=lowDangerState(w);assert.equal(warnings.length,6);assert.equal(warnings.at(-1)!.radius,.25);w.campaign18Runtime!.mainCombat!.casts=[];w.campaign18Runtime!.mainCombat!.missiles=[];assert.equal(lowDangerState(w).length,0);
});
test('committed packet ownership survives a captured or removed caster without hiding a hostile warning',()=>{
 const w=fixture(),u=w.addUnit('ravager','terran',0,0,1),hostile={...cast('bile'),source:u.id},friendly={...cast('bile',2),source:999};w.enemySpecials.casts=[hostile,friendly];
 friendly.credit={owner:'terran',source:999};assert.equal(lowDangerState(w).length,2);assert.ok(lowDangerState(w).every(p=>p.key.startsWith('enemy:1:')));w.entities.delete(u.id);assert.equal(lowDangerState(w).length,2);
});
test('danger ground carriers use original pixels, preserve terrain height and release expired patches',()=>{
 const w=fixture();w.enemySpecials.casts=[cast('acid')];(w as any).terrain={height:(p:any)=>p.x*.2+p.z*.1};const scene=new THREE.Scene(),fx={batches:new Map([['fx.acid.0',{mesh:{material:{uniforms:{map:{value:new THREE.Texture()},grid:{value:new THREE.Vector2(4,4)}}}}}]])};
 const danger=new LowDangerEffects(scene,fx as any);danger.prepare();danger.setEnabled(true);danger.render(w,()=>true);assert.equal(danger.report().patches.length,1);let mesh:any;scene.traverse(n=>{if(n instanceof THREE.Mesh)mesh=n;});assert.ok(mesh.geometry instanceof THREE.PlaneGeometry);assert.equal(mesh.material.uniforms.map.value,fx.batches.get('fx.acid.0')!.mesh.material.uniforms.map.value);assert.equal(danger.report().geometryMarkers,0);
 const position=mesh.geometry.attributes.position;for(let i=0;i<position.count;i++)assert.ok(Math.abs(position.getY(i)+mesh.position.y-((position.getX(i)+3)*.2+(position.getZ(i)+4)*.1+.045))<1e-5);
 let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);w.enemySpecials.casts=[];danger.render(w,()=>true);assert.equal(disposed,1);assert.equal(danger.report().patches.length,0);danger.reset();
});
