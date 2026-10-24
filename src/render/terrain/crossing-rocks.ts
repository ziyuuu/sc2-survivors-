import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {SpecialTerrain} from '../../simulation/special-stages/terrain';
import {restoreSc2Materials} from '../loaders/sc2-materials';
import type {LandscapeResources} from './campaign-ground';

/** Original Char rocks follow the exact collision rectangles; the map owns their lifetime. */
export async function addCrossingRocks(root:THREE.Group,terrain:SpecialTerrain,resources:LandscapeResources){
 if(terrain.kind!=='crossing')return;
 const id='model.terrain.rock';await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('缺少穿越关岩壁资源');
 const gltf=await restoreSc2Materials(await new GLTFLoader().loadAsync(url));
 const mixer=new THREE.AnimationMixer(gltf.scene),stand=gltf.animations.find(c=>/^stand$/i.test(c.name));if(stand){mixer.clipAction(stand).play();mixer.setTime(0);}gltf.scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const normal=new THREE.Matrix4().makeScale(1/Math.max(.01,size.x),1/Math.max(.01,size.y),1/Math.max(.01,size.z)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const placements=terrain.walls.flatMap((wall,index)=>{
  const nx=Math.max(1,Math.ceil(wall.w/3)),nz=Math.max(1,Math.ceil(wall.h/3)),out=[];
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)out.push({x:wall.x-wall.w/2+(x+.5)*wall.w/nx,z:wall.z-wall.h/2+(z+.5)*wall.h/nz,sx:wall.w/nx*1.04,sz:wall.h/nz*1.04,height:1.65+((x+z+index)%3)*.3});
  return out;
 });
 gltf.scene.traverse(n=>{
  if(!(n instanceof THREE.Mesh))return;const geometry=n.geometry.clone();geometry.applyMatrix4(normal.clone().multiply(n.matrixWorld));resources.geometries.push(n.geometry,geometry);
  for(const m of Array.isArray(n.material)?n.material:[n.material]){resources.materials.push(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)resources.textures.push(value);}
  const mesh=new THREE.InstancedMesh(geometry,n.material,placements.length),o=new THREE.Object3D();mesh.name='crossing-native-rock-wall';mesh.castShadow=true;mesh.receiveShadow=true;
  placements.forEach((p,i)=>{o.position.set(p.x,0,p.z);o.scale.set(p.sx,p.height,p.sz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);
 });
 mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
}
