import * as THREE from 'three';
import type {CampaignTheme} from '../../data/campaign-landscape';
import type {TerrainQuery} from '../../data/map-definition';
import type {RenderQuality} from '../settings/quality';
import {MAP_VISUAL_PROFILES} from './map-visual-profile';
import {loadEnvironmentTexture} from './environment-texture';
import {bindSceneTextures} from '../materials/scene-textures';
import type {LandscapeResources} from './campaign-ground';

export interface EnvironmentFrame {readonly effectsEnabled?:boolean;readonly time:number;readonly paused:boolean;readonly quality:RenderQuality;readonly reducedMotion:boolean;readonly camera:THREE.Camera;readonly seed:number}
export const MAX_ENVIRONMENT_PARTICLES=60;
const fract=(x:number)=>x-Math.floor(x);
function hash(seed:number,index:number){let n=Math.imul(seed^index,0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
/** Stateless samples rebuild exactly on restore and never touch a gameplay random stream. */
export function environmentParticle(seed:number,index:number,time:number){
 const life=10+hash(seed,index*7+1)*12,phase=fract(Math.max(0,time)/life+hash(seed,index*7+2));
 return {phase,life,x:hash(seed,index*7+3)-.5,z:hash(seed,index*7+4)-.5,size:.7+hash(seed,index*7+5)*.6,alpha:Math.sin(phase*Math.PI)**2};
}
export async function createEnvironmentAtmosphere(root:THREE.Group,terrain:()=>TerrainQuery,theme:CampaignTheme,seed:number,resources:LandscapeResources,softEdges=false){
 const p=MAP_VISUAL_PROFILES[theme].atmosphere,count=Math.min(MAX_ENVIRONMENT_PARTICLES,p.count),texture=await loadEnvironmentTexture(p.source,resources);
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 const geometry=new THREE.PlaneGeometry(1,1),alpha=new THREE.InstancedBufferAttribute(new Float32Array(count),1);geometry.setAttribute('environmentAlpha',alpha);resources.geometries.push(geometry);
 const material=new THREE.MeshBasicMaterial({map:texture,color:p.color,transparent:true,depthWrite:false,depthTest:true,opacity:p.opacity,side:THREE.DoubleSide});material.name='environment-atmosphere:'+theme;material.userData.visualRole='effect';resources.materials.push(material);bindSceneTextures(material,[texture]);
 material.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float environmentAlpha;varying float envParticleAlpha;').replace('#include <uv_vertex>','#include <uv_vertex>\nenvParticleAlpha=environmentAlpha;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float envParticleAlpha;').replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=envParticleAlpha;'+(softEdges?'diffuseColor.a*=1.0-smoothstep(.12,.49,length(vMapUv-.5));':''));};material.customProgramCacheKey=()=> 'environment-atmosphere-v1:'+softEdges;
 const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.userData.visualRole='effect';mesh.name='decorative-atmosphere:'+theme;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.raycast=()=>{};root.add(mesh);
 const matrix=new THREE.Object3D(),frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere();let enabled=true,visible=false,sampleTime=0,paused=false;
 const definitions=terrain().definition?.placements.filter(p=>p.type==='landmark')??[],filtered=theme==='industrial'?definitions.filter(p=>p.assetId?.includes('exhaustpipes')):definitions;
 const emitters=filtered.length?filtered.map(p=>({x:p.position[0]-80,z:80-p.position[1],r:p.blockerSize??1})):Array.from({length:25},(_,i)=>({x:(i%5-2)*26,z:(Math.floor(i/5)-2)*26,r:5}));
 const clear=()=>{mesh.count=0;mesh.visible=false;};
 const update=(frame:EnvironmentFrame)=>{
  sampleTime=frame.time;paused=frame.paused;
  if(frame.effectsEnabled===false||!visible||!enabled||frame.quality==='performance'||frame.reducedMotion){clear();return;}
  const field=terrain();projection.multiplyMatrices(frame.camera.projectionMatrix,frame.camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);let shown=0;
  for(let i=0;i<count;i++){
   const particle=environmentParticle(seed^Math.imul(frame.seed,0x9e3779b1),i,frame.time),emitter=emitters[i%emitters.length],spread=theme==='ice'?11:theme==='industrial'?emitter.r*.55:emitter.r*1.8;
   const x=emitter.x+particle.x*spread+Math.sin(particle.phase*6.283+i)*.35,z=emitter.z+particle.z*spread+particle.phase*(theme==='ice'?.9:.35);
   if(field.isOpen&&!field.isOpen({x,z}))continue;
   const y=field.height({x,z})+(theme==='ice'?4.4-particle.phase*4:theme==='industrial'?.45+particle.phase*2.4:theme==='char'?.18+particle.phase*2:.12+particle.phase*.48),size=p.size*particle.size*(theme==='industrial'?.5+particle.phase:1);
   sphere.center.set(x,y,z);sphere.radius=size;if(!frustum.intersectsSphere(sphere))continue;
   matrix.position.copy(sphere.center);matrix.quaternion.copy(frame.camera.quaternion);matrix.scale.set(size,size,1);matrix.updateMatrix();mesh.setMatrixAt(shown,matrix.matrix);alpha.setX(shown,particle.alpha);shown++;
  }
  mesh.count=shown;mesh.visible=shown>0;if(shown){mesh.instanceMatrix.needsUpdate=true;alpha.needsUpdate=true;}
 };
 return {update,setVisible:(value:boolean)=>{visible=value;if(!value)clear();},setEnabled:(value:boolean)=>{enabled=value;if(!value)clear();},report:()=>({enabled,visibleParticles:mesh.count,cap:MAX_ENVIRONMENT_PARTICLES,allocated:count,time:sampleTime,paused,source:texture.name,emitterCount:emitters.length,stateless:true,castsShadow:mesh.castShadow})};
}
