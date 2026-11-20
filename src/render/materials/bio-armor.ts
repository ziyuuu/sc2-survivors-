import type {Entity} from '../../simulation/types';
import type {World} from '../../simulation/world';
import {bioEligible} from '../../simulation/combat/bio-runtime';
import {Box3,Vector3,type Object3D,type SkinnedMesh,type WebGLProgramParametersWithUniforms} from 'three';

export type BioMounts={shoulder?:Vector3;head?:Vector3};
export const bioRig=(key?:string)=>!!key&&/^(?:(?:elite\.)?(marine|marauder|reaper|ghost)(?:\.\d+)?|hero\.(raynor|tychus|nova|swann|tosh|kerrigan))$/.test(key);
export function leftArmorWeight(name:string){
 const bone=name.toLowerCase().replace(/[ _]/g,'');
 if(/shoulder(left|l)$|lftshoulder$|clavicle(left|l)$/.test(bone))return 1;
 return /^(bone)?(upper)?arm(left|l)$/.test(bone)?.78:0;
}

/** Find an actual skin vertex on the temple or the outside of the pauldron.
 * Store it in joint coordinates once, then sample it with the original clip. */
export function bioSkinSocket(nodes:SkinnedMesh[],joint:Object3D,side:number,head:boolean){
 const surface:Vector3[]=[],bounds=new Box3(),vertex=new Vector3();
 for(const node of nodes){
  const indices=node.geometry.getAttribute('skinIndex'),weights=node.geometry.getAttribute('skinWeight');
  const used=node.skeleton.bones.map(bone=>head?bone.name===joint.name:leftArmorWeight(bone.name)>0);
  if(!used.some(Boolean))continue;
  for(let i=0;i<indices.count;i++){
   let influence=0;
   for(let k=0;k<4;k++)if(used[indices.getComponent(i,k)])influence+=weights.getComponent(i,k);
   if(influence<.55)continue;
   node.getVertexPosition(i,vertex).applyMatrix4(node.matrixWorld);
   surface.push(vertex.clone());bounds.expandByPoint(vertex);
  }
 }
 if(!surface.length)return new Vector3();
 const target=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3());
 target.x+=side*size.x*.53;target.y+=size.y*(head?.05:.30);target.z+=size.z*(head?.28:.10);
 let nearest=surface[0],distance=Infinity;
 for(const p of surface){const d=p.distanceToSquared(target);if(d<distance){nearest=p;distance=d;}}
 return joint.worldToLocal(nearest);
}
/** A zero requests attachment poses only. The shade is applied to live bodies. */
export function bioSurface(w:World,u:Entity){
 const ranks=w.expedition.bio?.ranks;if(!ranks||u.owner!=='terran'||u.hp<=0)return;
 if(u.heroId==='kerrigan'&&ranks['BIO-O02'])return 4;
 if(!bioEligible(w,u))return;
 if((u.bio?.moltEnd??0)>w.time)return 3;
 if(u.bio?.seated||u.heroId&&ranks['BIO-O01'])return 4;
 if(ranks['BIO-P01'])return 2;
 if(ranks['BIO-B02'])return 1;
 if(u.bio?.low||ranks['BIO-B07']||(u.bio?.clotEnd??0)>w.time||u.bio?.rushEnd!==undefined||(u.bio?.shareEnd??0)>w.time||ranks['BIO-P03'])return 0;
}

// Shading follows the original skin weights and bind-space coordinates, including firing poses.
export function compileBioArmor(shader:Pick<WebGLProgramParametersWithUniforms,'vertexShader'|'fragmentShader'>){
 shader.vertexShader=shader.vertexShader.replace('attribute vec2 unitTurret;','attribute vec3 unitTurret;')
  .replace('attribute vec4 unitAimTier;', 'attribute vec4 unitAimTier; varying vec4 bioPatch;')
  .replace('specialTier=unitAimTier.z;', 'specialTier=unitAimTier.z;bioPatch=vec4(position.x+.38*position.y,position.z,unitTurret.z,unitAimTier.w);');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 bioPatch;')
  .replace('#include <color_fragment>',`#include <color_fragment>
    if(bioPatch.w>.5 && bioPatch.z>.32){
     float seam=bioPatch.x*25.+bioPatch.y*45.+1.5*sin(bioPatch.x*18.);
     float ridge=.5+.5*cos(seam);
     float lip=smoothstep(.68,.97,ridge);
     float pores=sin(bioPatch.x*132.)*sin(bioPatch.y*115.);
     float mask=smoothstep(.32,.84,bioPatch.z+.11*sin(seam*.43));
     float grain=dot(diffuseColor.rgb,vec3(.27,.53,.20));
     vec3 shell=mix(vec3(.085,.023,.050),vec3(.34,.135,.105),ridge);
     vec3 edge=bioPatch.w>2.5&&bioPatch.w<3.5?vec3(.51,.50,.28):vec3(.53,.30,.18);
     shell=mix(shell,edge,lip*.74)*(.68+min(grain,1.)*.72+pores*.07);
     diffuseColor.rgb=mix(diffuseColor.rgb,shell,mask*.94);
    }`);
}
