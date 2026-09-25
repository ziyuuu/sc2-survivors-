import * as THREE from 'three';
import {assetUrl} from '../../assets/manifest';
import {FlatTerrain} from '../../simulation/movement/flat-terrain';
import type {MapView} from './original-map';

/** Original SC Char ground pixels on a new, genuinely level endless field. */
export async function createFlatMap(scene:THREE.Scene,terrain:FlatTerrain):Promise<MapView>{
 const source=assetUrl('terrain.char');if(!source)throw Error('缺少已核实的星际地表贴图');
 const texture=await new THREE.TextureLoader().loadAsync(source);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(24,24);texture.anisotropy=4;
 const material=new THREE.MeshStandardMaterial({map:texture,color:0xb1b5b8,roughness:.96});
 const root=new THREE.Group();root.name=FlatTerrain.id;root.visible=false;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(FlatTerrain.half*2,FlatTerrain.half*2),material);ground.rotation.x=-Math.PI/2;ground.position.y=-.018;ground.name='endless-traversable-ground';root.add(ground);scene.add(root);
 return {update:()=>{},setVisible:visible=>{root.visible=visible;},report:()=>({name:FlatTerrain.id,models:0,placements:0,visibleInstances:0,visibleMeshes:root.visible?1:0,area:FlatTerrain.openHalf*2,scale:1,sourceSha256:FlatTerrain.id})};
}
