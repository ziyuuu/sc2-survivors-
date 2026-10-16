import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {updateFortRibbons,disposeFortRibbons} from '../src/render/scene/fort-ribbons';

async function original(){
 (globalThis as any).ProgressEvent=class{constructor(public type:string,init:any){Object.assign(this,init);}};
 const catalog=JSON.parse(fs.readFileSync('deploy/runtime/source-assets.json','utf8')),record=catalog.entries.find((r:any)=>r.runtime.id==='model.fort.turret_zerg'),bytes=fs.readFileSync(record.gitPath),jsonLength=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),bin=bytes.subarray(28+jsonLength);
 j.images=[];j.textures=[];j.materials=j.materials.map(()=>({}));j.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
 return new GLTFLoader().parseAsync(JSON.stringify(j),'');
}
function tubes(root:THREE.Object3D){const a:THREE.Mesh[]=[];root.traverse(n=>{if(n instanceof THREE.Mesh&&n.userData.sc2Spline)a.push(n);});return a;}
function ring(mesh:THREE.Mesh,at:number){const p=mesh.geometry.attributes.position,data=mesh.userData.sc2Spline.ribbon,v=new THREE.Vector3();for(let side=0;side<data.sides;side++)v.add(new THREE.Vector3().fromBufferAttribute(p,at*(data.sides+1)+side));return v.divideScalar(data.sides).applyMatrix4(mesh.matrixWorld);}

test('original SpineCrawler tubes connect actual animated bones during stand, attack and death',async()=>{
 const g=await original(),root=g.scene,mixer=new THREE.AnimationMixer(root),meshes=tubes(root);assert.equal(meshes.length,2);
 for(const m of meshes){assert.equal(m.userData.sc2Spline.ribbon.divisions,30);assert.equal(m.userData.sc2Spline.ribbon.sides,6);assert.equal(m.geometry.index!.count,1080);}
 for(const [name,times]of [['Stand Burrow',[0,.5,3.8]],['Attack',[0,.3,1.9]],['Death',[0,.8,3,6.5]]] as const){
  mixer.stopAllAction();const clip=g.animations.find(c=>c.name===name)!;assert.ok(clip);mixer.clipAction(clip).setLoop(THREE.LoopOnce,1).play();
  for(const time of times){mixer.setTime(time);updateFortRibbons(root,name,time);root.updateMatrixWorld(true);
   for(const mesh of meshes){const d=mesh.userData.sc2Spline,p=mesh.geometry.attributes.position;assert.ok([...p.array].every(Number.isFinite));assert.ok(mesh.userData.sourceRibbonSpan>0);const start=root.getObjectByName(d.sourceBone)!.getWorldPosition(new THREE.Vector3()),offset=d.ribbon.spline[0].emission_offset,end=root.getObjectByName(d.endBone)!.localToWorld(new THREE.Vector3(offset.x,offset.y,offset.z));assert.ok(ring(mesh,0).distanceTo(start)<1e-5);assert.ok(ring(mesh,d.ribbon.divisions).distanceTo(end)<1e-5);}
  }
 }
 disposeFortRibbons(root);
});

test('two live original splines have independent geometry, frozen poses and bounded disposal',async()=>{
 const g=await original(),a=clone(g.scene),b=clone(g.scene),stand=g.animations.find(c=>c.name==='Stand Burrow')!,ma=new THREE.AnimationMixer(a),mb=new THREE.AnimationMixer(b);ma.clipAction(stand).play();mb.clipAction(stand).play();ma.setTime(.2);mb.setTime(1.1);updateFortRibbons(a,stand.name,.2);updateFortRibbons(b,stand.name,1.1);const aa=tubes(a),bb=tubes(b);assert.notEqual(aa[0].geometry,bb[0].geometry);const frozen=Array.from(aa[0].geometry.attributes.position.array),other=Array.from(bb[0].geometry.attributes.position.array);updateFortRibbons(a,stand.name,.2);assert.deepEqual(Array.from(aa[0].geometry.attributes.position.array),frozen);ma.setTime(1.6);updateFortRibbons(a,stand.name,1.6);assert.deepEqual(Array.from(bb[0].geometry.attributes.position.array),other);let disposed=0;for(const mesh of aa)mesh.geometry.addEventListener('dispose',()=>disposed++);disposeFortRibbons(a);assert.equal(disposed,2);disposeFortRibbons(a);assert.equal(disposed,2);disposeFortRibbons(b);
});
