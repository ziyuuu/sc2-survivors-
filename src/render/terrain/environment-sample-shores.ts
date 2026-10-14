import * as THREE from 'three';
import type {RadialTerrain} from '../../data/campaign-map';
import type {LandscapeResources} from './campaign-ground';
import {loadEnvironmentTexture} from './environment-texture';
import {sampleTexture} from './environment-sample-materials';
import {bindSceneTextures} from '../materials/scene-textures';
import {boundaryPoint,type EnvironmentSamplePlan,type SampleBoundary} from './environment-sample-plan';
import type {EnvironmentFrame} from './environment-atmosphere';

function ringGeometry(b:SampleBoundary,rings:{r:number;height:(x:number,z:number,a:number)=>number}[],worldUv=false){
 const p:number[]=[],uv:number[]=[],idx:number[]=[],segments=96;
 for(const ring of rings)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,q=boundaryPoint(b,a,ring.r);p.push(q.x,ring.height(q.x,q.z,a),q.z);uv.push(worldUv?(q.x+80)/160:i/segments*12,worldUv?(80-q.z)/160:ring.r*2)}
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){const a=r*(segments+1)+i,c=a+segments+1;idx.push(a,c,a+1,a+1,c,c+1)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function surfaceGeometry(b:SampleBoundary,r:number,y:number){
 const p=[b.x,y,b.z],uv=[b.x*.125,-b.z*.125],idx:number[]=[],segments=128;
 for(let i=0;i<=segments;i++){const q=boundaryPoint(b,i/segments*Math.PI*2,r);p.push(q.x,y,q.z);uv.push(q.x*.125,-q.z*.125)}
 for(let i=1;i<=segments;i++)idx.push(0,i+1,i);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
async function sourceSurface(color:string,normal:string,resources:LandscapeResources,values:THREE.MeshStandardMaterialParameters={}){
 const map=await loadEnvironmentTexture(color,resources),normalMap=await loadEnvironmentTexture(normal,resources,true),material=new THREE.MeshStandardMaterial({map,normalMap,roughness:.92,normalScale:new THREE.Vector2(.7,.7),...values});resources.materials.push(material);bindSceneTextures(material,[map,normalMap]);return material;
}
export async function createEnvironmentSampleShore(root:THREE.Group,terrain:RadialTerrain,plan:EnvironmentSamplePlan,resources:LandscapeResources,ground:THREE.Material){
 const {theme}=terrain.recipe,b=plan.boundary,group=new THREE.Group();group.name='environment-sample-shore:'+theme;root.add(group);let triangles=0;
 const add=(name:string,g:THREE.BufferGeometry,m:THREE.Material)=>{resources.geometries.push(g);triangles+=(g.index?.count??g.attributes.position.count)/3;const mesh=new THREE.Mesh(g,m);mesh.name=name;group.add(mesh);return mesh};
 const original=(x:number,z:number)=>terrain.height({x,z}),clock={value:0};let liquid=false;
 if(theme==='industrial'){const cap=await sourceSurface('panels','panels-normal',resources,{roughness:.88,color:0x6f7e82}),g=new THREE.BoxGeometry(2.8,.12,2.8);g.translate(b.x,original(b.x,b.z)+3.32,b.z);add('reclaimed-wall-platform-cap',g,cap);}
 if(b.lowered){
  const ice=theme==='ice',pit=theme==='frontier',rimMaterial=ground;
  add(ice?'snow-bank-cap':pit?'mine-rim':'cooled-lava-bank',ringGeometry(b,[{r:1.2,height:(x,z)=>plan.groundHeight(x,z)-.012},{r:1.075,height:(x,z,a)=>original(x,z)+(ice?.10:0)+Math.sin(a*7)*.035},{r:.95,height:(x,z,a)=>original(x,z)+(ice?.055:pit?-.18:-.46)+Math.sin(a*9)*.065}],true),rimMaterial);
  const wall=ice?await sourceSurface('ice','ice-normal',resources,{color:0x95cddd,roughness:.46,normalScale:new THREE.Vector2(.85,.85)}):await sourceSurface(pit?'rock':'char-rock',pit?'rock-normal':'char-rock-normal',resources,{color:pit?0x968471:0x686568});
  add(ice?'solid-ice-bank-thickness':pit?'mine-cut-rock-face':'basalt-bank-face',ringGeometry(b,[{r:.95,height:(x,z,a)=>original(x,z)+(ice?.055:pit?-.18:-.46)+Math.sin(a*9)*.065},{r:.93,height:(x,z,a)=>pit?-1.95:-.85+Math.sin(a*5)*.065},{r:.875,height:()=>pit?-3.34:-1.95}]),wall);
  if(ice){const water=await sourceSurface('ice','ice-normal',resources,{color:0x80b8cb,roughness:.28,metalness:.06,normalScale:new THREE.Vector2(.32,.32)});add('low-frozen-water-surface',surfaceGeometry(b,.936,-1.36),water);liquid=true;
   // Broken ice plates are real closed slabs, visibly separated from the lower frozen surface.
   for(let i=0;i<5;i++){const a=.8+i*.41,q=boundaryPoint(b,a,.77),r=.32+(i%3)*.12,g=new THREE.CylinderGeometry(r,r*.84,.12,5,1);g.translate(q.x,-1.24,q.z);add('frozen-surface-plate',g,wall)}
  }else if(theme==='char'){
   const base=await sampleTexture('lavabase.dds',resources),rock=await sampleTexture('lavatoprock.dds',resources),emission=await sampleTexture('lavatoprockemissive.dds',resources),normal=await sampleTexture('lavatoprocknormal.dds',resources);
   const material=new THREE.MeshStandardMaterial({map:rock,normalMap:normal,roughness:.82,color:0xffffff,emissive:0xffffff,emissiveMap:emission,normalScale:new THREE.Vector2(.6,.6)});resources.materials.push(material);bindSceneTextures(material,[base,rock,emission,normal]);
   material.onBeforeCompile=s=>{Object.assign(s.uniforms,{sampleLavaBase:{value:base},sampleLavaTop:{value:rock},sampleLavaEmission:{value:emission},sampleLavaClock:clock});s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D sampleLavaBase;uniform sampler2D sampleLavaTop;uniform sampler2D sampleLavaEmission;uniform float sampleLavaClock;');s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec2 lavaUv=vMapUv+vec2(0.0,-sampleLavaClock*.03);vec4 lavaTop=texture2D(sampleLavaTop,lavaUv);float lavaCover=clamp(lavaTop.a*6.0,0.0,1.0);diffuseColor.rgb*=lavaTop.rgb*.4*lavaCover;`);s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`totalEmissiveRadiance=texture2D(sampleLavaBase,lavaUv*.85).rgb*(1.0-lavaCover)*1.15+texture2D(sampleLavaEmission,lavaUv).rgb*lavaCover;`);s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replaceAll('vNormalMapUv','lavaUv'));};material.customProgramCacheKey=()=> 'source-lava-layers-native-clock-v1';
   add('low-lava-source-composite',surfaceGeometry(b,.936,-1.34),material);liquid=true;
   const shoreTexture=await sampleTexture('lavarandom_r1.dds',resources),shoreMaterial=new THREE.MeshBasicMaterial({map:shoreTexture,color:0xffad62,transparent:true,depthWrite:false,opacity:.24,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});resources.materials.push(shoreMaterial);bindSceneTextures(shoreMaterial,[shoreTexture]);
   add('original-lava-shore-emission',ringGeometry(b,[{r:.915,height:()=>-1.315},{r:.94,height:()=>-1.285}]),shoreMaterial);
  }
 }
 const patches=plan.sites.filter(s=>s.kind==='surface');if(patches.length){const patchMaterial=await sourceSurface(theme==='industrial'?'panels':theme==='ice'?'ice-rock':theme==='mar-sara'?'cracked':theme==='char'?'char-cracked':'plates',theme==='industrial'?'panels-normal':theme==='ice'?'ice-rock-normal':theme==='mar-sara'?'cracked-normal':theme==='char'?'char-cracked-normal':'plates-normal',resources,{transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,opacity:theme==='ice'?.68:.82});
 patchMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>\nvec2 patchP=vMapUv-.5;float patchEdge=max(abs(patchP.x),abs(patchP.y));float patchNoise=sin(vMapUv.x*31.0+sin(vMapUv.y*47.0))*sin(vMapUv.y*23.0)*.018;diffuseColor.a*=1.0-smoothstep(.26+patchNoise,.5,patchEdge);`)};patchMaterial.customProgramCacheKey=()=> 'sample-feathered-ground-transition-v1';
 for(const patch of patches){const patchGeometry=new THREE.PlaneGeometry(10,7,24,18);patchGeometry.rotateX(-Math.PI/2);const pp=patchGeometry.attributes.position;for(let i=0;i<pp.count;i++){const a=patch.angle??0,c=Math.cos(a),s=Math.sin(a),x=pp.getX(i)*c+pp.getZ(i)*s+patch.x,z=-pp.getX(i)*s+pp.getZ(i)*c+patch.z;pp.setXYZ(i,x,terrain.height({x,z})+.007,z)}patchGeometry.computeVertexNormals();patchGeometry.computeBoundingSphere();add('sample-material-transition',patchGeometry,patchMaterial);}}
 return {update:(frame:EnvironmentFrame)=>{clock.value=frame.reducedMotion?0:frame.time},report:()=>({theme,boundary:b,meshes:group.children.length,triangles,liquidSurface:liquid,frozen:theme==='ice',nativeTime:clock.value,groundHeightChangesOutsideFinalWalk:true,collisionChanges:false,waterPhysics:false})};
}
