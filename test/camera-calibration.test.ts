import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3,Raycaster,Plane,DirectionalLight,Sphere,Frustum,Matrix4} from 'three';
import {CameraController,CAMERA_PREFERENCE_KEY,CAMERA_DESKTOP_SPAN,wheelZoomDelta} from '../src/render/scene/camera-controller';
import {CanvasPinch} from '../src/ui/mobile/canvas-pinch';
import {World} from '../src/simulation/world';
import {checksum,encodeGraph} from '../src/persistence/graph-codec';
import {ShadowViewContext} from '../src/render/scene/scene-shadows';
import {MapVisibility} from '../src/render/terrain/map-visibility';
import {captureBattleView} from '../src/render/input/battle-view';
import {pointInBattleView} from '../src/simulation/combat/battle-view';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {worldUnitsPerPixel} from '../src/render/input/pixel-scale';

const zero={left:0,right:0,top:0,bottom:0},origin={x:0,y:0,z:0};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const make=()=>{const camera=new PerspectiveCamera(),data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}},c=new CameraController(camera,storage);return {c,camera,storage,data};};
test('perspective pixel tolerances match actual projected displacement at near, far and flying bodies',()=>{const {c,camera}=make();c.resize(1728,1080,false,zero);for(const zoom of [.6,1,1.8]){c.setZoom(zoom);c.update(origin,.12,true);for(const [y,z]of [[0,-10],[0,8],[5.6,0]]){const point=new Vector3(0,y,z),scale=worldUnitsPerPixel(camera,point,1080),a=point.clone().project(camera),b=point.clone().add(new Vector3(scale*5,0,0)).project(camera);close((b.x-a.x)*1728/2,5);}}c.setZoom(1);c.update(origin,.12,true);close(c.report().distance,34);close(camera.fov,27.8);assert.ok(worldUnitsPerPixel(camera,{x:0,y:0,z:-10},1080)>worldUnitsPerPixel(camera,{x:0,y:0,z:8},1080));});
for(const [width,height,mode,span,ax,ay] of [[1440,900,'pc',CAMERA_DESKTOP_SPAN,.5,.45],[1920,1080,'pc',CAMERA_DESKTOP_SPAN,.5,.45],[844,390,'landscape',16,.5,.42],[390,844,'portrait',12,.44,.44],[320,568,'portrait',12,.44,.44],[2560,1080,'pc',CAMERA_DESKTOP_SPAN,.5,.45]] as const){
 test(`camera ${width}x${height} preserves anchor, pitch, pickup rays and exact 60/100/180 scale`,()=>{
  const {c,camera}=make();c.resize(width,height,false,zero);
  for(const zoom of [.6,1,1.8]){c.setZoom(zoom);c.update(origin,1,true);assert.equal(c.report().mode,mode);const bounds=c.report().bounds;close(mode==='portrait'?bounds.right-bounds.left:bounds.top-bounds.bottom,span/zoom);
   const p=new Vector3().project(camera);close((p.x+1)/2,ax);close((1-p.y)/2,ay);close(Math.atan2(camera.position.y,camera.position.z)*180/Math.PI,50);close(Math.atan2(camera.position.z,camera.position.y)*180/Math.PI,40);close(c.report().tiltFromVerticalDegrees,40);assert.equal(camera.zoom,1);
   const ray=new Raycaster();ray.setFromCamera({x:p.x,y:p.y} as never,camera);const hit=ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),0),new Vector3())!;close(hit.x,0);close(hit.z,0);
  }
 });
}
test('safe area moves only projection and retains the requested safe span',()=>{const {c,camera}=make();c.resize(390,844,false,{left:12,right:20,top:40,bottom:30});c.update(origin,1,true);const p=new Vector3().project(camera);close((p.x+1)*390/2,12+(390-32)*.44);close((1-p.y)*844/2,40+(844-70)*.44);close((c.report().bounds.right-c.report().bounds.left)*(390-32)/390,12);assert.deepEqual(c.target.toArray(),[0,0,0]);});
test('orientation preferences survive recreation; updates finish in 250ms and reduced motion is immediate',()=>{const {c,camera,storage}=make();c.resize(1440,900,false,zero);c.setZoom(1.6);c.update(origin,.125,false);assert.ok(c.report().effectiveZoom>1&&c.report().effectiveZoom<1.6);c.update(origin,.125,false);close(c.report().effectiveZoom,1.6);c.resize(390,844,true,zero);close(c.zoom,1);c.setZoom(.6);c.update(origin,0,true);close(c.report().effectiveZoom,.6);c.resize(844,390,true,zero);close(c.report().effectiveZoom,1.6);const restored=new CameraController(camera,storage);restored.resize(390,844,true,zero);close(restored.zoom,.6);restored.resetZoom();close(restored.zoom,1);});
test('invalid persistence and unavailable storage do not prevent zoom',()=>{for(const storage of [{getItem:()=>'{broken',setItem:()=>{throw Error('quota');}},{getItem:()=>JSON.stringify({landscape:99,portrait:'bad'}),setItem:()=>{throw Error('blocked');}}]){const c=new CameraController(new PerspectiveCamera(),storage);c.setZoom(1.3);close(c.zoom,1.3);c.setZoom(NaN);close(c.zoom,1.3);c.adjustZoom(-99);close(c.zoom,.6);}});
test('wheel units normalize without platform-specific direction changes',()=>{close(wheelZoomDelta(-100,0,900),.1);close(wheelZoomDelta(-6.25,1,900),.1);close(wheelZoomDelta(-1,2,100),.1);close(wheelZoomDelta(NaN,0,900),0);});
test('pinch quarantines remaining fingers and third fingers until all lift',()=>{let zoom=1;const g=new CanvasPinch(()=>zoom,v=>{zoom=v;});assert.equal(g.down(1,0,0),false);assert.equal(g.down(2,100,0),true);g.move(2,150,0);close(zoom,1.5);assert.equal(g.up(2),true);g.move(1,50,0);close(zoom,1.5);assert.equal(g.up(1),true);assert.equal(g.active,false);g.down(3,0,0);g.down(4,100,0);g.down(5,200,0);g.up(5);g.move(4,300,0);close(zoom,1.5);g.up(3);g.up(4);assert.equal(g.active,false);});
test('cancellation freezes gesture and disallows the remaining finger as a new tap',()=>{let zoom=1;const g=new CanvasPinch(()=>zoom,v=>{zoom=v;});g.down(1,0,0);g.cancel();g.down(2,100,0);g.move(2,150,0);close(zoom,1);assert.equal(g.up(1),true);assert.equal(g.up(2),true);assert.equal(g.down(3,0,0),false);});
test('actual frustum includes zoomed-out edge bodies and excludes distant prisms',()=>{const {c,camera}=make();c.resize(2560,1080,false,zero);c.setZoom(.6);c.update(origin,1,true);const ray=new Raycaster();ray.setFromCamera({x:.95,y:0} as never,camera);const edge=ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),0),new Vector3())!;assert.ok(edge.x>20);assert.equal(c.visible({x:edge.x,z:edge.z},0,1,3),true);assert.equal(c.visible({x:1000,z:1000},0),false);});
test('camera follow, projection and preference writes leave complete native run/profile/RNG unchanged',()=>{const world=new World({sandbox:true,terrain:false,obstacles:[],waves:false,seed:731});world.start();const state=()=>checksum(JSON.stringify(encodeGraph({run:world.captureRun(),profile:world.permanentProfile.exportJSON()}))),before=state(),{c}=make();for(const zoom of [.6,1,1.8])for(const [w,h] of [[1440,900],[844,390],[390,844]]){c.resize(w,h,false,zero);c.setZoom(zoom);c.update({x:world.anchor.x,y:0,z:world.anchor.z},.12,false);}assert.equal(state(),before);});
test('all calibrated viewport endpoints retain ground receivers and sunward offscreen casters at unchanged shadow resolution',()=>{
 const {c,camera}=make(),light=new DirectionalLight(),shadow=new ShadowViewContext(),terrain=new MapVisibility(),sun=new Vector3(-15,25,10).normalize();let outside=0;
 for(const [w,h]of [[1440,900],[1920,1080],[844,390],[390,844],[320,568],[2560,1080]])for(const zoom of [.6,1,1.8]){c.resize(w,h,false,zero);c.setZoom(zoom);c.update(origin,.12,true);shadow.fit(camera,light,undefined);assert.equal(terrain.update(camera,shadow),true);const view=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));for(const x of [-1,1])for(const y of [-1,1]){const a=new Vector3(x,y,-1).unproject(camera),d=new Vector3(x,y,1).unproject(camera).sub(a);a.addScaledVector(d,-a.y/d.y);assert.ok(shadow.intersects(new Sphere(a,.01)));const caster=a.clone().addScaledVector(sun,25/sun.y);assert.ok(shadow.intersects(new Sphere(caster,.01)));assert.ok(terrain.intersects(new Sphere(caster,.01)));if(!view.containsPoint(caster))outside++;}}
 assert.ok(outside>=18);
});
test('Tosh uses the calibrated screen and HUD projection, while saved recipients remain frozen through zoom changes',()=>{
 const keys=['innerWidth','innerHeight','document','getComputedStyle'],previous=keys.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));
 const width=1440,height=900,hud={left:1100,right:1440,top:600,bottom:900},canvas={getBoundingClientRect:()=>({left:0,top:0,right:width,bottom:height,width,height})} as HTMLCanvasElement;
 Object.defineProperties(globalThis,{innerWidth:{configurable:true,value:width},innerHeight:{configurable:true,value:height},document:{configurable:true,value:{body:{classList:{contains:()=>true}},querySelectorAll:()=>[{getBoundingClientRect:()=>hud}]}},getComputedStyle:{configurable:true,value:()=>({display:'block',visibility:'visible'})}});
 try{
  const {c,camera}=make();c.resize(width,height,false,zero);c.setZoom(.6);c.update(origin,.12,true);const broad=captureBattleView(canvas,camera)!;
  const ground=(x:number,y:number)=>{const ray=new Raycaster();ray.setFromCamera({x:x/width*2-1,y:1-y/height*2} as never,camera);return ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),0),new Vector3())!;};
  const far=ground(120,400),blocked=ground(1250,720),w=new World({race:'terran',sandbox:true,terrain:false,obstacles:[],waves:false,seed:819});w.start();w.entities.clear();w.heroes.clear();assert.ok(w.acquireHero('tosh'));const hero=w.heroEntity('tosh')!;hero.x=hero.z=0;
  const add=(x:number,z:number)=>{const e=w.addUnit('roach','zerg',x,z);e.hp=e.maxHp=100000;e.armor=0;return e;},core=add(0,1),edge=add(far.x,far.z),hidden=add(blocked.x,blocked.z);w.hash.rebuild(w.entities.values());
  assert.ok(pointInBattleView(broad,core));assert.ok(pointInBattleView(broad,edge));assert.equal(pointInBattleView(broad,hidden),false);assert.ok(pointInBattleView({...broad,occludedGround:[]},hidden));
  c.setZoom(1.6);c.update(origin,.12,true);const narrow=captureBattleView(canvas,camera)!;assert.ok(pointInBattleView(narrow,core));assert.equal(pointInBattleView(narrow,edge),false);
  assert.ok(w.castHero('tosh',broad));assert.deepEqual(w.heroCasts[0].frozenTargets!.map(t=>t.id),[core.id,edge.id]);w.paused=true;const saved=structuredClone(w.captureRun()),copy=new World({race:'terran',sandbox:true,terrain:false,obstacles:[],waves:false,seed:819});copy.restoreRun(saved);assert.deepEqual(copy.captureRun(),saved);
  c.setZoom(.9);c.update(origin,.12,true);assert.deepEqual(copy.heroCasts[0].battleView,broad);assert.deepEqual(copy.heroCasts[0].frozenTargets!.map(t=>t.id),[core.id,edge.id]);copy.paused=false;copy.time=.5;resolveExpeditionHeroCasts(copy);assert.ok(copy.entities.get(core.id)!.hp<100000);assert.ok(copy.entities.get(edge.id)!.hp<100000);assert.equal(copy.entities.get(hidden.id)!.hp,100000);
 }finally{keys.forEach((k,i)=>{const old=previous[i];if(old)Object.defineProperty(globalThis,k,old);else delete (globalThis as any)[k];});}
});
