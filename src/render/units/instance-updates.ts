import type {BufferAttribute,InstancedMesh} from 'three';
/** Upload only live instances. Counts are elements, ranges are scalar components. */
export let requestedUploadBytes=0;
export function resetUploadStats(){requestedUploadBytes=0;}
export function uploadActive(attribute:BufferAttribute,count:number){
 attribute.clearUpdateRanges();
 const components=Math.min(attribute.array.length,Math.max(0,count)*attribute.itemSize);
 if(!components)return;
 attribute.addUpdateRange(0,components);attribute.needsUpdate=true;
 requestedUploadBytes+=components*attribute.array.BYTES_PER_ELEMENT;
}
export function commitInstances(mesh:InstancedMesh,count:number){
 mesh.count=count;mesh.visible=count>0;uploadActive(mesh.instanceMatrix,count);
 if(mesh.instanceColor)uploadActive(mesh.instanceColor,count);
}
