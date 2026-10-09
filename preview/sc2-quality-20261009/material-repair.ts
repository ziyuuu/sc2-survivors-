import * as THREE from 'three';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';
import type {AnimatedBatch} from '../../src/render/units/animated-batch';
import {SOURCE_ABILITIES} from '../../src/data/expansion-units';
import {sampleTrack,coverAlpha,sourcePhong,type SourceProfile,type SourceLayer,type Ref} from './source-materials';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../src/assets/manifest';
import {InstanceIdentity} from './instance-identity';
import {sampleTextureUrl} from './sample-data';

type Layer=SourceLayer&{uv:number;uvAngle:Ref};
type MaterialProfile=Omit<SourceProfile['materials'][number],'layers'>&{blend:number;hdrSpecular:number;specularity:number;teamTexture?:string;layers:Record<string,Layer>};
type Profile=Omit<SourceProfile,'materials'>&{materials:MaterialProfile[]};
type Input={profiles:Record<string,Profile>};
const roles=['diffuse','emissive','emissive2','alpha','alpha2','specular'],WIDTH=64,ROWS=roles.length*2+1;
type Surface={batch:AnimatedBatch;mesh:THREE.InstancedMesh;original:THREE.Material;restored:THREE.Material;source:MaterialProfile;profile:Profile;data:Float32Array;texture:THREE.DataTexture;key:string;composite:boolean};
const blue=new THREE.Color(0x235cc2),red=new THREE.Color(0x893733);

