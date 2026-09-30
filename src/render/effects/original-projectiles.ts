import type {World} from '../../simulation/world';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {restoreSc2Materials,sc2BodyBounds} from '../loaders/sc2-materials';
import {commitInstances} from '../units/instance-updates';
import type {Point,VisualEvent} from '../../simulation/types';
const transform=new THREE.Object3D();
/** Original weapon meshes; drawn at the authoritative projectile location, never a second hit. */
export class OriginalProjectiles {
 batches=new Map<string,THREE.InstancedMesh[]>();errors:string[]=[];
 constructor(private scene:THREE.Scene){}
 async load(){for(const type of ['marauder','hydralisk'])try{const url=assetUrl('model.projectile.'+type);if(!url)throw Error('missing original projectile');const g=await restoreSc2Materials(await new GLTFLoader().loadAsync(url));g.scene.updateMatrixWorld(true);const box=sc2BodyBounds(g.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=.65/Math.max(size.x,size.y,size.z),meshes:THREE.InstancedMesh[]=[];
   g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;const geometry=n.geometry.clone();geometry.applyMatrix4(n.matrixWorld);geometry.translate(-center.x,-center.y,-center.z);geometry.scale(scale,scale,scale);const mesh=new THREE.InstancedMesh(geometry,n.material,256);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);meshes.push(mesh);});this.batches.set(type,meshes);
  }catch(e){this.errors.push(type+': '+String(e));}}
 renderFlights(w:World,visible:(p:Point)=>boolean,mounts:ReadonlyMap<string,{x:number;y:number;z:number}>){
  const counts=new Map<string,number>();for(const p of w.weaponFlights){const type=p.source.unitType;if(p.source.heroId||!this.batches.has(type)||!visible(p.point))continue;
   const n=counts.get(type)??0;if(n>=256)continue;const total=Math.max(.01,Math.hypot(p.lastSeen.x-p.from.x,p.lastSeen.z-p.from.z)),travel=Math.hypot(p.point.x-p.from.x,p.point.z-p.from.z),t=Math.min(1,travel/total),target=p.lost?undefined:w.body(p.target);
   const fromY=p.source.flying?6.2:(w.terrain?.height(p.from)??0)+.8,toY=target?.flying?6.2:(w.terrain?.height(p.point)??0)+.6;
   const mount=mounts.get(p.attackId),blend=Math.max(0,1-travel/2);
   transform.position.set(p.point.x+(mount?mount.x-p.from.x:0)*blend,fromY+(toY-fromY)*t+(mount?mount.y-fromY:0)*blend,p.point.z+(mount?mount.z-p.from.z:0)*blend);transform.rotation.set(0,Math.atan2(p.lastSeen.x-p.point.x,p.lastSeen.z-p.point.z),0);transform.updateMatrix();for(const m of this.batches.get(type)!)m.setMatrixAt(n,transform.matrix);counts.set(type,n+1);
  }for(const [key,list] of this.batches)for(const m of list)commitInstances(m,counts.get(key)??0);
 }

}
