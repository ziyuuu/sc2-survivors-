import {ManagedTextureLoader} from '../loaders/managed-textures';
import * as THREE from 'three';
import {assetUrl} from '../../assets/manifest';
import {FlatTerrain} from '../../simulation/movement/flat-terrain';
import {SpecialTerrain} from '../../simulation/special-stages/terrain';
import {addCrossingRocks} from './crossing-rocks';
import type {MapView} from './original-map';
import {createVisualGround,type LandscapeResources} from './campaign-ground';
import {createEnvironmentAtmosphere} from './environment-atmosphere';
import {MAP_VISUAL_PROFILES} from './map-visual-profile';

/** Original SC Char ground pixels on a new, genuinely level endless field. */
export async function createFlatMap(scene:THREE.Scene,terrain:FlatTerrain,yieldPreparation?:()=>Promise<void>):Promise<MapView>{
 if(MAP_VISUAL_PROFILES.char.features.ground){
  const resources:LandscapeResources={textures:[],geometries:[],materials:[]},root=new THREE.Group();root.name=FlatTerrain.id;root.visible=false;scene.add(root);
  const dispose=()=>{root.removeFromParent();for(const g of new Set(resources.geometries))g.dispose();for(const m of new Set(resources.materials))m.dispose();for(const t of new Set(resources.textures))t.dispose();};
  try{const ground=await createVisualGround(terrain,'char',0x6c8e9cf5,resources,{yieldPreparation}),atmosphere=await createEnvironmentAtmosphere(root,()=>terrain,'char',0x6c8e9cf5,resources);root.add(ground.ground);if(terrain instanceof SpecialTerrain)await addCrossingRocks(root,terrain,resources);atmosphere.setEnabled(MAP_VISUAL_PROFILES.char.features.atmosphere);
   return {update:()=>{},updateEnvironment:atmosphere.update,setVisible:v=>{root.visible=v;atmosphere.setVisible(v);},dispose,report:()=>({name:FlatTerrain.id,models:0,placements:0,visibleInstances:0,visibleMeshes:root.visible?1:0,area:FlatTerrain.openHalf*2,scale:1,sourceSha256:FlatTerrain.id,environment:{ground:ground.report(),atmosphere:atmosphere.report(),flat:true}})};
  }catch(error){dispose();throw error;}
 }
 const source=assetUrl('terrain.char');if(!source)throw Error('缺少已核实的星际地表贴图');
 const texture=await new ManagedTextureLoader().loadAsync(source);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(24,24);texture.anisotropy=4;
 const material=new THREE.MeshStandardMaterial({map:texture,color:0xb1b5b8,roughness:.96});
 const root=new THREE.Group();root.name=FlatTerrain.id;root.visible=false;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(FlatTerrain.half*2,FlatTerrain.half*2),material);ground.rotation.x=-Math.PI/2;ground.position.y=-.018;ground.name='endless-traversable-ground';root.add(ground);scene.add(root);
 return {update:()=>{},setVisible:visible=>{root.visible=visible;},dispose:()=>{root.removeFromParent();ground.geometry.dispose();material.dispose();texture.dispose();},report:()=>({name:FlatTerrain.id,models:0,placements:0,visibleInstances:0,visibleMeshes:root.visible?1:0,area:FlatTerrain.openHalf*2,scale:1,sourceSha256:FlatTerrain.id})};
}