/** Display adapter: uses original textures and original material clocks, with stable World IDs. */
export class MaterialRepair {
 readonly specularAA={value:1};
 private surfaces:Surface[]=[];private prepared=new Set<string>();private enabled=true;private covers=new Map<number,{active:boolean;endedAt:number}>();private owners=new Map<number,string>();private identity:InstanceIdentity;
 constructor(readonly r:BattleRenderer,readonly input:Input){this.identity=new InstanceIdentity(r);}
 async prepare(){
  for(const [key,batch] of this.r.gpu){if(this.prepared.has(key)||!this.input.profiles[key])continue;const g=this.r.batches.get(key as never)?.gltf??await new GLTFLoader().loadAsync(assetUrl('model.'+key)!);this.identity.register(batch);
   const profile=this.input.profiles[key];
   for(const mesh of batch.meshes){if(Array.isArray(mesh.material))throw Error('Unexpected material array '+key);const original=mesh.material as THREE.MeshStandardMaterial;
    const raw=g.parser.json.materials.find((m:{name:string})=>m.name===original.name),source=profile.materials.find(m=>m.name+'#'+m.index===original.name);if(!source||!raw)continue;
    const effect=original.userData.sc2?.role==='effect';
    const restored=effect?new THREE.MeshBasicMaterial({name:'source:'+original.name,transparent:original.transparent,depthWrite:original.depthWrite,side:original.side,blending:original.blending,alphaTest:original.alphaTest,vertexColors:original.vertexColors}):sourcePhong(original,source,this.specularAA);
    restored.userData=structuredClone(original.userData);
    const data=new Float32Array(WIDTH*ROWS*4),texture=new THREE.DataTexture(data,WIDTH,ROWS,THREE.RGBAFormat,THREE.FloatType);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.needsUpdate=true;
    const surface:Surface={batch,mesh,original,restored,source,profile,data,texture,key,composite:profile.composites.some(c=>c.parts.some(p=>p.material.type===1&&p.material.index===source.index))};
    const textures:Record<string,THREE.Texture>={};
    for(const role of roles){const info=role==='diffuse'?raw.pbrMetallicRoughness?.baseColorTexture:role==='emissive'?raw.emissiveTexture:role==='specular'?raw.extensions?.KHR_materials_specular?.specularColorTexture:raw.extras.sc2.layers.find((l:{role:string})=>l.role===role);
     if(info){const t=(await g.parser.getDependency('texture',info.index) as THREE.Texture).clone();t.colorSpace=role.startsWith('alpha')?THREE.NoColorSpace:THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;textures[role]=t;}
    }
    if(source.teamTexture){const t=await new THREE.TextureLoader().loadAsync(sampleTextureUrl(source.teamTexture));t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;textures.diffuse=t;}
    const baseCompile=effect?original.onBeforeCompile:restored.onBeforeCompile,baseKey=restored.customProgramCacheKey.bind(restored);
    restored.onBeforeCompile=(shader,renderer)=>{
     baseCompile.call(original,shader,renderer);shader.uniforms.qrState={value:texture};
     const hasUV1=mesh.geometry.hasAttribute('uv1'),declaration=hasUV1&&!shader.vertexShader.includes('attribute vec2 uv1;')?'\n#ifndef USE_UV1\nattribute vec2 uv1;\n#endif\n':'';
     const vary='flat varying int qrInstance;varying vec2 qrUV0;varying vec2 qrUV1;varying vec3 qrNormal;varying vec3 qrView;';
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+declaration+vary).replace('#include <project_vertex>',`#include <project_vertex>\nqrInstance=gl_InstanceID;qrUV0=uv;qrUV1=${hasUV1?'uv1':'uv'};qrNormal=normalize(normalMatrix*mat3(instanceMatrix)*mat3(unitTransform)*normal);qrView=-mvPosition.xyz;`);
     let helpers= vary+'uniform sampler2D qrState;vec4 qrData(int row){return texelFetch(qrState,ivec2(qrInstance,row),0);}\n';
     for(const [i,role] of roles.entries()){
      if(!textures[role])continue;const layer=source.layers[role],uv=layer.uv===1?'qrUV1':'qrUV0';shader.uniforms['qrTex'+i]={value:textures[role]};
      helpers+=`uniform sampler2D qrTex${i};vec4 qrLayer${i}(){vec4 p=qrData(${i*2}),u=qrData(${i*2+1});float s=sin(p.z),c=cos(p.z);vec2 v=${uv}*u.zw;v=mat2(c,-s,s,c)*(v-.5)+.5+u.xy;vec4 t=texture2D(qrTex${i},v);${role==='diffuse'&&source.teamTexture?'t.rgb=mix(qrData(12).rgb,t.rgb,t.a);t.a=1.0;':''}${role.startsWith('alpha')&&(layer.flags&16)?'t.rgb=1.0-t.rgb;':''}return vec4(t.rgb*p.x+p.y,t.a);}\n`;
     }
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+helpers);
     shader.fragmentShader=shader.fragmentShader.replace('vec3(1.5,0.72,0.28)*unitHit','vec3(.45,.20,.055)*unitHit*pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),3.0)');
     const sample=(role:string,fallback:string)=>textures[role]?`qrLayer${roles.indexOf(role)}()`:fallback;
     let alpha='float qrAlpha=qrData(12).a;';
     for(const role of ['alpha','alpha2'])if(textures[role])alpha+=`qrAlpha*=clamp(${sample(role,'vec4(1.0)')}.r,0.0,1.0);`;
     shader.fragmentShader=shader.fragmentShader.replace(/(#include <alphamap_fragment>)[\s\S]*?(?=#include <alphatest_fragment>)/,'#include <alphamap_fragment>\n'+alpha+'diffuseColor.a*=qrAlpha;\n');
     const primary=sample('emissive','vec4(0.0)'),secondary=sample('emissive2','vec4(0.0)');
     const layer=source.layers.emissive,f=layer?.fresnel;
     const fresnel=f?.type?`clamp(${Number(f.min).toFixed(6)}+pow(max(0.0,1.0-abs(dot(normalize(qrNormal),normalize(qrView)))),${Number(f.exponent).toFixed(6)})*${Number(f.maxOffset).toFixed(6)},0.0,1.0)`:'1.0';
     const emission=`(${primary}.rgb*${fresnel}+${secondary}.rgb)*${Number(source.hdrEmission??1).toFixed(6)}`;
     if(effect){shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`diffuseColor.rgb=${sample('diffuse','vec4(0.0)')}.rgb+${emission};`);}
     else{
      if(textures.diffuse)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`diffuseColor*=${sample('diffuse','vec4(1.0)')};`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`totalEmissiveRadiance=${emission};`);
      shader.fragmentShader=shader.fragmentShader.replace(/totalEmissiveRadiance \+= texture2D\(sc2Layer\d+,sc2Uv\d+\)\.rgb\*[\d.]+;/g,'');
      if(textures.specular)shader.fragmentShader=shader.fragmentShader.replace('vrSpecular=texture2D(specularMap,vSpecularMapUv).rgb;','vrSpecular=qrLayer5().rgb;');
     }
    };
    restored.customProgramCacheKey=()=>baseKey()+':quality-original-tracks-v2:'+key+':'+source.index;
    this.surfaces.push(surface);if(this.enabled)mesh.material=restored;
   }
   this.prepared.add(key);
  }
 }
 setEnabled(enabled:boolean){this.enabled=enabled;for(const s of this.surfaces)s.mesh.material=enabled?s.restored:s.original;}
 reset(){this.covers.clear();this.owners.clear();}
 update(){if(!this.enabled)return;const world=this.r.world;
  for(const s of this.surfaces){if(s.mesh.count>WIDTH)throw Error('Sample material capacity exceeded');let changed=false;
   for(let i=0;i<s.mesh.count;i++){
    const pose=s.batch.attributes[0],frame=pose.getX(i)+pose.getZ(i),entry=[...s.batch.clips].find(([,p])=>frame>=p.offset-1e-4&&frame<=p.offset+p.frames-1+1e-4),clip=entry?.[1],time=clip?(frame-clip.offset)/Math.max(1,clip.frames-1)*clip.duration:0;
    const sourceClip=s.profile.clips.find(c=>c.name===entry?.[0]);
    const blend=s.batch.blendAttributes[0],attackFrame=blend.getX(i)+blend.getZ(i),attackEntry=blend.getW(i)>.001?[...s.batch.clips].find(([,p])=>attackFrame>=p.offset-1e-4&&attackFrame<=p.offset+p.frames-1+1e-4):undefined;
    const attackClip=attackEntry?.[1],attackTime=attackClip?(attackFrame-attackClip.offset)/Math.max(1,attackClip.frames-1)*attackClip.duration:0,sourceAttack=s.profile.clips.find(c=>c.name===attackEntry?.[0]);
    const read=(r:Ref|undefined)=>{if(!r)return null;const attack=sourceAttack?.tracks.find(t=>t.id===r.id);return sampleTrack(attack??sourceClip?.tracks.find(t=>t.id===r.id),attack?attackTime:time,r.default,r.interpolation);};
    const write=(row:number,a:number,b:number,c:number,d:number)=>{const at=(row*WIDTH+i)*4;for(const [k,v] of [a,b,c,d].entries())if(s.data[at+k]!==Math.fround(v)){s.data[at+k]=v;changed=true;}};
    for(const [j,role] of roles.entries()){const l=s.source.layers[role];if(!l)continue;const uv=read(l.uvOffset) as Record<string,number>|null,tiling=read(l.uvTiling) as Record<string,number>|null,angle=read(l.uvAngle) as Record<string,number>|number|null;
     write(j*2,Number(read(l.multiply)??1),Number(read(l.add)??0),typeof angle==='number'?angle:angle?.z??0,0);write(j*2+1,uv?.x??0,uv?.y??0,tiling?.x??1,tiling?.y??1);
    }
    const identity=this.identity.get(s.batch,i),unit=world.entities.get(identity);if(unit)this.owners.set(identity,unit.owner);const team=(unit?.owner??this.owners.get(identity))==='zerg'?red:blue;let alpha=1;
    if(s.composite&&s.key==='immortal'){
     if(!unit)throw Error('Missing stable identity for original shield material');
     const active=(unit.barrier??0)>0,edge=this.covers.get(unit.id);let endedAt=edge?.endedAt??-Infinity;if(edge?.active&&!active)endedAt=world.time;
     alpha=active?coverAlpha(s.profile,'start',Math.max(0,world.time-((unit.barrierReady??world.time)-SOURCE_ABILITIES.immortalBarrier.cooldown))):world.time-endedAt<.166?coverAlpha(s.profile,'end',world.time-endedAt):coverAlpha(s.profile,'inactive',0);
     this.covers.set(unit.id,{active,endedAt});
    }
    write(12,team.r,team.g,team.b,alpha);
   }if(changed)s.texture.needsUpdate=true;
  }
 }
 report(){return{enabled:this.enabled,specularAA:this.specularAA.value===1,surfaces:this.surfaces.length,sourceModels:[...this.prepared],stableIdentity:true,identityAssignments:this.identity.assignments,productionSourceEdits:0,originalMaterialTracks:true,sourceTextureMasks:true,capacity:WIDTH};}
}

/** GLTF's unlit extension drops emissiveTexture. Restore its original image on static displays. */
export async function repairStaticEmission(g:import('three/addons/loaders/GLTFLoader.js').GLTF){
 const seen=new Set<THREE.Material>(),jobs:Promise<void>[]=[];
 g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const raw of Array.isArray(n.material)?n.material:[n.material]){
  if(seen.has(raw))continue;seen.add(raw);const m=raw as THREE.MeshStandardMaterial,def=g.parser.json.materials.find((v:{name:string})=>v.name===m.name);
  if(!def?.emissiveTexture||def.pbrMetallicRoughness?.baseColorTexture)continue;
  if(raw instanceof THREE.MeshBasicMaterial)jobs.push((async()=>{const t=(await g.parser.getDependency('texture',def.emissiveTexture.index) as THREE.Texture).clone();t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;raw.map=t;raw.color.fromArray(def.emissiveFactor??[1,1,1]).multiplyScalar(def.extensions?.KHR_materials_emissive_strength?.emissiveStrength??1);raw.needsUpdate=true;})());
  else m.color.set(0x000000);
 }});await Promise.all(jobs);
}
