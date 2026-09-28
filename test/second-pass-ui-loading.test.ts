import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {racePreloadModels} from '../src/app/race-preload';
import {RACES,FAMILIES_BY_RACE} from '../src/data/races';
import {HEROES} from '../src/data/heroes';
import {ELITES} from '../src/data/elites';
import {DetectionHint} from '../src/ui/hud/detection-hint';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
import * as THREE from 'three';
import {pickMovement,pickBattle} from '../src/render/input/battle-picking';

for(const race of RACES)test(`second pass complete ${race} preload without foreign player identities`,()=>{
 const models=racePreloadModels(race);
 for(const f of [...FAMILIES_BY_RACE[race],...FAMILIES_BY_RACE.zerg])assert.ok(models.has(f),f);
 for(const e of Object.values(ELITES))assert.equal(models.has(e.model),(FAMILIES_BY_RACE[race] as readonly string[]).includes(e.family),e.model);
 for(const h of Object.values(HEROES))assert.equal(models.has(h.model),h.race===race,h.model);
});
test('second pass nearby cloak hint hides identities, expires under scan and leaves target rules intact',()=>{
 const w=new World({terrain:false,sandbox:true,waves:false});w.start();const hint=new DetectionHint(),e=w.addUnit('lurker','zerg',2,0);e.cloaked=true;
 assert.equal(hint.update(w),true);assert.equal(w.visibleTo(e,'terran'),false);
 w.castDetection();w.time+=.21;assert.equal(hint.update(w),false);
 w.time+=9;assert.equal(hint.update(w),true);e.x=30;w.time+=.21;assert.equal(hint.update(w),false);
});
test('second pass movement stores requested point instead of the blocked-ground substitute',()=>{
 const w=new World({terrain:false,sandbox:true,waves:false,obstacles:[{x:5,z:0,w:2,h:2}]});w.start();
 assert.ok(w.issueMove({x:5,z:0}));assert.deepEqual(w.order!.point,{x:5,z:0});
 const air=w.addUnit('banshee','terran',0,0),goal=w.moveGoal(air);assert.ok(Math.hypot(goal.x-5,goal.z)<2);assert.ok(goal.x>4);
 w.input={x:1,z:0};w.step();assert.equal(w.order,null);
});

test('second pass move picking passes cliff faces while ability picking still rejects them',()=>{
 const w=new World({terrain:false,waves:false,sandbox:true});w.start();
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);
 camera.position.set(0,20,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.name='char-traversable-ground';scene.add(floor);
 const cliff=new THREE.Mesh(new THREE.BoxGeometry(4,10,2),new THREE.MeshBasicMaterial());cliff.position.set(0,5,6);cliff.name='char-solid-cliff-faces';scene.add(cliff);scene.updateMatrixWorld(true);
 const canvas={getBoundingClientRect:()=>({left:0,top:0,right:100,bottom:100,width:100,height:100})} as HTMLCanvasElement;
 const moved=pickMovement(50,50,canvas,camera,scene,w);assert.ok(moved);assert.ok(Math.hypot(moved.point.x,moved.point.z)<1e-8);
 assert.equal(pickBattle(50,50,false,canvas,camera,scene,w),null,'skill picking must not acquire through a cliff face');
 scene.remove(floor);assert.ok(pickMovement(50,50,canvas,camera,scene,w),'empty terrain ray uses the horizontal map projection');
 w.terrain={isOpen:()=>false} as any;assert.equal(pickMovement(50,50,canvas,camera,scene,w),null,'unopened territory stays closed');
});
test('second pass readiness emits one completion token and failures cannot auto-continue',async()=>{
 const w=new World({terrain:false,waves:false,sandbox:true});w.start();let fail=false,completed=0;
 const view:any={initialAssetsLoaded:true,modelErrors:[],prepareCurrentAssets:async()=>{if(fail)throw Error('missing');},waitForPendingAssets:async()=>{},renderer:{compileAsync:async()=>{}},warmPresentationBatches:async()=>false};
 const gate=new AssetReadinessCoordinator(w,view);gate.onReady=(kind,token)=>{assert.equal(kind,'reinforcement');assert.equal(token,gate.readyToken);completed++;gate.cancel();};
 assert.ok(await gate.prepare('reinforcement'));assert.equal(completed,1);assert.equal(gate.readyToken,null);
 fail=true;assert.equal(await gate.prepare('reinforcement'),false);assert.equal(completed,1);
 fail=false;assert.ok(await gate.retry());assert.equal(completed,2);
});
