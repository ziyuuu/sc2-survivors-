import * as THREE from 'three';
import {disposeFortMaterials} from './fort-materials';
import {disposeFortRibbons} from './fort-ribbons';

/** SkeletonUtils clones own skeletons; model geometry, base materials and atlases remain shared. */
export function releaseBuildingView(root:THREE.Object3D,mixer?:THREE.AnimationMixer){
 mixer?.stopAllAction();if(mixer)mixer.uncacheRoot(mixer.getRoot());
 disposeFortRibbons(root);disposeFortMaterials(root);
 const skeletons=new Set<THREE.Skeleton>();root.traverse(node=>{if(node instanceof THREE.SkinnedMesh)skeletons.add(node.skeleton);});
 for(const skeleton of skeletons)skeleton.dispose();root.removeFromParent();
}
