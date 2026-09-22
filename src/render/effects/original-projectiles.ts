import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {restoreSc2Materials,sc2BodyBounds} from '../loaders/sc2-materials';
import {commitInstances} from '../units/instance-updates';
import type {Point,VisualEvent} from '../../simulation/types';
const transform=new THREE.Object3D();
/** Original weapon meshes; short travel is presentation only, never a second hit. */
export class OriginalProjectiles {
 batches=new Map<string,THREE.InstancedMesh[]>();active:{type:string;from:{x:number;y:number;z:number};to:{x:number;y:number;z:number};start:number;life:number}[]=[];errors:string[]=[];
 constructor(private scene:THREE.Scene){}
 async load(){for(const type of ['marauder','hydralisk'])try{const url=assetUrl('model.projectile.'+type);if(!url)throw Error('missing original projectile');const g=await restoreSc2Materials(await new GLTFLoader().loadAsync(url));g.scene.updateMatrixWorld(true);const box=sc2BodyBounds(g.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=.65/Math.max(size.x,size.y,size.z),meshes:THREE.InstancedMesh[]=[];
   g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;const geometry=n.geometry.clone();geometry.applyMatrix4(n.matrixWorld);geometry.translate(-center.x,-center.y,-center.z);geometry.scale(scale,scale,scale);const mesh=new THREE.InstancedMesh(geometry,n.material,256);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);meshes.push(mesh);});this.batches.set(type,meshes);
  }catch(e){this.errors.push(type+': '+String(e));}}
 emit(e:VisualEvent,mount:{x:number;y:number;z:number}|null){if(!e.unitType||!this.batches.has(e.unitType)||this.active.length>=256)return;this.active.push({type:e.unitType,from:mount??{x:e.x,y:e.y,z:e.z},to:{...e.end,y:e.endY},start:e.time,life:Math.max(.07,Math.min(.22,Math.hypot(e.end.x-e.x,e.end.z-e.z)/28))});}
 render(time:number,visible:(p:Point)=>boolean){const counts=new Map<string,number>();this.active=this.active.filter(p=>time-p.start<p.life);for(const p of this.active){const t=Math.max(0,(time-p.start)/p.life),x=p.from.x+(p.to.x-p.from.x)*t,z=p.from.z+(p.to.z-p.from.z)*t;if(!visible({x,z}))continue;const n=counts.get(p.type)??0;if(n>=256)continue;transform.position.set(x,p.from.y+(p.to.y-p.from.y)*t,z);transform.rotation.set(0,Math.atan2(p.to.x-p.from.x,p.to.z-p.from.z),0);transform.updateMatrix();for(const m of this.batches.get(p.type)!)m.setMatrixAt(n,transform.matrix);counts.set(p.type,n+1);}for(const [key,list] of this.batches)for(const m of list)commitInstances(m,counts.get(key)??0);}
}
