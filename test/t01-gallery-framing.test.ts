import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,PerspectiveCamera,Vector3} from 'three';
import {fitGalleryCamera,boxCorners} from '../tools/t01/gallery-framing';
import {buildGallery} from '../tools/t01/gallery';
import {DYNAMIC_CASES} from '../tools/t01/catalogue';
import {galleryDisposition,galleryReferences} from '../tools/t01/gallery-scope';
import {modelPresentationScale} from '../src/data/combat-presentation';
import {World} from '../src/simulation/world';
import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';

for(const aspect of [.5,1,2.4])test(`gallery fits a wide airborne ship and low target in off-axis viewport ${aspect}`,()=>{
 const camera=new PerspectiveCamera(35,aspect,.1,180),box=new Box3(new Vector3(-14,0,-5),new Vector3(14,11,14)),focus=box.getCenter(new Vector3());
 camera.position.copy(focus).add(new Vector3(0,12,10));camera.lookAt(focus);camera.updateMatrixWorld();camera.projectionMatrix.elements[8]=.12;camera.projectionMatrix.elements[9]=-.18;
 fitGalleryCamera(camera,box,focus);
 for(const p of boxCorners(box)){p.project(camera);assert.ok(Math.abs(p.x)<=.880001&&Math.abs(p.y)<=.880001&&Math.abs(p.z)<1,JSON.stringify(p));}
});
test('fresh and legacy restored interceptors share source scale without modifying saved combat state',()=>{
 const w=new World({race:'protoss',waves:false,sandbox:true,terrain:false,seed:529});w.start();const carrier=w.addUnit('carrier','terran',0,0);initializeCarrierSubsystem(w);
 const child=ownedInterceptors(w,carrier.id)[0];assert.equal(child.visualScale,1);assert.equal(modelPresentationScale(child),1);
 child.visualScale=.2;child.hp=17;const saved=w.captureRun(),copy=new World({race:'protoss',waves:false,sandbox:true,terrain:false,seed:529});copy.restoreRun(saved);const restored=copy.entities.get(child.id)!;
 const before=structuredClone(restored);assert.equal(modelPresentationScale(restored),1);assert.deepEqual(restored,before);assert.equal(restored.hp,17);assert.equal(restored.unitRadius,child.unitRadius);
});
test('gallery keeps every unit and real state branch, filters numeric cards and retains effectful equipment',()=>{
 const objects=buildGallery(DYNAMIC_CASES);assert.equal(objects.filter(o=>o.unit).length,165);
 assert.ok(objects.flatMap(o=>o.actions).some(a=>a.id==='stim'));
 assert.ok(objects.some(o=>o.id==='actor:hero.purifier_flagship'));
 for(const support of ['terran.strategic','terran.bunker','zerg.parasite','protoss.reserve','protoss.prism'])assert.ok(objects.some(o=>o.id==='card:'+support.split('.')[0]+':support.'+support),support);
 assert.ok(!objects.some(o=>o.actions.some(a=>a.cases.some(c=>['card','development','map'].includes(c.runner)))));
 assert.ok(galleryReferences(DYNAMIC_CASES).some(r=>r.name.includes('恢复增效')),'reference search preserves the effect name as well as the family');
 for(const c of DYNAMIC_CASES.filter(c=>c.runner==='equipment')){
  const keys=(c.data as {effects:{key:string}[]}).effects.map(e=>e.key);
  if(keys.some(k=>['bombardment','phantom','auto_recall','rewind','sustain_heal','stage_bunker','periodic_trap','split','overload','hero_growth','kill_training','pack_kill'].includes(k)))assert.equal(galleryDisposition(c).kind,'dynamic',c.id);
 }
});
