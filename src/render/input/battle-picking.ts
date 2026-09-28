import * as THREE from 'three';
import type {World} from '../../simulation/world';
import type {Body,Point} from '../../simulation/types';

/** Movement intent ignores cliff walls and actors. Ability picking remains separate. */
export function pickMovement(clientX:number,clientY:number,canvas:HTMLCanvasElement,camera:THREE.Camera,scene:THREE.Scene,world:World):{point:Point}|null {
 const rect=canvas.getBoundingClientRect();if(clientX<rect.left||clientY<rect.top||clientX>rect.right||clientY>rect.bottom)return null;
 const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2),camera);
 const floors:THREE.Object3D[]=[];scene.traverseVisible(o=>{if(o.name==='char-traversable-ground')floors.push(o);});
 const hit=ray.intersectObjects(floors,true)[0]?.point??ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
 if(!hit)return null;const point={x:hit.x,z:hit.z};
 return Math.abs(point.x)<world.mapHalf&&Math.abs(point.z)<world.mapHalf&&(!world.terrain?.isOpen||world.terrain.isOpen(point))?{point}:null;
}

/** Selection volumes follow simulation bodies; GPU-instanced animation is never game state. */
export function pickBattle(clientX:number,clientY:number,touch:boolean,canvas:HTMLCanvasElement,camera:THREE.Camera,scene:THREE.Scene,world:World):{point:Point;targetId?:number}|null {
 const rect=canvas.getBoundingClientRect();if(clientX<rect.left||clientY<rect.top||clientX>rect.right||clientY>rect.bottom)return null;
 const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2),camera);
 const terrain:THREE.Object3D[]=[];scene.traverseVisible(object=>{if(object.name==='char-traversable-ground'||object.name==='char-solid-cliff-faces')terrain.push(object);});
 const hit=ray.intersectObjects(terrain,true)[0];if(!hit)return null;
 const unitsPerPixel=camera instanceof THREE.OrthographicCamera?(camera.top-camera.bottom)/rect.height:.04;
 const margin=unitsPerPixel*(touch?12:3),v=new THREE.Vector3(),box=new THREE.Box3();let best:Body|undefined,depth=Infinity;
 const candidates:Body[]=[...world.entities.values(),...[...world.economicTargets.values()].filter(e=>e.status==='active')];if(world.hive)candidates.push(world.hive);
 for(const b of candidates){if(b.owner!=='zerg'||!world.visibleTo(b,'terran')||b.hp<=0||Math.abs(b.x)>world.mapHalf||Math.abs(b.z)>world.mapHalf)continue;
  const y=b.flying?5.6:world.terrain?.height(b)??0,height=b===world.hive?4:'kind' in b?1.2:1.3,r=b.unitRadius+margin;
  box.min.set(b.x-r,y,b.z-r);box.max.set(b.x+r,y+height+margin,b.z+r);
  if(!ray.ray.intersectBox(box,v))continue;const d=ray.ray.origin.distanceTo(v);
  if(d<=hit.distance+.08&&d<depth){best=b;depth=d;}
 }
 if(best)return {point:{x:best.x,z:best.z},targetId:best.id};
 // A vertical cliff face is not a walkable floor. Do not click through it.
 return hit.object.name==='char-solid-cliff-faces'?null:{point:{x:hit.point.x,z:hit.point.z}};
}
