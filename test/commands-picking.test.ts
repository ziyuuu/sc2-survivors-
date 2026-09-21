import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world.ts';
import {pickBattle} from '../src/render/input/battle-picking.ts';
function scene(){
 const world=new World({sandbox:true,waves:false,obstacles:[]});world.start();
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(0,20,20);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const scene=new THREE.Scene(),ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial());ground.rotation.x=-Math.PI/2;ground.name='char-traversable-ground';scene.add(ground);scene.updateMatrixWorld();
 const rect={left:17,top:31,right:817,bottom:631,width:800,height:600},canvas={getBoundingClientRect:()=>rect} as HTMLCanvasElement;
 const pick=(x:number,y:number,z:number,touch=false)=>{const v=new THREE.Vector3(x,y,z).project(camera);return pickBattle(rect.left+(v.x+1)*rect.width/2,rect.top+(1-v.y)*rect.height/2,touch,canvas,camera,scene,world);};
 return {world,camera,scene,canvas,pick};
}
test('battle picking accounts for canvas offsets and ignores friendlies and resolved economic bodies',()=>{const s=scene(),u=s.world.addUnit('roach','zerg',3,0);assert.equal(s.pick(3,.5,0)?.targetId,u.id);assert.equal(s.pick(0,.5,0)?.targetId,undefined);const egg=s.world.spawnEconomic('egg',{x:-3,z:0});assert.equal(s.pick(-3,.5,0)?.targetId,egg.id);egg.status='rescued';assert.equal(s.pick(-3,.5,0)?.targetId,undefined);assert.equal(pickBattle(0,0,false,s.canvas,s.camera,s.scene,s.world),null);});
test('touch expands hostile selection tolerance without changing the physical collision radius',()=>{const s=scene(),u=s.world.addUnit('zergling','zerg',3,0),r=u.unitRadius;assert.equal(s.pick(3+r+.22,.5,0,false)?.targetId,undefined);assert.equal(s.pick(3+r+.22,.5,0,true)?.targetId,u.id);assert.equal(u.unitRadius,r);});
test('a foreground cliff blocks enemy selection and is not treated as walkable ground',()=>{const s=scene();s.world.addUnit('roach','zerg',0,0);const wall=new THREE.Mesh(new THREE.BoxGeometry(4,5,1),new THREE.MeshBasicMaterial());wall.position.set(0,2.5,3);wall.name='char-solid-cliff-faces';s.scene.add(wall);s.scene.updateMatrixWorld();assert.equal(s.pick(0,.5,0),null);});
