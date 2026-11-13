import * as THREE from 'three';
import {disposeFortMaterials} from './fort-materials';
import {disposeFortRibbons} from './fort-ribbons';
import {unitMaterialTextures} from '../materials/unit-material-loader';

/** SkeletonUtils clones own skeletons; model geometry, base materials and atlases remain shared. */
export function releaseBuildingView(root:THREE.Object3D,mixer?:THREE.AnimationMixer,remaining?:Set<THREE.Material>){
 mixer?.stopAllAction();if(mixer)mixer.uncacheRoot(mixer.getRoot());
 disposeFortRibbons(root);disposeFortMaterials(root,remaining);
 const skeletons=new Set<THREE.Skeleton>();root.traverse(node=>{if(node instanceof THREE.SkinnedMesh)skeletons.add(node.skeleton);});
 for(const skeleton of skeletons)skeleton.dispose();root.removeFromParent();
}

/** Called after the last live or dying clone has released this template. */
export function releaseBuildingTemplate(root:THREE.Object3D){
 const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 root.traverse(node=>{if(node instanceof THREE.Mesh){geometry.add(node.geometry);for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);}});
 for(const m of materials){for(const t of unitMaterialTextures(m))textures.add(t);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);}
 releaseBuildingView(root,undefined,materials);
 for(const g of geometry)g.dispose();
 for(const m of materials)m.dispose();
 for(const t of textures)t.dispose();
}
