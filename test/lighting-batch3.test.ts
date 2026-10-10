import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {checksum,encodeGraph} from '../src/persistence/graph-codec';
import {AcidGroundEffects,acidZoneKey,acidZonePhase,acidZoneExpiry} from '../src/render/effects/acid-ground-effects';
import {ShadowViewContext} from '../src/render/scene/scene-shadows';
import {MapVisibility} from '../src/render/terrain/map-visibility';
import {bindSourceDepth,sourceDepthMaterial,PosedDepthRegistry,physicalSurface} from '../src/render/materials/posed-depth';
import {compileUnitPose} from '../src/render/units/unit-pose-shader';
import {bindAmbientContact,contactKernel,SceneContact} from '../src/render/scene/scene-contact';
import type {BattleEffects} from '../src/render/effects/battle-effects';

const make=()=>{const w=new World({sandbox:true,terrain:false,obstacles:[],waves:false,seed:421});w.start();return w;};
const state=(w:World)=>checksum(JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})));
function acidRenderer(scene=new THREE.Scene()){
 const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 const batches=new Map(['fx.bile.4','fx.acid.0'].map(id=>[id,{mesh:{material:new THREE.ShaderMaterial({uniforms:{map:{value:texture},grid:{value:new THREE.Vector2(1,1)}}})}}]));
 const effect=new AcidGroundEffects(scene,{batches} as unknown as BattleEffects);effect.prepare();return {effect,scene,texture};
}
test('native acid keeps four damage ticks after source death and exact mid-zone restore; drawing never changes World/Profile/RNG',()=>{
 const w=make(),boss=w.spawnSpecial('corruptor','boss',{x:0,z:0})!,ally=w.allies()[0];w.paused=true;
 boss.specialReady=0;boss.specialDamageMultiplier=1;ally.x=0;ally.z=5;ally.hp=ally.maxHp=5000;ally.armor=0;w.hash.rebuild(w.entities.values());
 w.enemySpecials.act(boss,1/60);w.time=1.5;w.enemySpecials.update(1/60);assert.equal(ally.hp,4910);
 const {effect}=acidRenderer(),zone=w.enemySpecials.acidZones[0],key=acidZoneKey(zone),phase=acidZonePhase(key);assert.equal(acidZoneExpiry(zone),5.5);
 const draw=(world:World)=>{const before=state(world);effect.render(world,()=>true);assert.equal(state(world),before);return effect.report();};
 assert.equal(draw(w).zones[0].key,key);w.hit(boss,1e9,[],1,'terran');assert.equal(boss.hp,0);
 const losses=[];let current=w;
 for(let i=1;i<=4;i++){
  current.time=1.5+i;current.enemySpecials.update(1/60);losses.push(current.entities.get(ally.id)!.hp);const report=draw(current);
  if(i<4){assert.equal(report.zones[0].key,key);assert.equal(acidZonePhase(report.zones[0].key),phase);}
  else assert.equal(report.zones.length,0);
  if(i===2){const copied=new World({sandbox:true,terrain:false,obstacles:[],waves:false,seed:421,permanentProfile:PermanentProfile.parseJSON(current.permanentProfile.exportJSON())!});copied.restoreRun(structuredClone(current.captureRun()));assert.deepEqual(copied.captureRun(),current.captureRun());assert.equal(copied.permanentProfile.exportJSON(),current.permanentProfile.exportJSON());current=copied;assert.equal(draw(current).zones[0].key,key);}
 }
 assert.deepEqual(losses,[4895,4880,4865,4850]);assert.equal(current.enemySpecials.acidZones.length,0);
});
test('acid uses source samplers and actual height at every vertex, retaining no invisible or expired patch',()=>{
 const w=make(),{scene,effect,texture}=acidRenderer();w.terrain={height:({x,z}:{x:number;z:number})=>.2*x+.07*z} as never;
 w.enemySpecials.acidZones=[{source:1,point:{x:7,z:3},radius:3,damage:15,nextTick:2,ticks:4}];effect.render(w,()=>true);
 const root=scene.getObjectByName('native-acid-ground')!;assert.equal(root.children.length,2);
 for(const node of root.children){const mesh=node as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;assert.equal(mesh.material.uniforms.map.value,texture);const positions=mesh.geometry.getAttribute('position');for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getY(i)+root.position.y-(.2*(positions.getX(i)+7)+.07*(positions.getZ(i)+3)+.035))<1e-6);}
 effect.render(w,()=>false);assert.equal(root.visible,false);w.enemySpecials.acidZones=[];effect.render(w,()=>true);assert.equal(scene.getObjectByName('native-acid-ground'),undefined);
});
function camera(){const c=new THREE.OrthographicCamera(-16,16,10,-10,.1,180);c.position.set(0,34,26);c.lookAt(0,0,0);c.updateProjectionMatrix();c.updateMatrixWorld();return c;}
test('texel-snapped shadow volume contains viewport receivers and sunward off-screen casters',()=>{
 const c=camera(),light=new THREE.DirectionalLight(),view=new ShadowViewContext(),sun=new THREE.Vector3(-15,25,10).normalize();view.fit(c,light,undefined);
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse));let outside=0;
 for(const x of [-1,1])for(const y of [-1,1]){const point=new THREE.Vector3(x,y,-1).unproject(c),ray=new THREE.Vector3(x,y,1).unproject(c).sub(point);point.addScaledVector(ray,-point.y/ray.y);assert.ok(view.intersects(new THREE.Sphere(point,.01)));const caster=point.clone().addScaledVector(sun,25/sun.y);assert.ok(view.intersects(new THREE.Sphere(caster,.01)));if(!frustum.containsPoint(caster))outside++;}
 assert.ok(outside>0);for(const [center,texel]of [[view.bounds.centerX,view.bounds.texelX],[view.bounds.centerY,view.bounds.texelY]])assert.ok(Math.abs(center/texel-Math.round(center/texel))<1e-8);
 const old={...view.bounds};c.position.x+=.001;c.updateMatrixWorld();view.fit(c,light,undefined);assert.ok(view.bounds.centerX===old.centerX);assert.ok(view.bounds.centerY===old.centerY);
 const visibility=new MapVisibility();visibility.update(c,view);const changed=view.revision;c.position.x+=.2;c.updateMatrixWorld();view.fit(c,light,undefined);assert.ok(view.revision>changed);assert.equal(visibility.update(c,view),true);
});
test('depth surfaces keep actual GPU pose uniforms and select physical versus energy material groups',()=>{
 const body=new THREE.MeshStandardMaterial({alphaTest:.3}),energy=new THREE.MeshBasicMaterial({transparent:true});
 const pose={atlas:new THREE.DataTexture(),bind:new THREE.Matrix4(),asset:new THREE.Matrix4(),pivot:new THREE.Vector3(1,2,3),accent:new THREE.Vector2()};
 bindSourceDepth(body,{key:()=> 'native-pose',compile:shader=>compileUnitPose(shader,pose)});
 const color={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader} as any,depth={uniforms:{},vertexShader:THREE.ShaderLib.depth.vertexShader,fragmentShader:THREE.ShaderLib.depth.fragmentShader} as any;
 compileUnitPose(color,pose);sourceDepthMaterial(body).onBeforeCompile(depth,{} as never);
 for(const key of ['unitBoneAtlas','unitBind','unitAsset','turretPivot','unitAccentRange'])assert.equal(depth.uniforms[key].value,color.uniforms[key].value);
 assert.ok(depth.vertexShader.includes('unitAsset*a*unitBind'));assert.ok(depth.vertexShader.includes('unitBlend.w*unitUpper'));assert.ok(depth.vertexShader.includes('aimTurret(transformed-turretPivot)'));
 const geometry=new THREE.BoxGeometry(),mesh=new THREE.Mesh(geometry,[body,energy]),registry=new PosedDepthRegistry(),scene=new THREE.Scene();scene.add(mesh);registry.configure(scene);assert.equal(mesh.castShadow,true);
 const materials=registry.depthFor(mesh) as THREE.Material[];assert.deepEqual(materials.map(m=>m.visible),[true,false]);assert.equal((materials[0] as THREE.MeshDepthMaterial).alphaTest,.3);
 const shadow=mesh.customDepthMaterial!;mesh.onBeforeShadow({} as never,mesh,camera(),camera(),geometry,shadow,{materialIndex:1} as never);assert.match(shadow.customProgramCacheKey(),/excluded/);mesh.onBeforeShadow({} as never,mesh,camera(),camera(),geometry,shadow,{materialIndex:0} as never);assert.match(shadow.customProgramCacheKey(),/native-pose/);assert.equal(shadow.side,THREE.BackSide);
});
test('contact composition touches only ambient diffuse and has twelve fixed hemisphere samples',()=>{
 const kernel=contactKernel();assert.equal(kernel.length,12);assert.ok(kernel.every(v=>v.z>0&&v.length()<=1));assert.deepEqual(kernel,contactKernel());
 const material=new THREE.MeshStandardMaterial();bindAmbientContact(material,{} as never);const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader} as any;material.onBeforeCompile(shader,{} as never);
 assert.equal((shader.fragmentShader.match(/reflectedLight\.indirectDiffuse\*=sceneAmbientContact\(\)/g)??[]).length,1);assert.ok(!/totalEmissiveRadiance\s*\*=/.test(shader.fragmentShader));assert.ok(!/reflectedLight\.(directDiffuse|directSpecular|indirectSpecular)\s*\*=sceneAmbientContact/.test(shader.fragmentShader));
});
test('cached template callbacks cloned into carrier views inject contact once and use the current target',()=>{
 let originalCalls=0;const source=new THREE.MeshStandardMaterial();source.onBeforeCompile=shader=>{originalCalls++;shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nfloat sourceAlphaHook(){return 1.;}');};source.customProgramCacheKey=()=> 'source-alpha';
 const first={sceneContactMap:{value:new THREE.Texture()}},current={sceneContactMap:{value:new THREE.Texture()}};
 bindAmbientContact(source,first as never);
 // PodView preserves authored material callbacks when cloning a prewarmed template.
 const clone=source.clone();clone.onBeforeCompile=source.onBeforeCompile;clone.customProgramCacheKey=source.customProgramCacheKey;bindAmbientContact(clone,current as never);bindAmbientContact(clone,current as never);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader} as any;clone.onBeforeCompile(shader,{} as never);
 assert.equal(originalCalls,1);assert.equal(shader.uniforms.sceneContactMap,current.sceneContactMap);
 for(const declaration of ['uniform sampler2D sceneContactMap;','float sceneAmbientContact(){','reflectedLight.indirectDiffuse*=sceneAmbientContact();','float sourceAlphaHook(){'])assert.equal(shader.fragmentShader.split(declaration).length-1,1,declaration);
 assert.equal(clone.customProgramCacheKey(),'source-alpha:ambient-contact-v1');
});
test('the opaque original Yamato unlit body casts depth while its own colour and HUD basic materials remain unshaded',()=>{
 const body=new THREE.MeshBasicMaterial(),hud=new THREE.MeshBasicMaterial(),effect=new THREE.MeshBasicMaterial({transparent:true});body.userData.sc2={role:'body',blend:0};effect.userData.sc2={role:'effect',blend:2};
 assert.equal(physicalSurface(body),true);assert.equal(physicalSurface(hud),false);assert.equal(physicalSurface(effect),false);
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),body));const before=body.onBeforeCompile,registry=new PosedDepthRegistry(),contact=new SceneContact({} as never,registry);registry.configure(scene);contact.prepare(scene);assert.equal(body.onBeforeCompile,before);assert.equal(scene.children[0].castShadow,true);
});
test('cloned fort meshes reuse source-bound contact and shadow materials and dispose with the source',()=>{
 const source=new THREE.MeshStandardMaterial(),registry=new PosedDepthRegistry(),a=new THREE.Mesh(new THREE.BoxGeometry(),source),b=a.clone();const one=registry.prepare(a),two=registry.prepare(b);assert.equal(one.depth[0],two.depth[0]);assert.equal(one.shadow,two.shadow);assert.notEqual(one.depth[0],one.shadow);source.opacity=.2;registry.prepare(a);assert.equal(one.shadow.opacity,.2);assert.equal(one.depth[0].opacity,.2);let released=0;one.depth[0].addEventListener('dispose',()=>released++);one.shadow.addEventListener('dispose',()=>released++);source.dispose();assert.equal(released,2);
});
test('failed contact prepass restores scene, materials, visibility, shadow state and render target',()=>{
 const scene=new THREE.Scene(),camera_=camera(),body=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),fx=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial()),parent=new THREE.Group();parent.visible=false;parent.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));scene.add(body,fx,parent);
 const before=body.material,target={id:'previous'},background=new THREE.Color('#123456');scene.background=background;let current:any=target;let clear=new THREE.Color('#abcdef'),alpha=.4;
 const renderer={getContext:()=>({isContextLost:()=>false}),getRenderTarget:()=>current,shadowMap:{autoUpdate:true,needsUpdate:true},getClearColor:(out:THREE.Color)=>out.copy(clear),getClearAlpha:()=>alpha,setClearColor:(c:THREE.ColorRepresentation,a:number)=>{clear=new THREE.Color(c);alpha=a;},setRenderTarget:(t:unknown)=>{current=t;},clear:()=>{},render:()=>{assert.equal(fx.visible,false);throw Error('test depth failure');}} as unknown as THREE.WebGLRenderer;
 const effect=new SceneContact(renderer,new PosedDepthRegistry());effect.render(scene,camera_,100,80);assert.equal(body.material,before);assert.equal(fx.visible,true);assert.equal(parent.visible,false);assert.equal(scene.background,background);assert.equal(current,target);assert.deepEqual(renderer.shadowMap,{autoUpdate:true,needsUpdate:true});assert.equal(clear.getHex(),0xabcdef);assert.equal(alpha,.4);assert.equal(effect.report().ready,false);assert.match(effect.report().fallback!,/test depth failure/);assert.equal(effect.report().occluders,1);
});
