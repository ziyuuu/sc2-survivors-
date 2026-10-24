import * as THREE from 'three';

/** Match the float skinIndex shader input before detached GPU preparation.
 * ANGLE's D3D backend can otherwise compile an integer-input vertex variant
 * during the first draw. Every Uint8/Uint16 value is exact in Float32. */
export function prepareFloatSkinIndices(root:THREE.Object3D){
 root.traverse(node=>{
  if(!(node instanceof THREE.SkinnedMesh))return;
  const attribute=node.geometry.getAttribute('skinIndex');
  if(!attribute||attribute.normalized||!(attribute.array instanceof Uint16Array||attribute.array instanceof Uint8Array))return;
  const values=new Float32Array(attribute.count*attribute.itemSize);
  for(let i=0;i<attribute.count;i++)for(let j=0;j<attribute.itemSize;j++)values[i*attribute.itemSize+j]=attribute.getComponent(i,j);
  const converted=new THREE.BufferAttribute(values,attribute.itemSize);
  converted.name=attribute.name;
  converted.setUsage(attribute instanceof THREE.InterleavedBufferAttribute?attribute.data.usage:attribute.usage);
  node.geometry.setAttribute('skinIndex',converted);
 });
}
