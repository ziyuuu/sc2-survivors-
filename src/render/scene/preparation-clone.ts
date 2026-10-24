import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {copySourceDepth} from '../materials/posed-depth';
import {bindSceneTextures,sceneMaterialTextures} from '../materials/scene-textures';
import {bindUnitMaterial,preparedUnitMaterial} from '../materials/unit-material-loader';

/** Detached transforms and material registrations keep the exact program alive
 * when live particle storage grows. Source geometry and textures stay shared. */
export function cloneForPreparation(source:THREE.Object3D){
 const root=clone(source),materials=new Map<THREE.Material,THREE.Material>();
 root.traverse(node=>{
  node.visible=true;
  if(!(node instanceof THREE.Mesh))return;
  const material=(original:THREE.Material)=>{let result=materials.get(original);if(!result){
   result=original.clone();
   if(original instanceof THREE.ShaderMaterial&&result instanceof THREE.ShaderMaterial)for(const [key,uniform]of Object.entries(original.uniforms)){
    if(node.userData.displacement&&(key==='sceneDepth'||key==='viewport'))result.uniforms[key]=uniform;
    else if(uniform.value instanceof THREE.Texture)result.uniforms[key].value=uniform.value;
    else if(Array.isArray(uniform.value))result.uniforms[key].value=result.uniforms[key].value.map((value:unknown,i:number)=>uniform.value[i] instanceof THREE.Texture?uniform.value[i]:value);
   }
   result.onBeforeCompile=original.onBeforeCompile;result.customProgramCacheKey=original.customProgramCacheKey;copySourceDepth(original,result);
   bindSceneTextures(result,sceneMaterialTextures(original));const prepared=preparedUnitMaterial(original);if(prepared)bindUnitMaterial(result,prepared);
   materials.set(original,result);
  }return result;};
  node.material=Array.isArray(node.material)?node.material.map(material):material(node.material);
  node.frustumCulled=false;
  if(node instanceof THREE.InstancedMesh){node.count=1;node.setMatrixAt(0,new THREE.Matrix4());node.instanceMatrix.needsUpdate=true;if(node.geometry.hasAttribute('sourceColor'))node.instanceColor=null;}
 });
 return {root,dispose(){root.removeFromParent();const skeletons=new Set<THREE.Skeleton>();root.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);if(n instanceof THREE.InstancedMesh)n.dispose();});for(const s of skeletons)s.dispose();for(const m of materials.values())m.dispose();}};
}
