import * as THREE from 'three';

type Shader=Parameters<THREE.Material['onBeforeCompile']>[0];
export interface SourceDepthBinding {key:()=>string;compile:(shader:Shader,renderer:THREE.WebGLRenderer)=>void}
const bindings=new WeakMap<THREE.Material,SourceDepthBinding>();
export const bindSourceDepth=(material:THREE.Material,binding:SourceDepthBinding)=>bindings.set(material,binding);
export function copySourceDepth(source:THREE.Material,target:THREE.Material){const binding=bindings.get(source);if(binding)bindings.set(target,binding);}
export const clearSourceDepth=(material:THREE.Material)=>bindings.delete(material);
export function physicalSurface(material:THREE.Material){
 const role=material.userData.visualRole??material.userData.sc2?.role;
 const body=material instanceof THREE.MeshStandardMaterial||material instanceof THREE.MeshBasicMaterial&&role==='body';
 return body&&role!=='effect'&&material.visible&&(!material.transparent||material.alphaTest>0&&material.blending===THREE.NormalBlending);
}
const materialList=(mesh:THREE.Mesh)=>Array.isArray(mesh.material)?mesh.material:[mesh.material];
function syncDepth(depth:THREE.MeshDepthMaterial,source:THREE.Material){
 const material=source as THREE.MeshStandardMaterial;
 depth.map=material.map??null;depth.alphaMap=material.alphaMap??null;depth.alphaTest=material.alphaTest;depth.opacity=material.opacity;
 depth.side=material.shadowSide??material.side;depth.displacementMap=material.displacementMap??null;depth.displacementScale=material.displacementScale??1;depth.displacementBias=material.displacementBias??0;
 depth.clippingPlanes=material.clippingPlanes;depth.clipIntersection=material.clipIntersection;depth.clipShadows=material.clipShadows;
}
function compileDepth(source:THREE.Material,shader:Shader,renderer:THREE.WebGLRenderer){
 if(!physicalSurface(source)){shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() { discard;');return;}
 bindings.get(source)?.compile(shader,renderer);
 shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(diffuseColor.a<=.001)discard;');
}
const key=(source:THREE.Material)=>'sc2-posed-depth-v1:'+(physicalSurface(source)?bindings.get(source)?.key()??'standard':'excluded');
export function sourceDepthMaterial(source:THREE.Material){
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.BasicDepthPacking});depth.name='depth:'+source.name;syncDepth(depth,source);depth.colorWrite=false;depth.visible=physicalSurface(source);
 depth.onBeforeCompile=(shader,renderer)=>compileDepth(source,shader,renderer);depth.customProgramCacheKey=()=>key(source);
 source.addEventListener('dispose',()=>depth.dispose());return depth;
}
type Entry={source:THREE.Material[];depth:THREE.MeshDepthMaterial[];shadow:THREE.MeshDepthMaterial};
/** Per-surface bindings also handle GLTF meshes with mixed physical and energy material groups. */
export class PosedDepthRegistry {
 private entries=new WeakMap<THREE.Mesh,Entry>();
 private contacts=new WeakMap<THREE.Material,THREE.MeshDepthMaterial>();private shadows=new WeakMap<THREE.Material,THREE.MeshDepthMaterial>();
 private cached(source:THREE.Material,cache:WeakMap<THREE.Material,THREE.MeshDepthMaterial>){let depth=cache.get(source);if(!depth){depth=sourceDepthMaterial(source);cache.set(source,depth);source.addEventListener('dispose',()=>cache.delete(source));}syncDepth(depth,source);depth.visible=physicalSurface(source);return depth;}
 prepare(mesh:THREE.Mesh){
  const source=materialList(mesh),old=this.entries.get(mesh);
  if(old&&old.source.length===source.length&&source.every((m,i)=>m===old.source[i])){for(let i=0;i<source.length;i++){syncDepth(old.depth[i],source[i]);old.depth[i].visible=physicalSurface(source[i]);}if(source.length===1)syncDepth(old.shadow,source[0]);return old;}
  const depth=source.map(material=>this.cached(material,this.contacts));
  if(source.length===1){const shadow=this.cached(source[0],this.shadows),entry={source,depth,shadow};mesh.customDepthMaterial=shadow;this.entries.set(mesh,entry);return entry;}
  let active=source[0];const shadow=new THREE.MeshDepthMaterial({depthPacking:THREE.BasicDepthPacking});shadow.colorWrite=false;shadow.name='per-surface-pose-shadow';
  shadow.onBeforeCompile=(shader,renderer)=>compileDepth(active,shader,renderer);shadow.customProgramCacheKey=()=>key(active);
  const previous=mesh.onBeforeShadow;
  mesh.onBeforeShadow=(renderer,object,camera,shadowCamera,geometry,material,group)=>{
   previous.call(mesh,renderer,object,camera,shadowCamera,geometry,material,group);
   const next=source[(group as unknown as {materialIndex?:number}|null)?.materialIndex??0]??source[0];if(next!==active){active=next;shadow.needsUpdate=true;}syncDepth(shadow,active);
   // Keep Three's shadow-face convention; the contact prepass uses the colour-facing side.
   shadow.side=active.shadowSide??(active.side===THREE.FrontSide?THREE.BackSide:active.side===THREE.BackSide?THREE.FrontSide:THREE.DoubleSide);
  };
  mesh.customDepthMaterial=shadow;mesh.geometry.addEventListener('dispose',()=>shadow.dispose());for(const material of source)material.addEventListener('dispose',()=>shadow.dispose());
  const entry={source,depth,shadow};this.entries.set(mesh,entry);return entry;
 }
 configure(root:THREE.Object3D){root.traverse(node=>{if(!(node instanceof THREE.Mesh))return;const source=materialList(node),physical=source.some(physicalSurface)&&node.userData.visualRole!=='effect';node.castShadow=node.receiveShadow=physical;if(physical){if(node instanceof THREE.SkinnedMesh)node.frustumCulled=false;this.prepare(node);}});}
 depthFor(mesh:THREE.Mesh){const entry=this.prepare(mesh);return Array.isArray(mesh.material)?entry.depth:entry.depth[0];}
}
