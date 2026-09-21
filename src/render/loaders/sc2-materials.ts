import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
type Layer={role:string;index?:number;uv?:number;multiplier:number;add:number;constant?:number;invert?:boolean};
/** Restore auxiliary blend/opacity channels GLTF PBR cannot express. No opaque fallback for distortions. */
export async function restoreSc2Materials(g:GLTF){
 const seen=new Set<THREE.Material>(),jobs:Promise<void>[]=[];
 g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const raw of Array.isArray(n.material)?n.material:[n.material]){if(seen.has(raw))continue;seen.add(raw);const m=raw as THREE.MeshStandardMaterial,s=m.userData.sc2;if(!s)continue;
  if(s.blend){m.transparent=true;m.depthWrite=false;if(s.blend===2||s.blend===3)m.blending=THREE.AdditiveBlending;}
  jobs.push((async()=>{const layers:Layer[]=s.layers??[],textures=await Promise.all(layers.map(l=>l.index===undefined?null:g.parser.getDependency('texture',l.index) as Promise<THREE.Texture>));
   m.onBeforeCompile=shader=>{let vertex='',varying='',uvs='',uniforms='',alpha='',emissive='';const used=new Set<number>();
    layers.forEach((l,i)=>{const tex=textures[i];if(tex){const uv=l.uv??0;if(!used.has(uv)){used.add(uv);if(uv>0)vertex+='\n#ifndef USE_UV'+uv+'\nattribute vec2 uv'+uv+';\n#endif\n';}varying+='varying vec2 sc2Uv'+i+';\n';uvs+='sc2Uv'+i+' = '+(uv?'uv'+uv:'uv')+';\n';uniforms+='uniform sampler2D sc2Layer'+i+';\n';shader.uniforms['sc2Layer'+i]={value:tex};}
     const sample=tex?'texture2D(sc2Layer'+i+',sc2Uv'+i+')':null,multiply=Number(l.multiplier??1).toFixed(6),add=Number(l.add??0).toFixed(6);
     if(l.role.startsWith('alpha')){let value=sample?sample+'.r':Number(l.constant??1).toFixed(6);if(l.invert)value='(1.0-'+value+')';alpha+='diffuseColor.a *= clamp('+value+'*'+multiply+'+'+add+',0.0,1.0);\n';}
     if(l.role==='emissive2'&&sample)emissive+='totalEmissiveRadiance += '+sample+'.rgb*'+multiply+';\n';
    });
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+vertex+varying).replace('#include <uv_vertex>','#include <uv_vertex>\n'+uvs);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+varying+uniforms).replace('#include <alphamap_fragment>','#include <alphamap_fragment>\n'+alpha).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+emissive);
   };m.customProgramCacheKey=()=> 'sc2-material-v3:'+JSON.stringify(layers.map(l=>[l.role,l.uv,l.index===undefined,l.multiplier,l.add,l.invert]));
  })());
 }});await Promise.all(jobs);return g;
}

/** Bounds for the physical body only. Particle/displacement helpers never set world scale. */
export function sc2BodyBounds(root:THREE.Object3D){
 root.updateMatrixWorld(true);const box=new THREE.Box3();
 root.traverse(n=>{if(n instanceof THREE.Mesh&&n.userData.sc2Role==='body')box.union(new THREE.Box3().setFromObject(n,true));});
 return box.isEmpty()?new THREE.Box3().setFromObject(root,true):box;
}
export function sc2ModelScale(root:THREE.Object3D){let scale:number|undefined;root.traverse(n=>{if(typeof n.userData.sc2ModelScale==='number')scale=n.userData.sc2ModelScale;});return scale;}
