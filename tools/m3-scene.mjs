import * as THREE from 'three';
import {materialEntries} from './m3-materials.mjs';
/** Versioned adapter: upstream loader handles skinning; this restores material identity and extra UVs. */
export function adaptM3Scene(group,sections,parser){
 const materials=materialEntries(sections),refs=sections.getSectionByReference(sections.model.material_references)?.content??[];
 const divisions=sections.getSectionByReference(sections.model.divisions)?.content??[],meshes=[];group.traverse(n=>{if(n.isMesh)meshes.push(n);});
 const vertexSection=sections.getSectionByReference(sections.model.vertices),desc=parser.M3StructureDescription.getVertexDescription(sections.model.vertex_flags);
 const vertices=vertexSection?desc.instances(vertexSection.rawBytes,Math.floor(vertexSection.rawBytes.byteLength/desc.size)):[];
 const specs=new Map(),report=[];let cursor=0;
 for(const division of divisions){const batches=sections.getSectionByReference(division.batches)?.content??[],regions=sections.getSectionByReference(division.regions)?.content??[];
  regions.forEach((region,i)=>{const mesh=meshes[cursor++];if(!mesh)return;const batch=batches.find(b=>b.region_index===i),ref=refs[batch?.material_reference_index],spec=ref?.type===1?materials[ref.material_index]:null;
   if(!spec){report.push({mesh:mesh.name,type:ref?.type??null,role:'auxiliary',status:'excluded',reason:ref?.type===2?'Displacement surface: never render as opaque geometry':'Unsupported material type'});mesh.removeFromParent();return;}
   const role=spec.blend===0?'body':'effect',key=spec.name+'#'+spec.index;
   mesh.userData={sc2Role:role,sc2MaterialIndex:spec.index};mesh.material.name=key;mesh.material.userData={};mesh.material.color.set(0xffffff);mesh.material.roughness=.8;mesh.material.vertexColors=!!(spec.flags&1);mesh.material.side=spec.flags&8?THREE.DoubleSide:THREE.FrontSide;
   if(spec.blend){mesh.material.transparent=true;mesh.material.depthWrite=false;mesh.material.blending=spec.blend===2||spec.blend===3?THREE.AdditiveBlending:THREE.NormalBlending;}
   const local=vertices.slice(region.first_vertex_index,region.first_vertex_index+region.vertex_count);
   for(let uv=1;uv<4;uv++){const data=[];for(const v of local){const packed=v['uv'+uv],float=v['fuv'+uv];if(!packed&&!float)break;data.push(float?float.x:packed.x*(region.uv_multiply??16)/32768+(region.uv_offset??0),float?float.y:packed.y*(region.uv_multiply??16)/32768+(region.uv_offset??0));}if(data.length===local.length*2)mesh.geometry.setAttribute('uv'+uv,new THREE.Float32BufferAttribute(data,2));}
   specs.set(key,{...spec,role,availableUvs:[0,...[1,2,3].filter(v=>mesh.geometry.hasAttribute('uv'+v))]});report.push({mesh:mesh.name,type:1,material:spec.name,index:spec.index,role,status:'converted',blend:spec.blend});
  });
 }
 return {specs,report};
}
/** Only original body surfaces determine the feet, size and normalization. */
export function bodyBounds(group){const box=new THREE.Box3();group.updateMatrixWorld(true);group.traverse(n=>{if(n.isMesh&&n.userData.sc2Role==='body')box.union(new THREE.Box3().setFromObject(n,true));});return box;}
