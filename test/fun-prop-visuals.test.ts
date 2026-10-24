import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import * as THREE from 'three';
import {FunPropAssets,FUN_PROP_NAMES,releaseFunVisual} from '../src/render/units/fun-prop-assets';
import {makeArcanePortal,updateArcanePortal} from '../src/render/units/arcane-portal';
import {empPulseMaterial} from '../src/render/units/emp-pulse';

test('shipped prop asset has every model, immutable hash and no live skeleton dependency',()=>{
 const r=JSON.parse(fs.readFileSync('deploy/runtime/fun-props.json','utf8')).records[0],b=fs.readFileSync(r.gitPath);assert.equal(b.length,r.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),r.packedSha256);
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());for(const name of FUN_PROP_NAMES)assert.ok(g.nodes.some((n:{name:string})=>n.name===name),name);
 assert.equal(g.skins?.length??0,0);assert.ok(!g.nodes.some((n:{name?:string})=>n.name?.startsWith('Icosphere')));
 assert.ok(g.meshes.length>8);assert.ok(g.images.length>0);assert.ok(b.length<3*1024*1024);
});
test('retiring one shared prop preserves sibling and future instances while owned effects dispose once',()=>{
 const assets=new FunPropAssets(),template=new THREE.Group(),model=new THREE.Group();model.name='chest-common';const geo=new THREE.BoxGeometry(),mat=new THREE.MeshBasicMaterial();model.add(new THREE.Mesh(geo,mat));template.add(model);Reflect.set(assets,'template',template);
 let disposed=0;geo.addEventListener('dispose',()=>disposed++);mat.addEventListener('dispose',()=>disposed++);
 const scene=new THREE.Scene(),a=assets.create('chest-common'),b=assets.create('chest-common');scene.add(a,b);releaseFunVisual(a);assert.equal(a.parent,null);assert.equal(b.parent,scene);assert.equal(disposed,0);assert.equal((assets.create('chest-common').children[0].children[0] as THREE.Mesh).geometry,geo);
 const portal=makeArcanePortal();let own=0;portal.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.addEventListener('dispose',()=>own++);(o.material as THREE.Material).addEventListener('dispose',()=>own++);}});releaseFunVisual(portal);assert.equal(own,4);assert.equal(disposed,0);releaseFunVisual(b);
});
test('portal and EMP presentation use explicit game time, preserving paused animation state',()=>{
 const portal=makeArcanePortal(),camera=new THREE.PerspectiveCamera();camera.position.set(10,12,20);updateArcanePortal(portal,3.25,camera);const rot=portal.children[0].rotation.y;
 for(let i=0;i<20;i++)updateArcanePortal(portal,3.25,camera);assert.equal(portal.children[0].rotation.y,rot);for(const child of portal.children)assert.equal(((child as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.time.value,3.25);
 const p=empPulseMaterial(true),assets=new FunPropAssets();Reflect.set(assets,'pulses',new Set([p]));assets.updateTime(5.5);assets.updateTime(5.5);assert.equal(p.uniforms.time.value,5.5);assets.updateTime(5.75);assert.equal(p.uniforms.time.value,5.75);assert.equal(p.depthWrite,false);releaseFunVisual(portal);p.dispose();
});

import {FunVisuals} from '../src/render/units/fun-visuals';
import type {World} from '../src/simulation/world';
test('native Zerg wings update and retire with only the two exported wing pivots',()=>{
 const assets=new FunPropAssets(),template=new THREE.Group(),wings=new THREE.Group();wings.name='elytra';for(const name of ['elytra-left','elytra-right']){const pivot=new THREE.Group();pivot.name=name;wings.add(pivot);}template.add(wings);Reflect.set(assets,'template',template);
 const scene=new THREE.Scene(),view=new FunVisuals(scene,{} as HTMLElement,assets),u={id:1,hp:1,winged:true,wingHeight:1,x:0,z:0,facing:0},world={time:1,phase:'battle',entities:new Map([[1,u]]),encounters:{expanded:{infections:new Map(),elytra:[],short:null,queen:null}}} as unknown as World;
 const update=()=>view.update(world,new THREE.PerspectiveCamera(),1440,900,()=>0,()=>({height:1,radius:1}),()=>true,()=>({x:0,y:2,z:0,scale:1,facing:0}));
 update();assert.equal(view.report().wings,1);const root=scene.getObjectByName('elytra-wings')!;assert.ok(Number.isFinite(root.getObjectByName('elytra-left')!.rotation.z));world.entities.clear();update();assert.equal(view.report().wings,0);assert.equal(root.parent,null);
});
