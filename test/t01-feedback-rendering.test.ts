import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {displayModelKey} from '../src/render/materials/elite-visual';
import {modelPresentationScale} from '../src/data/combat-presentation';
import {callFleet,tickFleetCall} from '../src/simulation/missions/fleet';
import {equipmentPresentation} from '../src/simulation/starship/presentation';
import {equipmentEffectRequests} from '../src/render/effects/equipment-effects';
import {SourceCombatEffects} from '../src/render/effects/source-combat-effects';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {sourceRibbonQuads} from '../src/render/effects/source/ribbons';
import type {SourceEffectDefinition,SourceEffectRequest} from '../src/render/effects/source/types';
const fresh=()=>{const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.entities.clear();w.phase='battle';w.paused=false;w.anchor={x:0,z:0,facing:0};w.starship.enabled=true;return w;};
test('generic recall and expiry keep source particles without drawing a Stalker body',()=>{
 for(const type of ['marine','zergling','zealot'] as const){const w=fresh(),u=w.addUnit(type,'terran',0,0);for(const kind of ['recall-from','expiry'] as const)equipmentPresentation(w,kind,u);const requests=equipmentEffectRequests(w,()=>0);assert.equal(requests.length,2);for(const r of requests){assert.equal(r.mesh,false);assert.equal(r.model,'BlinkOriginModel');assert.ok(SOURCE_EFFECTS[r.model].particles.length>0);}}
});
test('native fleet spawns three ships at the same model scale and legacy half-size saves render compatibly',()=>{
 const w=fresh();w.missions.fleet.unlocked=true;assert.ok(callFleet(w,{x:0,z:0}));for(let n=0;n<100;n++){w.tick++;w.time=w.tick/60;tickFleetCall(w);}assert.equal(w.missions.fleet.ships.size,3);
 for(const id of w.missions.fleet.ships.keys()){const u=w.entities.get(id)!;assert.equal(u.visualScale,1);const scale=modelPresentationScale(u);assert.equal(scale,modelPresentationScale({...u,mission:undefined,visualScale:1}));const legacy={...u,visualScale:.5};assert.equal(modelPresentationScale(legacy),scale);assert.equal(legacy.visualScale,.5);assert.equal(modelPresentationScale({...u,mission:undefined,visualScale:.5}),scale*.5);}
});
const ref=(value:unknown)=>({id:0,interpolation:1,default:value});
function cylinder(gravity:number):SourceEffectDefinition{return {id:'cylinder',source:'fixture',sourceSha256:'',scale:[1,1,1],materialProfile:{source:'fixture',sourceSha256:'',glbSha256:'',materials:[],composites:[],compositeTracks:[],clips:[{name:'Stand',duration:2,tracks:[]}]},bones:[{name:'root',parent:-1,flags:0,location:ref({x:0,y:0,z:0}),rotation:ref({x:0,y:0,z:0,w:1}),scale:ref({x:1,y:1,z:1})} as any],materialReferences:[],displacementMaterials:[],particles:[],copies:[],ribbons:[{bone:0,material_reference_index:0,active:1,divisions:3,sides:3,ribbon_type:2,lifespan:1,speed:0,gravity,scale:{x:.3,y:.3,z:.3},color_base:{r:255,g:255,b:255,a:255},color_mid:{r:255,g:255,b:255,a:255},color_tip:{r:255,g:255,b:255,a:255}}],projections:[],forces:[],attachments:[]};}
const request:SourceEffectRequest={key:'tube',model:'cylinder',age:.6,seed:1,placement:{x:0,y:10,z:0,facing:0},clip:'Stand'};
test('ribbon signed source gravity falls and source cylinder faces cover one UV circumference',()=>{
 const camera=new THREE.PerspectiveCamera();camera.position.set(2,15,10);
 for(const gravity of [-4.22,4.22]){const q=sourceRibbonQuads(cylinder(gravity),request,camera);assert.equal(q.length,9);assert.equal(Math.sign(q.at(-1)!.matrix.elements[13]-10),Math.sign(gravity));for(let i=0;i<3;i++)assert.deepEqual(q[i].uv,[i/3,0,1/3,1/3]);}
 const a=sourceRibbonQuads(cylinder(-4.22),request,camera);camera.position.set(-15,1,-20);const b=sourceRibbonQuads(cylinder(-4.22),request,camera);assert.deepEqual(a.map(q=>q.matrix.elements),b.map(q=>q.matrix.elements));
});
test('Zealot dread is one live body layer across attacks, with independent blade trails',()=>{
 const w=fresh(),u=w.addUnit('zealot','terran',0,0),target=w.addUnit('roach','zerg',0,2);w.visualEvents=[];w.time=1;w.visual('attack',u,target);w.visual('attack',u,target);
 const fx=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),{sourceEventIds:new Set()} as any),requests:SourceEffectRequest[]=[];fx.player.ready=true;fx.player.add=r=>{requests.push(r);};
 fx.render(w,()=>({x:0,y:0,z:0}),(_e,_m,_a,live)=>({matrix:new THREE.Matrix4().toArray(),clip:live?'Stand':'Attack',seconds:.5}));
 const hair=requests.filter(r=>r.key==='body-ribbon:'+u.id),attacks=requests.filter(r=>r.key.includes(':body:Zealot'));assert.equal(hair.length,1);assert.deepEqual(hair[0].ribbonIndices,[1]);assert.equal(hair[0].particles,false);assert.equal(attacks.length,2);assert.ok(attacks.every(r=>r.ribbonIndices?.join(',')==='0,2,3'));
 requests.length=0;u.hp=0;fx.render(w,()=>({x:0,y:0,z:0}),()=>undefined);assert.ok(!requests.some(r=>r.key==='body-ribbon:'+u.id));
});

test('equipment gift airship resolves the original hero art without acquiring hero gameplay identity',()=>{
 const u={unitType:'yamato_battlecruiser' as const,flying:true};assert.equal(displayModelKey(u),'hero.yamato_battlecruiser');assert.equal(modelPresentationScale(u),modelPresentationScale({...u,modelKey:'hero.yamato_battlecruiser'}));assert.equal('heroId' in u,false);
});
test('finite opaque ribbon trims arc length instead of stacking old sections on the tip',()=>{
 const camera=new THREE.PerspectiveCamera();camera.position.set(10,10,10);const def=cylinder(-4.22);Object.assign(def.ribbons[0],{length:.8,lifespan:5,divisions:30});const q=sourceRibbonQuads(def,{...request,age:5},camera);assert.equal(q.length,90);
 const lengths=q.filter((_,i)=>i%3===0).map(q=>new THREE.Vector3().setFromMatrixColumn(q.matrix,1).length()/1.015);assert.ok(Math.abs(lengths.reduce((a,b)=>a+b,0)-.8*1.4)<1e-6);assert.ok(Math.max(...lengths)-Math.min(...lengths)<1e-6);
});
