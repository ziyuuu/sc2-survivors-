import {commitInstances} from './instance-updates';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {restoreSc2Materials} from '../loaders/sc2-materials';
import type {Pickup,Point} from '../../simulation/types';
const TYPES=['mineral','gas','large'] as const;
/** Original SC2 pickup geometry baked at Stand, instanced by material. Simulation owns payment. */
export class ResourceDrops {
 readonly batches=new Map<string,THREE.InstancedMesh[]>();readonly errors:string[]=[];visible=0;
 private object=new THREE.Object3D();
 constructor(readonly scene:THREE.Scene){}
 async load(){const loader=new GLTFLoader();for(const type of TYPES){try{const url=assetUrl('model.loot.'+type);if(!url)throw Error('Missing original pickup');const g=await restoreSc2Materials(await loader.loadAsync(url));const mixer=new THREE.AnimationMixer(g.scene),stand=g.animations.find(c=>/^stand/i.test(c.name));if(stand){mixer.clipAction(stand).play();mixer.setTime(0);}g.scene.updateMatrixWorld(true);
  const parts:{mesh:THREE.Mesh;geometry:THREE.BufferGeometry}[]=[],box=new THREE.Box3(),v=new THREE.Vector3();g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh)||!n.visible)return;const geo=n.geometry.clone(),pos=geo.getAttribute('position');for(let i=0;i<pos.count;i++){n.getVertexPosition(i,v).applyMatrix4(n.matrixWorld);pos.setXYZ(i,v.x,v.y,v.z);box.expandByPoint(v);}geo.deleteAttribute('skinIndex');geo.deleteAttribute('skinWeight');geo.computeVertexNormals();parts.push({mesh:n,geometry:geo});});
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=(type==='large'?1.05:.58)/Math.max(size.x,size.z,.01);const meshes=parts.map(({mesh,geometry})=>{geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(scale,scale,scale);geometry.computeBoundingSphere();const batch=new THREE.InstancedMesh(geometry,mesh.material,1000);batch.count=0;batch.frustumCulled=false;batch.matrixAutoUpdate=false;batch.matrixWorldAutoUpdate=false;batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(batch);return batch;});this.batches.set(type,meshes);
 }catch(e){this.errors.push(type+': '+String(e));}}}
 render(pickups:Pickup[],ground:(p:Point)=>number,visible:(p:Point)=>boolean){const counts=new Map<string,number>();this.visible=0;for(const p of pickups){if(!visible(p))continue;for(const type of [p.minerals>0?(p.minerals>=20?'large':'mineral'):null,p.gas>0?'gas':null]){if(!type)continue;const n=counts.get(type)??0;if(n>=1000)continue;const mixed=p.minerals>0&&p.gas>0;this.object.position.set(p.x+(mixed?(type==='gas'?.3:-.3):0),ground(p)+.025,p.z);this.object.rotation.set(0,(p.id*2.399)%6.283,0);this.object.updateMatrix();for(const b of this.batches.get(type)??[])b.setMatrixAt(n,this.object.matrix);counts.set(type,n+1);this.visible++;}}
 for(const [type,meshes] of this.batches)for(const b of meshes){commitInstances(b,counts.get(type)??0);}}
}
